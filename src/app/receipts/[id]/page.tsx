'use client';

import React, { useEffect, useState } from 'react';
import { Printer, ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { formatCurrencyINR, formatISTDateTime, formatISTDate } from '@/lib/timezone';
import { ILabSettings, DEFAULT_LAB_SETTINGS } from '@/types';

export default function ReceiptPrintPage({
  params,
}: {
  params: { id: string };
}) {
  const [visit, setVisit] = useState<any>(null);
  const [settings, setSettings] = useState<ILabSettings>(DEFAULT_LAB_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/visits/${params.id}`).then((res) => res.json()),
      fetch('/api/settings').then((res) => res.json()).catch(() => ({ settings: DEFAULT_LAB_SETTINGS })),
    ])
      .then(([visitData, settingsData]) => {
        if (visitData.error) throw new Error(visitData.error);
        setVisit(visitData.visit);
        if (settingsData?.settings) {
          setSettings(settingsData.settings);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-teal-600" />
        <p className="text-sm">Generating patient invoice &amp; receipt...</p>
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-base font-bold">Receipt not found</h2>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

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
  const receiptFooter =
    settings.receiptFooter ||
    'Thank you for choosing our pathology services. Please retain this receipt for test report collection.';
  const signatoryName = settings.signatoryName || 'Authorized Signatory';

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white text-slate-900">
      {/* Print Action Toolbar */}
      <div className="max-w-2xl mx-auto mb-4 flex items-center justify-between no-print px-4">
        <Link
          href={`/visits/${visit.visitId || visit._id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Visit</span>
        </Link>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-lg shadow transition"
        >
          <Printer className="h-4 w-4" />
          <span>Print Receipt</span>
        </button>
      </div>

      {/* Clean Receipt Container */}
      <div className="max-w-2xl mx-auto bg-white p-8 shadow-md print:shadow-none print:p-4 border border-slate-200 print:border-none">
        {/* Lab Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
          {settings.logoUrl && (
            <div className="flex justify-center mb-2">
              <img
                src={settings.logoUrl}
                alt="Lab Logo"
                className="h-14 max-w-[120px] object-contain"
              />
            </div>
          )}
          <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">
            {labName}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">{labAddress}</p>
          <p className="text-xs text-slate-500">Phone: {labPhone} • Reg: {labLicense}</p>
          <div className="mt-2 inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-0.5 rounded uppercase tracking-wider">
            Official Patient Receipt &amp; Invoice
          </div>
        </div>

        {/* Patient & Invoice Metadata */}
        <div className="grid grid-cols-2 gap-3 text-xs mb-4 pb-3 border-b border-slate-200">
          <div>
            <p>
              <strong className="text-slate-500">Receipt / Visit #:</strong>{' '}
              <span className="font-mono font-bold text-slate-800">{visit.visitId}</span>
            </p>
            <p className="mt-1">
              <strong className="text-slate-500">Daily Token:</strong>{' '}
              <span className="font-bold text-teal-800">#{visit.dailySerial}</span>
            </p>
            <p className="mt-1">
              <strong className="text-slate-500">Date &amp; Time (IST):</strong>{' '}
              <span>{formatISTDateTime(visit.visitDate)}</span>
            </p>
          </div>

          <div className="text-right">
            <p>
              <strong className="text-slate-500">Patient:</strong>{' '}
              <span className="font-bold text-slate-900">{visit.patientSnapshot?.name}</span>
            </p>
            <p className="mt-1">
              <strong className="text-slate-500">Permanent ID:</strong>{' '}
              <span className="font-mono font-semibold">{visit.patientSnapshot?.permanentId}</span>
            </p>
            <p className="mt-1">
              <strong className="text-slate-500">Age / Gender:</strong>{' '}
              <span>
                {visit.patientSnapshot?.age} {visit.patientSnapshot?.ageUnit} / {visit.patientSnapshot?.gender}
              </span>
            </p>
            <p className="mt-1">
              <strong className="text-slate-500">Doctor:</strong>{' '}
              <span>{visit.doctorSnapshot?.name || 'Self'}</span>
            </p>
          </div>
        </div>

        {/* Itemized Test List */}
        <div className="mb-4">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 uppercase text-[10px] text-slate-600 font-bold border-y border-slate-200">
              <tr>
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Test Name &amp; Code</th>
                <th className="py-2 px-3">Sample Type</th>
                <th className="py-2 px-3 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visit.tests.map((t: any, index: number) => (
                <tr key={index}>
                  <td className="py-2 px-3 text-slate-400">{index + 1}</td>
                  <td className="py-2 px-3 font-semibold text-slate-800">
                    <span className="font-mono mr-1 text-teal-700">[{t.code}]</span>
                    {t.name}
                  </td>
                  <td className="py-2 px-3 text-slate-500">{t.sampleType}</td>
                  <td className="py-2 px-3 text-right font-medium">
                    {formatCurrencyINR(t.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Outstanding Settlement */}
        <div className="border-t border-slate-300 pt-3 text-xs flex justify-end">
          <div className="w-64 space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrencyINR(visit.billing?.totalAmount)}</span>
            </div>
            {visit.billing?.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount Applied:</span>
                <span>- {formatCurrencyINR(visit.billing?.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
              <span>Net Payable:</span>
              <span>{formatCurrencyINR(visit.billing?.netAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-medium">
              <span>Amount Paid:</span>
              <span className="text-emerald-700 font-bold">{formatCurrencyINR(visit.billing?.paidAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t-2 border-slate-900 pt-1.5">
              <span>Balance Due:</span>
              <span className={visit.billing?.balanceAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                {formatCurrencyINR(visit.billing?.balanceAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment History Log */}
        {visit.billing?.payments && visit.billing.payments.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500">
            <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Payment History:
            </p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {visit.billing.payments.map((p: any, idx: number) => (
                <li key={idx}>
                  {formatCurrencyINR(p.amount)} via{' '}
                  <strong className="uppercase">{p.method}</strong> on {formatISTDateTime(p.date)}
                  {p.transactionRef ? ` (Ref: ${p.transactionRef})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer Signature */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div className="max-w-md">
            <p className="text-[11px] text-slate-600 font-medium">{receiptFooter}</p>
            <p className="text-[10px] text-slate-400 mt-1">Reports can be collected with this receipt token.</p>
          </div>
          <div className="text-center flex-shrink-0">
            <div className="h-8 border-b border-dashed border-slate-400 w-36 mb-1" />
            <p className="font-semibold text-slate-700">{signatoryName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
