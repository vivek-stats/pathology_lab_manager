import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getDatabaseStatus } from '@/lib/db';
import { Visit } from '@/models/Visit';
import { Patient } from '@/models/Patient';
import { Doctor } from '@/models/Doctor';
import { Test } from '@/models/Test';
import { CreateVisitSchema } from '@/lib/validations/visit';
import { getTodayISTDateString } from '@/lib/timezone';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const dbStatus = await getDatabaseStatus();
  if (!dbStatus.isConnected) {
    return NextResponse.json({
      dbConnected: false,
      visits: [],
      message: dbStatus.message,
    });
  }

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const date = searchParams.get('date'); // IST date string "YYYY-MM-DD"
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    const query = searchParams.get('q');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '30', 10)));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (date) {
      filter.dateStringIST = date;
    }

    if (patientId) {
      if (mongoose.Types.ObjectId.isValid(patientId)) {
        filter.patient = patientId;
      } else {
        filter['patientSnapshot.permanentId'] = patientId;
      }
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (query && query.trim()) {
      const q = query.trim();
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { visitId: regex },
        { 'patientSnapshot.name': regex },
        { 'patientSnapshot.mobile': regex },
        { 'patientSnapshot.permanentId': regex },
      ];
    }

    const total = await Visit.countDocuments(filter);
    const visits = await Visit.find(filter)
      .sort({ dailySerial: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      dbConnected: true,
      visits,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch visits' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const dbStatus = await getDatabaseStatus();
  if (!dbStatus.isConnected) {
    return NextResponse.json(
      {
        error: 'Database is disconnected. Please configure MONGODB_URI in .env.local to book visits.',
        dbConnected: false,
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const validated = CreateVisitSchema.parse(body);

    await connectToDatabase();

    // 1. Fetch Patient
    const patientQuery = mongoose.Types.ObjectId.isValid(validated.patientId)
      ? { _id: validated.patientId }
      : { patientId: validated.patientId };

    const patient = await Patient.findOne(patientQuery);
    if (!patient) {
      return NextResponse.json({ error: 'Selected patient does not exist' }, { status: 404 });
    }

    // 2. Fetch Doctor if specified, or fallback to patient's registered referring doctor
    let doctorDoc = null;
    const effectiveDoctorId =
      validated.doctorId !== undefined && validated.doctorId !== null
        ? validated.doctorId
        : patient.referredByDoctor
        ? String(patient.referredByDoctor)
        : null;

    if (effectiveDoctorId && mongoose.Types.ObjectId.isValid(effectiveDoctorId)) {
      doctorDoc = await Doctor.findById(effectiveDoctorId);
    }

    // 3. Fetch Tests and build immutable snapshot
    const testDocs = await Test.find({ _id: { $in: validated.testIds } });
    if (testDocs.length === 0) {
      return NextResponse.json({ error: 'No valid tests selected' }, { status: 400 });
    }

    // Guard against deactivated tests being selected for new visits
    const inactiveTests = testDocs.filter((t) => !t.isActive);
    if (inactiveTests.length > 0) {
      const inactiveNames = inactiveTests.map((t) => `[${t.code}] ${t.name}`).join(', ');
      return NextResponse.json(
        {
          error: `The following test(s) are deactivated and cannot be ordered for new visits: ${inactiveNames}`,
        },
        { status: 400 }
      );
    }

    const testSnapshots = [];
    const initialResults: any[] = [];
    let calculatedTotal = 0;

    for (const test of testDocs) {
      calculatedTotal += test.price;
      testSnapshots.push({
        testId: test._id,
        code: test.code,
        name: test.name,
        category: test.category,
        sampleType: test.sampleType,
        price: test.price, // Lock historical price
        parameters: test.parameters.map((p) => ({
          name: p.name,
          unit: p.unit,
          normalRange:
            patient.gender === 'female' && p.femaleNormalRange
              ? p.femaleNormalRange
              : patient.gender === 'male' && p.maleNormalRange
              ? p.maleNormalRange
              : p.normalRange,
          low: p.low,
          high: p.high,
        })),
      });

      // Prepare empty result slots for technicians
      for (const p of test.parameters) {
        const applicableRange =
          patient.gender === 'female' && p.femaleNormalRange
            ? p.femaleNormalRange
            : patient.gender === 'male' && p.maleNormalRange
            ? p.maleNormalRange
            : p.normalRange;

        initialResults.push({
          testId: test._id,
          testName: test.name,
          parameterName: p.name,
          value: '',
          unit: p.unit || '',
          normalRange: applicableRange || '',
          status: 'pending',
        });
      }
    }

    // 4. Calculate Billing
    const discount = Math.min(calculatedTotal, Math.max(0, validated.discount || 0));
    const netAmount = calculatedTotal - discount;
    const paidAmount = Math.min(netAmount, Math.max(0, validated.paidAmount || 0));
    const balanceAmount = netAmount - paidAmount;

    let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (paidAmount >= netAmount && netAmount > 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    } else if (netAmount === 0) {
      paymentStatus = 'paid';
    }

    const payments = [];
    if (paidAmount > 0) {
      payments.push({
        amount: paidAmount,
        method: validated.paymentMethod,
        date: new Date(),
        transactionRef: validated.transactionRef || undefined,
        receivedBy: 'Reception',
      });
    }

    // 5. Construct Visit & Historical Commission Snapshot
    const todayIST = getTodayISTDateString();
    const eligibleAmount = netAmount;
    const commissionPercent = doctorDoc ? doctorDoc.commissionPercent : 0;
    const commissionAmount = doctorDoc
      ? Math.round(((eligibleAmount * commissionPercent) / 100) * 100) / 100
      : 0;

    const visit = new Visit({
      dateStringIST: todayIST,
      visitDate: new Date(),
      patient: patient._id,
      patientSnapshot: {
        name: patient.name,
        age: patient.age,
        ageUnit: patient.ageUnit,
        gender: patient.gender,
        mobile: patient.mobile || '',
        permanentId: patient.patientId,
        address: patient.address,
      },
      doctor: doctorDoc ? doctorDoc._id : undefined,
      doctorSnapshot: {
        doctorId: doctorDoc ? doctorDoc._id : undefined,
        name: doctorDoc ? doctorDoc.name : 'Self / Direct',
        commissionPercent,
        eligibleAmount,
        commissionAmount,
      },
      tests: testSnapshots,
      results: initialResults,
      resultRevisions: [],
      status: 'registered',
      billing: {
        totalAmount: calculatedTotal,
        discount,
        netAmount,
        paidAmount,
        balanceAmount,
        paymentStatus,
        payments,
      },
      notes: validated.notes || undefined,
    });

    await visit.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Visit registered successfully',
        visit,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to create visit' },
      { status: 500 }
    );
  }
}
