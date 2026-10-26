import { NextResponse } from 'next/server';
import { connectToDatabase, getDatabaseStatus } from '@/lib/db';
import { Visit } from '@/models/Visit';
import { Patient } from '@/models/Patient';
import { getTodayISTDateString } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbStatus = await getDatabaseStatus();

  if (!dbStatus.isConnected) {
    return NextResponse.json({
      dbConnected: false,
      message: dbStatus.message,
      error: dbStatus.error,
      stats: {
        todayPatientsCount: 0,
        todayRevenue: 0,
        todayPendingBalance: 0,
        todayPendingReports: 0,
        todayCompletedReports: 0,
        totalRegisteredPatients: 0,
      },
      todayDateIST: getTodayISTDateString(),
      recentVisits: [],
    });
  }

  try {
    await connectToDatabase();
    const todayIST = getTodayISTDateString();

    // Query visits registered for today (IST date string)
    const todayVisits = await Visit.find({ dateStringIST: todayIST })
      .sort({ dailySerial: -1 })
      .limit(10)
      .lean();

    const todayCount = await Visit.countDocuments({ dateStringIST: todayIST });
    const totalPatients = await Patient.countDocuments();

    // Calculate revenue & balances for today
    const allTodayVisits = await Visit.find({ dateStringIST: todayIST }).select('billing status').lean();

    let todayRevenue = 0;
    let todayPendingBalance = 0;
    let todayPendingReports = 0;
    let todayCompletedReports = 0;

    for (const v of allTodayVisits) {
      todayRevenue += v.billing?.paidAmount || 0;
      todayPendingBalance += v.billing?.balanceAmount || 0;
      if (v.status === 'completed') {
        todayCompletedReports += 1;
      } else if (v.status !== 'cancelled') {
        todayPendingReports += 1;
      }
    }

    return NextResponse.json({
      dbConnected: true,
      todayDateIST: todayIST,
      stats: {
        todayPatientsCount: todayCount,
        todayRevenue,
        todayPendingBalance,
        todayPendingReports,
        todayCompletedReports,
        totalRegisteredPatients: totalPatients,
      },
      recentVisits: todayVisits,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        dbConnected: false,
        error: error?.message || 'Failed to fetch dashboard metrics',
        stats: {
          todayPatientsCount: 0,
          todayRevenue: 0,
          todayPendingBalance: 0,
          todayPendingReports: 0,
          todayCompletedReports: 0,
          totalRegisteredPatients: 0,
        },
        todayDateIST: getTodayISTDateString(),
        recentVisits: [],
      },
      { status: 200 }
    );
  }
}
