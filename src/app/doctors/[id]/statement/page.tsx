'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { formatCurrencyINR, formatISTDateTime, formatISTDate } from '@/lib/timezone';
import { IDoctorDashboardMetrics, ILabSettings, DEFAULT_LAB_SETTINGS } from '@/types';

export default function DoctorCommissionStatementPage({
  params,
}: {
  params: { id: string };
}) {
  const searchParams = useSearchParams();
  const fromDate = searchParams.get('from') || '';
  const toDate = searchParams.get('to') || '';

  const [data, setData] = useState<IDoctorDashboardMetrics | null>(null);
  const [settings, setSettings] = useState<ILabSettings>(DEFAULT_LAB_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams();
    if (fromDate) q.set('from', fromDate);
    if (toDate) q.set('to', toDate);

    Promise.all([
      fetch(`/api/doctors/${params.id}?${q.toString()}`).then((res) => res.json()),
      fetch('/api/settings').then((res) => res.json()).catch(() => ({ settings: DEFAULT_LAB_SETTINGS })),
    ])
      .then(([jsonData, settingsData]) => {
        if (jsonData.error) throw new Error(jsonData.error);
        setData(jsonData);
        if (settingsData?.settings) {
          setSettings(settingsData.settings);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id, fromDate, toDate]);

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500">
        <Clock className="h-8 w-8 animate-spin mx-auto mb-3 text-teal-600" />
        <p className="text-sm font-medium">Generating Doctor Commission Statement...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-16 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">Statement Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
        <Link
          href={`/doctors/${params.id}`}
          className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-teal-700 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Doctor Dashboard</span>
        </Link>
      </div>
    );
  }

  const { doctor, metrics, visits, payments, dateRange } = data;

  const labName = settings.labName || process.env.NEXT_PUBLIC_LAB_NAME || 'Apex Diagnostics & Pathology Laboratory';
  const labAddress =
    [settings.addressLine1, settings.addressLine2, settings.city, settings.state, settings.postalCode]
      .filter(Boolean)
      .join(', ') ||
    process.env.NEXT_PUBLIC_LAB_ADDRESS ||
    'Plot 42, Health City Enclave, Ring Road, New Delhi';
  const labPhone =
    [settings.primaryPhone, settings.secondaryPhone].filter(Boolean).join(' / ') ||
    process.env.NEXT_PUBLIC_LAB_PHONE ||
    '+91 98765 43210';
  const labLicense = settings.registrationNumber || process.env.NEXT_PUBLIC_LAB_LICENSE || 'DL-REG-2024-88492';

  const periodLabel =
    dateRange.from && dateRange.to
      ? `${formatISTDate(dateRange.from)} to ${formatISTDate(dateRange.to)}`
      : dateRange.from
      ? `From ${formatISTDate(dateRange.from)}`
      : dateRange.to
      ? `Up to ${formatISTDate(dateRange.to)}`
      : 'All Time (Lifetime Statement)';

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white text-slate-900">
      {/* Top Action Toolbar (Hidden during print) */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between no-print px-4">
        <Link
          href={`/doctors/${doctor._id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Doctor Dashboard</span>
        </Link>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
        >
          <Printer className="h-4 w-4" />
          <span>Print Statement (A4)</span>
        </button>
      </div>

      {/* A4 Statement Sheet */}
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-10 shadow-lg print:shadow-none print:p-4 border border-slate-200 print:border-none">
        {/* Lab Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5 text-center">
          {settings.logoUrl && (
            <div className="flex justify-center mb-2">
              <img
                src={settings.logoUrl}
                alt="Lab Logo"
                className="h-14 max-w-[120px] object-contain"
              />
            </div>
          )}
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900">
            {labName}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">{labAddress}</p>
          <p className="text-xs text-slate-500">Phone: {labPhone} • Reg / License: {labLicense}</p>
          <div className="mt-3 inline-block bg-slate-900 text-white text-[11px] font-bold px-4 py-1 rounded uppercase tracking-wider">
            Doctor Commission &amp; Referral Statement
          </div>
        </div>

        {/* Doctor & Statement Meta Grid */}
        <div className="grid grid-cols-2 gap-4 pb-4 mb-4 border-b border-slate-200 text-xs">
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Doctor Details
            </h3>
            <p className="font-bold text-sm text-slate-900">{doctor.name}</p>
            <p className="text-teal-800 font-semibold mt-0.5">
              {doctor.specialization} {doctor.qualification ? `(${doctor.qualification})` : ''}
            </p>
            <p className="text-slate-600 mt-1">
              Doctor ID: <span className="font-mono font-bold text-slate-800">{doctor.code}</span>
            </p>
            {doctor.mobile && <p className="text-slate-600">Mobile: {doctor.mobile}</p>}
            {doctor.clinicAddress && (
              <p className="text-slate-500 text-[11px] mt-0.5">{doctor.clinicAddress}</p>
            )}
            <p className="text-slate-600 mt-1">
              Configured Rate: <span className="font-semibold text-slate-900">{doctor.commissionPercent}%</span>
            </p>
          </div>

          <div className="text-right">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Statement Information
            </h3>
            <p className="text-slate-600">
              Statement Period: <strong className="text-slate-900">{periodLabel}</strong>
            </p>
            <p className="text-slate-600 mt-1">
              Generated On: <span className="font-medium text-slate-900">{formatISTDateTime(new Date())}</span>
            </p>
            <p className="text-slate-600 mt-1">
              Timezone Basis: <span className="font-mono text-slate-700">Asia/Kolkata (IST)</span>
            </p>
            <p className="text-slate-600 mt-1">
              Referring Status:{' '}
              <span
                className={`font-semibold ${
                  doctor.isActive ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                {doctor.isActive ? 'Active Partner' : 'Inactive'}
              </span>
            </p>
          </div>
        </div>

        {/* Financial Summary Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3">
            Financial &amp; Referral Summary ({periodLabel})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white p-2.5 rounded border border-slate-200">
              <span className="block text-[10px] uppercase font-semibold text-slate-500">
                Patients / Visits
              </span>
              <span className="text-base font-bold text-slate-900">
                {metrics.uniquePatientCount}{' '}
                <span className="text-xs font-normal text-slate-500">
                  pts ({metrics.eligibleVisitsCount} visits)
                </span>
              </span>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-200">
              <span className="block text-[10px] uppercase font-semibold text-slate-500">
                Eligible Test Volume
              </span>
              <span className="text-base font-bold text-slate-900">
                {formatCurrencyINR(metrics.totalEligibleAmount)}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-200">
              <span className="block text-[10px] uppercase font-semibold text-emerald-700">
                Commission Earned
              </span>
              <span className="text-base font-bold text-emerald-800">
                {formatCurrencyINR(metrics.totalCommissionEarned)}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-200">
              <span className="block text-[10px] uppercase font-semibold text-indigo-700">
                Period Payout
              </span>
              <span className="text-base font-bold text-indigo-800">
                {formatCurrencyINR(metrics.totalCommissionPaid)}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap justify-between items-center text-xs">
            <span className="text-slate-600">
              Lifetime Earned: <strong className="text-slate-900">{formatCurrencyINR(metrics.lifetimeEarned)}</strong>{' '}
              | Lifetime Paid: <strong className="text-slate-900">{formatCurrencyINR(metrics.lifetimePaid)}</strong>
            </span>
            <div className="text-right">
              <span className="text-slate-600 mr-2">Net Outstanding Due to Doctor:</span>
              <span className="text-base font-black text-rose-700">
                {formatCurrencyINR(metrics.outstandingCommission)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Itemized Referral Visits */}
        <div className="mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-200 pb-1 flex items-center justify-between">
            <span>1. Itemized Referred Visits ({visits.length})</span>
            <span className="text-[10px] font-normal text-slate-500 normal-case">
              * Commission is snapshotted per visit based on net test bill
            </span>
          </h4>

          {visits.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 italic">
              No patient visits referred during this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                    <th className="py-1.5 px-2 font-semibold">Date &amp; Time</th>
                    <th className="py-1.5 px-2 font-semibold">Visit #</th>
                    <th className="py-1.5 px-2 font-semibold">Patient</th>
                    <th className="py-1.5 px-2 font-semibold">Tests Ordered</th>
                    <th className="py-1.5 px-2 font-semibold text-right">Net Bill</th>
                    <th className="py-1.5 px-2 font-semibold text-center">Comm %</th>
                    <th className="py-1.5 px-2 font-semibold text-right">Commission</th>
                    <th className="py-1.5 px-2 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visits.map((v: any) => {
                    const isCancelled = v.status === 'cancelled';
                    const commRate = v.doctorSnapshot?.commissionPercent ?? doctor.commissionPercent;
                    const commAmount = v.doctorSnapshot?.commissionAmount ?? 0;
                    const netBill = v.doctorSnapshot?.eligibleAmount ?? v.billing?.netAmount ?? 0;

                    return (
                      <tr key={v._id} className={isCancelled ? 'bg-rose-50/40 text-slate-400 line-through' : ''}>
                        <td className="py-1.5 px-2 whitespace-nowrap text-slate-700">
                          {formatISTDateTime(v.visitDate)}
                        </td>
                        <td className="py-1.5 px-2 font-mono font-medium text-slate-900">
                          {v.visitId}
                        </td>
                        <td className="py-1.5 px-2">
                          <span className="font-semibold text-slate-900">
                            {v.patientSnapshot?.name || v.patient?.name || 'Walk-in'}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {v.patientSnapshot?.permanentId || v.patient?.patientId || ''}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-slate-600 max-w-[180px] truncate">
                          {v.tests?.map((t: any) => t.testCode || t.testName).join(', ') || '—'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium text-slate-800">
                          {formatCurrencyINR(netBill)}
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-600">
                          {commRate}%
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold text-emerald-800">
                          {isCancelled ? '₹0.00' : formatCurrencyINR(commAmount)}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                              isCancelled
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td colSpan={4} className="py-2 px-2 text-right uppercase text-[10px]">
                      Period Referral Totals:
                    </td>
                    <td className="py-2 px-2 text-right">
                      {formatCurrencyINR(metrics.totalEligibleAmount)}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-400">—</td>
                    <td className="py-2 px-2 text-right text-emerald-800">
                      {formatCurrencyINR(metrics.totalCommissionEarned)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Itemized Payouts & Commission Payments */}
        <div className="mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-200 pb-1">
            2. Commission Payouts &amp; Settlements ({payments.length})
          </h4>

          {payments.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 italic">
              No commission settlements recorded during this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                    <th className="py-1.5 px-2 font-semibold">Payment Date</th>
                    <th className="py-1.5 px-2 font-semibold">Reference #</th>
                    <th className="py-1.5 px-2 font-semibold">Payment Method</th>
                    <th className="py-1.5 px-2 font-semibold">Notes / Purpose</th>
                    <th className="py-1.5 px-2 font-semibold text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {payments.map((p: any) => (
                    <tr key={p._id}>
                      <td className="py-1.5 px-2 whitespace-nowrap text-slate-700">
                        {p.dateStringIST || formatISTDateTime(p.paymentDate)}
                      </td>
                      <td className="py-1.5 px-2 font-mono font-medium text-slate-900">
                        {p.referenceNumber || 'N/A'}
                        {p.isAdjustment && (
                          <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded">
                            Adj
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 uppercase text-slate-600 font-medium">
                        {p.paymentMethod?.replace('_', ' ')}
                      </td>
                      <td className="py-1.5 px-2 text-slate-500 text-[10px] max-w-[200px] truncate">
                        {p.notes || '—'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold text-slate-900">
                        {formatCurrencyINR(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td colSpan={4} className="py-2 px-2 text-right uppercase text-[10px]">
                      Total Payouts Settled:
                    </td>
                    <td className="py-2 px-2 text-right text-indigo-800">
                      {formatCurrencyINR(metrics.totalCommissionPaid)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Verification and Signature Block */}
        <div className="pt-8 mt-6 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-8 text-xs text-slate-600">
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto mb-2 pt-8"></div>
              <p className="font-bold text-slate-800">Prepared &amp; Verified By</p>
              <p className="text-[10px] text-slate-500">Accounts &amp; Billing In-Charge</p>
              <p className="text-[10px] text-slate-400">{labName}</p>
            </div>

            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto mb-2 pt-8"></div>
              <p className="font-bold text-slate-800">Doctor&apos;s Acknowledgement</p>
              <p className="text-[10px] text-slate-500">{doctor.name}</p>
              <p className="text-[10px] text-slate-400">Date &amp; Signature</p>
            </div>
          </div>

          <div className="mt-8 text-[10px] text-slate-400 text-center border-t border-slate-100 pt-3">
            This is a computer-generated account statement issued by {labName}. All referral commission computations are based on net test bill amounts and agreed commission parameters.
          </div>
        </div>
      </div>
    </div>
  );
}
