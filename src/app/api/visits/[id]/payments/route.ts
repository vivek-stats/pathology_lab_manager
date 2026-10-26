import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getDatabaseStatus } from '@/lib/db';
import { Visit } from '@/models/Visit';
import { AddPaymentSchema } from '@/lib/validations/visit';
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
    const body = await req.json();
    const validated = AddPaymentSchema.parse(body);

    const id = params.id;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { visitId: id }] }
      : { visitId: id };

    const visit = await Visit.findOne(query);
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const currentBilling = visit.billing;
    const newPaidAmount = currentBilling.paidAmount + validated.amount;
    const newBalanceAmount = Math.max(0, currentBilling.netAmount - newPaidAmount);

    let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (newBalanceAmount <= 0) {
      paymentStatus = 'paid';
    } else if (newPaidAmount > 0) {
      paymentStatus = 'partial';
    }

    visit.billing.paidAmount = newPaidAmount;
    visit.billing.balanceAmount = newBalanceAmount;
    visit.billing.paymentStatus = paymentStatus;

    visit.billing.payments.push({
      amount: validated.amount,
      method: validated.method,
      date: new Date(),
      transactionRef: validated.transactionRef,
      receivedBy: validated.receivedBy || 'Reception',
    });

    await visit.save();

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      billing: visit.billing,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to record payment' },
      { status: 500 }
    );
  }
}
