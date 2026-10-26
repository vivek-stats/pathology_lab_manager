import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getDatabaseStatus } from '@/lib/db';
import { Test } from '@/models/Test';
import { UpdateTestSchema } from '@/lib/validations/test';
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

    const test = await Test.findOne(query).lean();
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({ test });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve test' },
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
    const id = params.id;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { code: id.toUpperCase() }] }
      : { code: id.toUpperCase() };

    const test = await Test.findOne(query);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const body = await req.json();
    const validated = UpdateTestSchema.parse(body);

    // If code is being changed, ensure uniqueness
    if (validated.code && validated.code.toUpperCase() !== test.code.toUpperCase()) {
      const codeCheck = await Test.findOne({
        code: validated.code.toUpperCase(),
        _id: { $ne: test._id },
      });
      if (codeCheck) {
        return NextResponse.json(
          { error: `Test code '${validated.code}' is already in use by another test.` },
          { status: 400 }
        );
      }
      test.code = validated.code.toUpperCase();
    }

    if (validated.name !== undefined) test.name = validated.name;
    if (validated.category !== undefined) test.category = validated.category;
    if (validated.sampleType !== undefined) test.sampleType = validated.sampleType;
    if (validated.price !== undefined) test.price = validated.price;
    if (validated.tatHours !== undefined) test.tatHours = validated.tatHours;
    if (validated.isActive !== undefined) test.isActive = validated.isActive;

    if (validated.parameters !== undefined) {
      if (validated.parameters.length === 0) {
        return NextResponse.json(
          { error: 'Every test must have at least one investigation parameter.' },
          { status: 400 }
        );
      }

      // Check duplicate parameter names
      const seen = new Set<string>();
      for (const p of validated.parameters) {
        const clean = p.name.trim().toLowerCase();
        if (seen.has(clean)) {
          return NextResponse.json(
            { error: `Duplicate parameter name '${p.name}' in test definition.` },
            { status: 400 }
          );
        }
        seen.add(clean);
      }

      test.parameters = validated.parameters.map((p) => ({
        name: p.name.trim(),
        unit: p.unit?.trim() || '',
        normalRange: p.normalRange?.trim() || '',
        low: p.low ?? undefined,
        high: p.high ?? undefined,
        genderSpecific: Boolean(p.genderSpecific),
        maleNormalRange: p.maleNormalRange?.trim() || '',
        femaleNormalRange: p.femaleNormalRange?.trim() || '',
      }));
    }

    await test.save();

    return NextResponse.json({
      success: true,
      message: 'Test updated successfully',
      test,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Test code collision in catalog.' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to update test' },
      { status: 500 }
    );
  }
}

/**
 * Soft-Delete / Deactivation
 * NEVER hard-deletes the document to preserve historical visit integrity
 */
export async function DELETE(
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

    const test = await Test.findOne(query);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Soft-delete: toggle isActive to false
    test.isActive = false;
    await test.save();

    return NextResponse.json({
      success: true,
      message: `Test '${test.code} - ${test.name}' deactivated successfully`,
      test,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to deactivate test' },
      { status: 500 }
    );
  }
}
