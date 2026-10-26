import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getDatabaseStatus } from '@/lib/db';
import { Patient } from '@/models/Patient';
import { Doctor } from '@/models/Doctor';
import { PatientSchema } from '@/lib/validations/patient';
import { getISTDayBounds } from '@/lib/timezone';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const dbStatus = await getDatabaseStatus();
  if (!dbStatus.isConnected) {
    return NextResponse.json({
      dbConnected: false,
      message: dbStatus.message,
      error: dbStatus.error,
      patients: [],
      pagination: { total: 0, page: 1, totalPages: 0 },
    });
  }

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const query = searchParams.get('q') || '';
    const dateStr = searchParams.get('date') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Search by Name, Patient ID, or Mobile
    if (query.trim()) {
      const q = query.trim();
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { name: regex },
        { patientId: regex },
        { mobile: regex },
      ];
    }

    // Calendar and date filtering (in IST)
    if (dateStr) {
      const { start, end } = getISTDayBounds(dateStr);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const total = await Patient.countDocuments(filter);
    const rawPatients = await Patient.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const patients = rawPatients.map((p: any) => ({
      ...p,
      referredByDoctorName: p.referredByDoctorName || 'Self / Direct',
    }));

    return NextResponse.json({
      dbConnected: true,
      patients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to query patients' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const dbStatus = await getDatabaseStatus();
  if (!dbStatus.isConnected) {
    return NextResponse.json(
      {
        error: 'Database not connected. Please configure MONGODB_URI in .env.local to persist patient records.',
        dbConnected: false,
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const validated = PatientSchema.parse(body);

    await connectToDatabase();

    let doctorDoc = null;
    if (validated.referredByDoctor && mongoose.Types.ObjectId.isValid(validated.referredByDoctor)) {
      doctorDoc = await Doctor.findById(validated.referredByDoctor).lean();
    }

    const patientData: any = {
      ...validated,
      referredByDoctor: doctorDoc ? doctorDoc._id : undefined,
      referredByDoctorName: doctorDoc ? doctorDoc.name : 'Self / Direct',
    };

    const patient = new Patient(patientData);
    await patient.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Patient registered successfully',
        patient,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to create patient' },
      { status: 500 }
    );
  }
}
