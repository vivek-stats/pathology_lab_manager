import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { LabSettings } from '@/models/LabSettings';
import { UpdateLabSettingsSchema } from '@/lib/validations/settings';
import { DEFAULT_LAB_SETTINGS } from '@/types';
import { getSessionUser } from '@/lib/auth';

/**
 * GET /api/settings
 * Retrieves the current laboratory settings. Returns default settings if unconfigured.
 */
export async function GET() {
  try {
    await connectToDatabase();
    const doc = await LabSettings.findOne({ key: 'default' }).lean();

    if (!doc) {
      return NextResponse.json({
        success: true,
        settings: DEFAULT_LAB_SETTINGS,
        isConfigured: false,
      });
    }

    // Merge document over defaults to ensure complete configuration object
    const mergedSettings = {
      ...DEFAULT_LAB_SETTINGS,
      ...doc,
    };

    return NextResponse.json({
      success: true,
      settings: mergedSettings,
      isConfigured: true,
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve settings', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * Updates laboratory settings partially or fully.
 */
export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();

    // Check optional authentication session
    const session = getSessionUser(req);
    // If a session exists and has a restricted role, we could check here.
    // For demo/standalone lab usage, allow authenticated users or local requests.

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    // Validate update fields
    const validation = UpdateLabSettingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed for settings',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Reject empty labName if explicitly provided
    if (updateData.labName !== undefined && updateData.labName.trim().length < 2) {
      return NextResponse.json(
        {
          error: 'Laboratory name must be at least 2 characters',
          details: { labName: ['Laboratory name must be at least 2 characters'] },
        },
        { status: 400 }
      );
    }

    // Atomic upsert with $set to protect unrelated existing fields
    const updated = await LabSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: updateData },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    const mergedSettings = {
      ...DEFAULT_LAB_SETTINGS,
      ...updated,
    };

    return NextResponse.json({
      success: true,
      settings: mergedSettings,
      message: 'Software settings updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings', details: error.message },
      { status: 500 }
    );
  }
}
