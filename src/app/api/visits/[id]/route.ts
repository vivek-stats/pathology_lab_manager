import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getDatabaseStatus } from '@/lib/db';
import { Visit } from '@/models/Visit';
import { Doctor } from '@/models/Doctor';
import { UpdateResultsSchema } from '@/lib/validations/visit';
import mongoose from 'mongoose';

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
      ? { $or: [{ _id: id }, { visitId: id }] }
      : { visitId: id };

    const visit = await Visit.findOne(query).populate('patient').populate('doctor').lean();
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    return NextResponse.json({ visit });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve visit' },
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

    const id = params.id;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { visitId: id }] }
      : { visitId: id };

    const visit = await Visit.findOne(query);
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Handle Status Update
    if (body.status && ['registered', 'sample_collected', 'processing', 'partial_ready', 'completed', 'cancelled'].includes(body.status)) {
      visit.status = body.status;
      if (body.status === 'cancelled' && visit.doctorSnapshot) {
        visit.doctorSnapshot.eligibleAmount = 0;
        visit.doctorSnapshot.commissionAmount = 0;
      }
    }

    // Handle Referring Doctor Correction / Change (with audit trail)
    if (body.doctorId !== undefined) {
      const prevDoctorIdStr = visit.doctorSnapshot?.doctorId ? String(visit.doctorSnapshot.doctorId) : '';
      const newDoctorIdStr = body.doctorId ? String(body.doctorId).trim() : '';

      if (prevDoctorIdStr !== newDoctorIdStr) {
        let newDoctorDoc = null;
        if (newDoctorIdStr && newDoctorIdStr !== 'null' && newDoctorIdStr !== 'undefined') {
          newDoctorDoc = await Doctor.findById(newDoctorIdStr);
          if (!newDoctorDoc) {
            return NextResponse.json({ error: 'Selected referring doctor does not exist' }, { status: 404 });
          }
        }

        const eligibleAmount = visit.status === 'cancelled' ? 0 : (visit.billing?.netAmount || 0);
        const commissionPercent = newDoctorDoc ? newDoctorDoc.commissionPercent : 0;
        const commissionAmount = newDoctorDoc
          ? Math.round(((eligibleAmount * commissionPercent) / 100) * 100) / 100
          : 0;
        const newDoctorName = newDoctorDoc ? newDoctorDoc.name : 'Self / Direct';

        if (!visit.doctorAuditTrail) {
          visit.doctorAuditTrail = [];
        }

        visit.doctorAuditTrail.push({
          previousDoctorId: visit.doctorSnapshot?.doctorId,
          previousDoctorName: visit.doctorSnapshot?.name || 'Self / Direct',
          previousCommissionRate: visit.doctorSnapshot?.commissionPercent || 0,
          previousCommissionAmount: visit.doctorSnapshot?.commissionAmount || 0,
          newDoctorId: newDoctorDoc ? newDoctorDoc._id : undefined,
          newDoctorName,
          newCommissionRate: commissionPercent,
          newCommissionAmount: commissionAmount,
          reason: body.doctorCorrectionReason || body.reason || 'Correction of referring doctor association',
          changedBy: body.changedBy || 'Authorized Staff',
          changedAt: new Date(),
        });

        visit.doctor = newDoctorDoc ? newDoctorDoc._id : undefined;
        visit.doctorSnapshot = {
          doctorId: newDoctorDoc ? newDoctorDoc._id : undefined,
          name: newDoctorName,
          commissionPercent,
          eligibleAmount,
          commissionAmount,
        };
      }
    }

    // Handle Results Entry / Update
    if (body.results && Array.isArray(body.results)) {
      const parsed = UpdateResultsSchema.parse({
        results: body.results,
        reasonForChange: body.reasonForChange || 'Technician entered/updated results',
        enteredBy: body.enteredBy || 'Lab Staff',
      });

      // Archive previous results into revision history if there were already values entered
      const hadExistingValues = visit.results.some((r) => r.value && r.value.trim() !== '');
      if (hadExistingValues) {
        visit.resultRevisions.push({
          revisionNumber: (visit.resultRevisions.length || 0) + 1,
          savedAt: new Date(),
          savedBy: parsed.enteredBy || 'Lab Staff',
          reasonForChange: parsed.reasonForChange || 'Result correction',
          results: JSON.parse(JSON.stringify(visit.results)),
        });
      }

      // Update current results
      const now = new Date();
      visit.results = parsed.results.map((r: any) => ({
        testId: new mongoose.Types.ObjectId(r.testId),
        testName: r.testName || 'Test',
        parameterName: r.parameterName,
        value: r.value,
        unit: r.unit || '',
        normalRange: r.normalRange || '',
        status: r.status,
        enteredAt: now,
        enteredBy: parsed.enteredBy || 'Lab Staff',
      }));

      // Check if all results are entered; if so, update status to completed if not already set
      const allFilled = visit.results.every((r) => r.value && r.value.trim() !== '');
      if (allFilled && visit.status !== 'completed' && !body.status) {
        visit.status = 'completed';
      } else if (!allFilled && visit.status === 'registered') {
        visit.status = 'processing';
      }
    }

    await visit.save();

    return NextResponse.json({
      success: true,
      message: 'Visit updated successfully',
      visit,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to update visit' },
      { status: 500 }
    );
  }
}
