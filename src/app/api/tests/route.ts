import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getDatabaseStatus } from '@/lib/db';
import { Test } from '@/models/Test';
import { TestSchema } from '@/lib/validations/test';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const dbStatus = await getDatabaseStatus();
  if (!dbStatus.isConnected) {
    return NextResponse.json({
      dbConnected: false,
      tests: [],
      categories: [],
      message: dbStatus.message,
    });
  }

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';

    const filter: any = {};

    // Active / Inactive Status Filter (Default to active=true if not specified or specified as 'active')
    if (status === 'all') {
      // Show all tests (both active and inactive)
    } else if (status === 'inactive') {
      filter.isActive = false;
    } else {
      // Default: active only (preserves compatibility with BookVisitModal and existing callers)
      filter.isActive = true;
    }

    // Category Filter
    if (category && category !== 'all') {
      filter.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    // Search query: matches test code, name, or category
    if (query.trim()) {
      const regex = new RegExp(query.trim(), 'i');
      filter.$or = [
        { code: regex },
        { name: regex },
        { category: regex },
      ];
    }

    const tests = await Test.find(filter).sort({ name: 1 }).lean();
    const categories = await Test.distinct('category');

    return NextResponse.json({
      dbConnected: true,
      tests,
      categories: categories.sort(),
      total: tests.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch tests catalog' },
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
    const validated = TestSchema.parse(body);

    await connectToDatabase();

    // Check duplicate code case-insensitively
    const existing = await Test.findOne({
      code: validated.code.toUpperCase(),
    });

    if (existing) {
      return NextResponse.json(
        { error: `Test code '${validated.code}' is already registered in the catalog.` },
        { status: 400 }
      );
    }

    const test = new Test({
      ...validated,
      code: validated.code.toUpperCase(),
    });

    await test.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Lab investigation test created successfully',
        test,
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

    // MongoDB duplicate key error code 11000
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A test with this code already exists in the catalog.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to create test' },
      { status: 500 }
    );
  }
}
