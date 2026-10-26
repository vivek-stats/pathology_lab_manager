'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Calendar,
  CreditCard,
  FileCheck2,
  Clock,
  PlusCircle,
  FlaskConical,
  AlertCircle,
  Printer,
  ChevronRight,
  TrendingUp,
  Receipt,
  FileText,
} from 'lucide-react';
import { DbStatusBanner } from '@/components/common/DbStatusBanner';
import { StatusBadge } from '@/components/ui/Badge';
import { formatCurrencyINR, formatISTTime } from '@/lib/timezone';
import Link from 'next/link';

interface DashboardData {
  dbConnected: boolean;
  message?: string;
  todayDateIST: string;
  stats: {
    todayPatientsCount: number;
    todayRevenue: number;
    todayPendingBalance: number;
    todayPendingReports: number;
    todayCompletedReports: number;
    totalRegisteredPatients: number;
  };
  recentVisits: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      
      const safeStats = json?.stats || {
        todayPatientsCount: 0,
        todayRevenue: 0,
        todayPendingBalance: 0,
        todayPendingReports: 0,
        todayCompletedReports: 0,
        totalRegisteredPatients: 0,
      };

      setData({
        dbConnected: json?.dbConnected ?? false,
        message: json?.message || json?.error,
        todayDateIST: json?.todayDateIST || '',
        stats: safeStats,
        recentVisits: Array.isArray(json?.recentVisits) ? json.recentVisits : [],
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setData({
        dbConnected: false,
        message: 'Could not connect to dashboard service',
        todayDateIST: '',
        stats: {
          todayPatientsCount: 0,
          todayRevenue: 0,
          todayPendingBalance: 0,
          todayPendingReports: 0,
          todayCompletedReports: 0,
          totalRegisteredPatients: 0,
        },
        recentVisits: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / DB Alert if offline */}
      {data && <DbStatusBanner dbConnected={data.dbConnected} errorMessage={data.message} />}

      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lab Executive Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time daily operations, patient intake, and testing overview for{' '}
            <span className="font-semibold text-slate-700">{data?.todayDateIST || 'Today'} (IST)</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/patients"
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Register Patient / Visit</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's Patients & Serial Count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Today&apos;s Patients
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {loading ? '—' : data?.stats?.todayPatientsCount ?? 0}
            </h3>
            <p className="text-xs text-teal-600 mt-2 font-medium flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Daily serials in Asia/Kolkata</span>
            </p>
          </div>
          <div className="p-3 bg-teal-50 rounded-lg text-teal-600 border border-teal-100">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 2: Today's Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Today&apos;s Revenue
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {loading ? '—' : formatCurrencyINR(data?.stats?.todayRevenue)}
            </h3>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Collected collections today
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 3: Outstanding Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Balance
            </p>
            <h3 className="text-2xl font-extrabold text-rose-600 mt-1">
              {loading ? '—' : formatCurrencyINR(data?.stats?.todayPendingBalance)}
            </h3>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Awaiting patient settlement
            </p>
          </div>
          <div className="p-3 bg-rose-50 rounded-lg text-rose-600 border border-rose-100">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 4: Reports Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Reports Workflow
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {loading ? '—' : data?.stats?.todayCompletedReports ?? 0}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">Ready</span>
              <span className="text-slate-300">/</span>
              <span className="text-lg font-bold text-amber-600">
                {loading ? '—' : data?.stats?.todayPendingReports ?? 0}
              </span>
              <span className="text-xs text-amber-600 font-semibold">Pending</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Laboratory turnaround
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
            <FlaskConical className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Section: Today's Patient Queue and Recent Visits */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Today&apos;s Lab Intake &amp; Queue
            </h2>
            <p className="text-xs text-slate-500">
              Patients registered for testing on {data?.todayDateIST || 'today'}.
            </p>
          </div>
          <Link
            href="/visits"
            className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1"
          >
            <span>View All Visits</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-teal-500" />
            <p className="text-sm font-medium">Loading today&apos;s lab intake...</p>
          </div>
        ) : !data?.dbConnected ? (
          <div className="p-12 text-center">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Database Offline</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Connect MongoDB to record patients, track daily serials, and generate medical reports.
            </p>
          </div>
        ) : (!data.recentVisits || data.recentVisits.length === 0) ? (
          <div className="p-12 text-center">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No visits registered today yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Start by registering a patient or booking tests for an existing patient.
            </p>
            <Link
              href="/patients"
              className="mt-4 inline-flex items-center gap-2 bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-teal-700"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Register First Patient</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Token #</th>
                  <th className="px-5 py-3">Patient Details</th>
                  <th className="px-5 py-3">Tests Ordered</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Billing</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data.recentVisits || []).map((visit) => (
                  <tr key={visit._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Daily Serial / Token */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                          #{visit.dailySerial}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {formatISTTime(visit.visitDate)}
                        </span>
                      </div>
                    </td>

                    {/* Patient Details */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {visit.patientSnapshot?.name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-slate-600 font-medium">
                          {visit.patientSnapshot?.permanentId}
                        </span>
                        <span>•</span>
                        <span>
                          {visit.patientSnapshot?.age} {visit.patientSnapshot?.ageUnit} / {visit.patientSnapshot?.gender}
                        </span>
                        <span>•</span>
                        <span>{visit.patientSnapshot?.mobile}</span>
                      </div>
                    </td>

                    {/* Tests Ordered */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {visit.tests.map((t: any) => (
                          <span
                            key={t.code}
                            className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded border border-slate-200 font-medium"
                          >
                            {t.code}
                          </span>
                        ))}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Ref: {visit.doctorSnapshot?.name || 'Self'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusBadge status={visit.status} />
                    </td>

                    {/* Billing */}
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">
                        {formatCurrencyINR(visit.billing?.netAmount)}
                      </div>
                      <div className="text-xs mt-0.5">
                        {visit.billing?.balanceAmount > 0 ? (
                          <span className="text-rose-600 font-semibold">
                            Bal: {formatCurrencyINR(visit.billing.balanceAmount)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Fully Paid</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/visits/${visit.visitId || visit._id}`}
                          className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded transition"
                        >
                          Results
                        </Link>
                        <Link
                          href={`/reports/${visit.visitId || visit._id}`}
                          target="_blank"
                          title="Print Lab Report (A4)"
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                        >
                          <FileText className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/receipts/${visit.visitId || visit._id}`}
                          target="_blank"
                          title="Print Receipt"
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                        >
                          <Receipt className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
