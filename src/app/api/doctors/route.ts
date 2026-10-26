import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getDatabaseStatus } from '@/lib/db';
import { Doctor } from '@/models/Doctor';
import { Visit } from '@/models/Visit';
import { DoctorPayment } from '@/models/DoctorPayment';
import { DoctorSchema } from '@/lib/validations/doctor';
import { getNextSequence } from '@/models/Counter';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const dbStatus = await getDatabaseStatus();
  if (!dbStatus.isConnected) {
    return NextResponse.json({
      dbConnected: false,
      doctors: [],
      message: dbStatus.message,
    });
  }

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'all';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const filter: any = {};

    if (activeOnly) {
      filter.isActive = true;
    } else if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    if (query.trim()) {
      const regex = new RegExp(query.trim(), 'i');
      filter.$or = [
        { name: regex },
        { code: regex },
        { specialization: regex },
        { mobile: regex },
      ];
    }

    const doctors = await Doctor.find(filter).sort({ name: 1 }).lean();

    // Attach quick referral stats for each doctor
    const doctorStatsPromises = doctors.map(async (doc) => {
      const visits = await Visit.find({ doctor: doc._id }).select('status billing doctorSnapshot').lean();
      const validVisits = visits.filter((v) => v.status !== 'cancelled');

      let totalEarned = 0;
      for (const v of validVisits) {
        totalEarned += v.doctorSnapshot?.commissionAmount ?? 0;
      }

      const payments = await DoctorPayment.find({ doctor: doc._id }).select('amount').lean();
      const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

      return {
        ...doc,
        stats: {
          totalVisits: visits.length,
          activeVisits: validVisits.length,
          totalEarned: Math.round(totalEarned * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          outstandingBalance: Math.round(Math.max(0, totalEarned - totalPaid) * 100) / 100,
        },
      };
    });

    const doctorsWithStats = await Promise.all(doctorStatsPromises);

    return NextResponse.json({
      dbConnected: true,
      doctors: doctorsWithStats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch doctors directory' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const dbStatus = await getDatabaseStatus();
  if (!dbStatus.isConnected) {
    return NextResponse.json(
      {
        error: 'Database not connected. Please ensure MongoDB is running.',
        dbConnected: false,
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const validated = DoctorSchema.parse(body);

    await connectToDatabase();

    // Auto-generate code if omitted
    let doctorCode = validated.code?.trim().toUpperCase();
    if (!doctorCode) {
      const seq = await getNextSequence('doctor_code_seq');
      doctorCode = `DOC-${String(seq).padStart(4, '0')}`;
    }

    // Check duplicate code
    const existing = await Doctor.findOne({ code: doctorCode });
    if (existing) {
      return NextResponse.json(
        { error: `Doctor code '${doctorCode}' is already registered.` },
        { status: 400 }
      );
    }

    const doctor = new Doctor({
      ...validated,
      code: doctorCode,
    });

    await doctor.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Doctor added successfully',
        doctor,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to add doctor' },
      { status: 500 }
    );
  }
}
