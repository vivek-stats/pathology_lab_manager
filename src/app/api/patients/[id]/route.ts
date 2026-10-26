import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getDatabaseStatus } from '@/lib/db';
import { Patient } from '@/models/Patient';
import { Visit } from '@/models/Visit';
import { UpdatePatientSchema } from '@/lib/validations/patient';
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

    // Can query by Mongo _id OR permanent patientId (e.g., PAT-202610-0001)
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { patientId: id }] }
      : { patientId: id };

    const patient = await Patient.findOne(query).lean();
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const enrichedPatient = {
      ...patient,
      referredByDoctorName: (patient as any).referredByDoctorName || 'Self / Direct',
    };

    // Fetch visit history for this patient in reverse chronological order (newest first)
    const visits = await Visit.find({ patient: patient._id })
      .sort({ visitDate: -1, createdAt: -1 })
      .lean();

    // Calculate chronological lifetime visit sequence numbers (Visit 1 of N, etc.)
    // based on true chronological ordering (oldest = Visit #1, newest = Visit #N)
    const chronologicalVisits = [...visits].sort(
      (a: any, b: any) =>
        new Date(a.visitDate || a.createdAt).getTime() - new Date(b.visitDate || b.createdAt).getTime()
    );
    const visitSeqMap = new Map<string, number>();
    chronologicalVisits.forEach((v: any, idx: number) => {
      visitSeqMap.set(String(v._id), idx + 1);
    });

    const enrichedVisits = visits.map((v: any) => ({
      ...v,
      patientVisitNumber: visitSeqMap.get(String(v._id)) || 1,
      totalPatientVisits: visits.length,
    }));

    return NextResponse.json({
      patient: enrichedPatient,
      visits: enrichedVisits,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve patient profile' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validated = UpdatePatientSchema.parse(body);

    const id = params.id;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { patientId: id }] }
      : { patientId: id };

    const updated = await Patient.findOneAndUpdate(query, validated, { new: true });
    if (!updated) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, patient: updated });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to update patient' }, { status: 500 });
  }
}
