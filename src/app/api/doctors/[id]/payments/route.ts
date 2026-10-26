import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getDatabaseStatus } from '@/lib/db';
import { Doctor } from '@/models/Doctor';
import { Visit } from '@/models/Visit';
import { DoctorPayment } from '@/models/DoctorPayment';
import { DoctorPaymentSchema } from '@/lib/validations/doctor';
import { getTodayISTDateString } from '@/lib/timezone';
import mongoose from 'mongoose';

export async function POST(
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

    const doctor = await Doctor.findOne(query);
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const body = await req.json();
    const validated = DoctorPaymentSchema.parse(body);

    // 1. Calculate current lifetime commission earned & paid to determine outstanding
    const validVisits = await Visit.find({
      doctor: doctor._id,
      status: { $ne: 'cancelled' },
    }).select('doctorSnapshot').lean();

    const lifetimeEarned = validVisits.reduce(
      (sum, v) => sum + (v.doctorSnapshot?.commissionAmount ?? 0),
      0
    );

    const pastPayments = await DoctorPayment.find({ doctor: doctor._id }).select('amount referenceNumber createdAt').lean();
    const lifetimePaid = pastPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstandingBalance = Math.round(Math.max(0, lifetimeEarned - lifetimePaid) * 100) / 100;

    // 2. Validate Overpayment: Do not allow payment > outstanding unless explicit adjustment flag is true
    if (validated.amount > outstandingBalance && !validated.isAdjustment) {
      return NextResponse.json(
        {
          error: `Payment amount of ₹${validated.amount} exceeds the outstanding commission balance of ₹${outstandingBalance}. Enable explicit adjustment if this is a manual ledger balance advance or adjustment.`,
          currentOutstanding: outstandingBalance,
          requestedAmount: validated.amount,
        },
        { status: 400 }
      );
    }

    // 3. Duplicate Submission Guard: Check if identical reference number was recorded recently
    if (validated.referenceNumber?.trim()) {
      const dup = await DoctorPayment.findOne({
        doctor: doctor._id,
        referenceNumber: validated.referenceNumber.trim(),
      });
      if (dup) {
        return NextResponse.json(
          {
            error: `A payment with reference '${validated.referenceNumber}' has already been recorded on ${dup.dateStringIST}. Duplicate submissions are prevented.`,
          },
          { status: 409 }
        );
      }
    }

    // 4. Record Payment
    const todayIST = getTodayISTDateString();
    const payment = new DoctorPayment({
      doctor: doctor._id,
      amount: validated.amount,
      paymentDate: validated.paymentDate ? new Date(validated.paymentDate) : new Date(),
      dateStringIST: todayIST,
      paymentMethod: validated.paymentMethod,
      referenceNumber: validated.referenceNumber?.trim() || undefined,
      notes: validated.notes?.trim() || undefined,
      isAdjustment: validated.isAdjustment || false,
      recordedBy: validated.recordedBy || 'Accounts Manager',
    });

    await payment.save();

    const newLifetimePaid = lifetimePaid + validated.amount;
    const newOutstanding = Math.round(Math.max(0, lifetimeEarned - newLifetimePaid) * 100) / 100;

    return NextResponse.json(
      {
        success: true,
        message: 'Commission payment recorded successfully',
        payment,
        ledgerSummary: {
          lifetimeEarned: Math.round(lifetimeEarned * 100) / 100,
          lifetimePaid: Math.round(newLifetimePaid * 100) / 100,
          outstandingBalance: newOutstanding,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to record commission payment' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const id = params.id;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { code: id.toUpperCase() }] }
      : { code: id.toUpperCase() };

    const doctor = await Doctor.findOne(query);
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const payments = await DoctorPayment.find({ doctor: doctor._id }).sort({ paymentDate: -1 }).lean();
    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch doctor payments ledger' },
      { status: 500 }
    );
  }
}
