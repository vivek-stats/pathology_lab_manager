import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get('force') === 'true';
  const dbStatus = await getDatabaseStatus(force);

  return NextResponse.json({
    status: dbStatus.isConnected ? 'healthy' : 'database_disconnected',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    labInfo: {
      name: process.env.NEXT_PUBLIC_LAB_NAME || 'Pathology Laboratory',
      address: process.env.NEXT_PUBLIC_LAB_ADDRESS || '',
      phone: process.env.NEXT_PUBLIC_LAB_PHONE || '',
    },
  });
}
