import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getDatabaseStatus } from '@/lib/db';
import { Doctor } from '@/models/Doctor';
import { Visit } from '@/models/Visit';
import { DoctorPayment } from '@/models/DoctorPayment';
import { DoctorSchema } from '@/lib/validations/doctor';
import { getISTDayBounds } from '@/lib/timezone';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const dbStatus = await getDatabaseStatus();
  if (!dbStatus.isConnected) {
    return NextResponse.json({ error: 'Database disconnected', dbConnected: false }, { status: 503 });
  }

  try {
    await connectToDatabase();
    const id = params.id;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { code: id.toUpperCase() }] }
      : { code: id.toUpperCase() };

    const doctor = await Doctor.findOne(query).lean();
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get('from') || ''; // "YYYY-MM-DD"
    const toDate = searchParams.get('to') || '';     // "YYYY-MM-DD"

    const visitFilter: any = { doctor: doctor._id };
    const paymentFilter: any = { doctor: doctor._id };

    if (fromDate && toDate) {
      const fromBounds = getISTDayBounds(fromDate);
      const toBounds = getISTDayBounds(toDate);
      visitFilter.visitDate = { $gte: fromBounds.start, $lte: toBounds.end };
      paymentFilter.paymentDate = { $gte: fromBounds.start, $lte: toBounds.end };
    } else if (fromDate) {
      const fromBounds = getISTDayBounds(fromDate);
      visitFilter.visitDate = { $gte: fromBounds.start };
      paymentFilter.paymentDate = { $gte: fromBounds.start };
    } else if (toDate) {
      const toBounds = getISTDayBounds(toDate);
      visitFilter.visitDate = { $lte: toBounds.end };
      paymentFilter.paymentDate = { $lte: toBounds.end };
    }

    // 1. Fetch visits within date range
    const visits = await Visit.find(visitFilter)
      .sort({ visitDate: -1 })
      .populate('patient', 'patientId name gender age ageUnit mobile')
      .lean();

    // 2. Fetch payments within date range (and all-time for outstanding balance)
    const payments = await DoctorPayment.find(paymentFilter)
      .sort({ paymentDate: -1 })
      .lean();

    const allTimePayments = await DoctorPayment.find({ doctor: doctor._id }).select('amount').lean();
    const totalLifetimePaid = allTimePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const allTimeVisits = await Visit.find({ doctor: doctor._id, status: { $ne: 'cancelled' } })
      .select('doctorSnapshot billing')
      .lean();
    const totalLifetimeEarned = allTimeVisits.reduce(
      (sum, v) => sum + (v.doctorSnapshot?.commissionAmount ?? 0),
      0
    );

    // 3. Compute period metrics
    const uniquePatientSet = new Set<string>();
    let periodVisitsCount = 0;
    let periodTestsCount = 0;
    let periodEligibleAmount = 0;
    let periodCommissionEarned = 0;

    for (const v of visits) {
      // Track distinct patient IDs (separate patients from total visits)
      const patientKey = v.patientSnapshot?.permanentId || (v.patient?._id ? String(v.patient._id) : String(v.patient));
      if (patientKey) {
        uniquePatientSet.add(patientKey);
      }

      if (v.status !== 'cancelled') {
        periodVisitsCount += 1;
        periodTestsCount += v.tests?.length || 0;
        periodEligibleAmount += v.doctorSnapshot?.eligibleAmount ?? (v.billing?.netAmount || 0);
        periodCommissionEarned += v.doctorSnapshot?.commissionAmount ?? 0;
      }
    }

    const periodPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstandingCommission = Math.max(0, totalLifetimeEarned - totalLifetimePaid);

    return NextResponse.json({
      doctor,
      dateRange: {
        from: fromDate,
        to: toDate,
      },
      metrics: {
        uniquePatientCount: uniquePatientSet.size,
        totalVisitsCount: visits.length,
        eligibleVisitsCount: periodVisitsCount,
        cancelledVisitsCount: visits.length - periodVisitsCount,
        totalTestsCount: periodTestsCount,
        totalEligibleAmount: Math.round(periodEligibleAmount * 100) / 100,
        totalCommissionEarned: Math.round(periodCommissionEarned * 100) / 100,
        totalCommissionPaid: Math.round(periodPaid * 100) / 100,
        lifetimeEarned: Math.round(totalLifetimeEarned * 100) / 100,
        lifetimePaid: Math.round(totalLifetimePaid * 100) / 100,
        outstandingCommission: Math.round(outstandingCommission * 100) / 100,
      },
      visits,
      payments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve doctor dashboard' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const dbStatus = await getDatabaseStatus();
  if (!dbStatus.isConnected) {
    return NextResponse.json({ error: 'Database disconnected', dbConnected: false }, { status: 503 });
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const validated = DoctorSchema.partial().parse(body);

    const id = params.id;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { code: id.toUpperCase() }] }
      : { code: id.toUpperCase() };

    // Check code collision if updating code
    if (validated.code) {
      const codeUpper = validated.code.trim().toUpperCase();
      const existing = await Doctor.findOne({ code: codeUpper, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json(
          { error: `Doctor code '${codeUpper}' is already taken by another doctor.` },
          { status: 400 }
        );
      }
      validated.code = codeUpper;
    }

    const updated = await Doctor.findOneAndUpdate(query, validated, { new: true });
    if (!updated) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Doctor profile updated successfully',
      doctor: updated,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to update doctor profile' },
      { status: 500 }
    );
  }
}
