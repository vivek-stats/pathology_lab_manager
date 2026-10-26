'use client';

import React, { useEffect, useState } from 'react';
import { Printer, ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { formatISTDateTime, formatISTDate } from '@/lib/timezone';
import { ILabSettings, DEFAULT_LAB_SETTINGS } from '@/types';

export default function MedicalReportPrintPage({
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
        <p className="text-sm">Preparing official pathology report...</p>
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-base font-bold">Report not found</h2>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  const labName = settings.labName || process.env.NEXT_PUBLIC_LAB_NAME || 'Apex Diagnostics & Pathology Laboratory';
  const labTagline = settings.tagline || process.env.NEXT_PUBLIC_LAB_TAGLINE || 'Precision Diagnostics & Advanced Blood Testing';
  const labAddress =
    [settings.addressLine1, settings.addressLine2, settings.city, settings.state, settings.postalCode]
      .filter(Boolean)
      .join(', ') ||
    process.env.NEXT_PUBLIC_LAB_ADDRESS ||
    'Plot 42, Health City Enclave, Ring Road, New Delhi';
  const labPhone =
    [settings.primaryPhone, settings.secondaryPhone].filter(Boolean).join(' / ') ||
    process.env.NEXT_PUBLIC_LAB_PHONE ||
    '+91 98765 43210 / +91 11 2345 6789';
  const labLicense = settings.registrationNumber || process.env.NEXT_PUBLIC_LAB_LICENSE || 'DL-REG-2024-88492';
  const labAccreditation = settings.accreditation || 'ISO 15189:2022 STANDARDS';
  const reportHeader = settings.reportHeader || 'Official Medical Examination & Pathology Investigation Report';
  const reportFooter = settings.reportFooter || '*** End of Medical Examination Report • Generated via Apex Pathology Lab Management System ***';
  const signatoryName = settings.signatoryName || 'Dr. Vivek Sharma';
  const signatoryDesignation = settings.signatoryDesignation || 'MD (Pathology), Consultant Pathologist';

  // Group results by test name
  const testGroups: { [key: string]: any[] } = {};
  for (const r of visit.results || []) {
    const key = r.testName || 'Laboratory Test';
    if (!testGroups[key]) testGroups[key] = [];
    testGroups[key].push(r);
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white text-slate-900">
      {/* Print Action Toolbar (Hidden during print) */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between no-print px-4">
        <Link
          href={`/visits/${visit.visitId || visit._id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Visit</span>
        </Link>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow transition"
        >
          <Printer className="h-4 w-4" />
          <span>Print Lab Report (A4)</span>
        </button>
      </div>

      {/* A4 Paper Container */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-md print:shadow-none print:p-6 border border-slate-200 print:border-none min-h-[1050px] flex flex-col justify-between">
        <div>
          {/* Lab Header */}
          <div className="border-b-2 border-teal-700 pb-4 mb-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-start gap-4">
                {settings.logoUrl && (
                  <img
                    src={settings.logoUrl}
                    alt="Lab Logo"
                    className="h-16 max-w-[130px] object-contain border border-slate-200 rounded p-1"
                  />
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-teal-800 tracking-tight uppercase">
                    {labName}
                  </h1>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">{labTagline}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{labAddress}</p>
                  <p className="text-[11px] text-slate-500">Phone: {labPhone}</p>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-500 flex-shrink-0">
                <p className="font-semibold text-slate-700">Govt. Reg / Lic: {labLicense}</p>
                <p className="text-teal-700 font-bold mt-1">{labAccreditation}</p>
                {visit.resultRevisions && visit.resultRevisions.length > 0 && (
                  <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded mt-1 border border-amber-300">
                    REVISED REPORT (Rev #{visit.resultRevisions.length})
                  </span>
                )}
              </div>
            </div>

            {reportHeader && (
              <div className="mt-3 pt-2 border-t border-slate-100 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900">
                  {reportHeader}
                </span>
              </div>
            )}
          </div>

          {/* Patient Details Table */}
          <div className="bg-slate-50 border border-slate-200 rounded p-4 mb-6 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Patient Name
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {visit.patientSnapshot?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Permanent Patient ID
                </span>
                <span className="font-mono font-bold text-teal-800">
                  {visit.patientSnapshot?.permanentId}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Age / Gender
                </span>
                <span className="font-semibold text-slate-800 capitalize">
                  {visit.patientSnapshot?.age} {visit.patientSnapshot?.ageUnit} / {visit.patientSnapshot?.gender}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Lab Token / Daily Serial
                </span>
                <span className="font-bold text-slate-900">
                  #{visit.dailySerial} ({visit.visitId})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Referring Clinician
                </span>
                <span className="font-semibold text-slate-800">
                  {visit.doctorSnapshot?.name || 'Self / Direct'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Sample Registered
                </span>
                <span className="text-slate-700">
                  {formatISTDateTime(visit.visitDate)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Report Date (IST)
                </span>
                <span className="text-slate-700">
                  {formatISTDateTime(new Date())}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Status
                </span>
                <span className="font-bold uppercase text-emerald-700">
                  {visit.status === 'completed' ? 'Finalized / Verified' : visit.status}
                </span>
              </div>
            </div>
          </div>

          {/* Test Results Investigation Tables */}
          <div className="space-y-6">
            {Object.keys(testGroups).map((testTitle) => (
              <div key={testTitle} className="space-y-2">
                <div className="border-b-2 border-slate-800 pb-1">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    {testTitle}
                  </h3>
                </div>

                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 w-1/3">Investigation</th>
                      <th className="py-1.5 w-1/4">Observed Value</th>
                      <th className="py-1.5 w-1/6">Unit</th>
                      <th className="py-1.5 w-1/4 text-right">Reference Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {testGroups[testTitle].map((r: any, idx: number) => {
                      const isAbnormal =
                        r.status === 'high' || r.status === 'low' || r.status === 'abnormal';
                      return (
                        <tr key={idx} className={isAbnormal ? 'font-bold text-rose-700' : 'text-slate-700'}>
                          <td className="py-1.5 font-medium">{r.parameterName}</td>
                          <td className="py-1.5">
                            <span className={isAbnormal ? 'font-black' : ''}>
                              {r.value || 'Pending'}
                            </span>
                            {isAbnormal && (
                              <span className="ml-1 text-[10px] uppercase">
                                ({r.status})
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 text-slate-500 font-mono">{r.unit || '—'}</td>
                          <td className="py-1.5 text-right font-medium text-slate-600">
                            {r.normalRange || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Revision History Audit Box on Report */}
          {visit.resultRevisions && visit.resultRevisions.length > 0 && (
            <div className="mt-6 p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block mb-1">
                Clinical Revision History Audit:
              </span>
              <ul className="space-y-1">
                {visit.resultRevisions.map((rev: any, i: number) => (
                  <li key={i}>
                    • <strong>Rev #{rev.revisionNumber}</strong> ({formatISTDateTime(rev.savedAt)}) by {rev.savedBy}: <em>&ldquo;{rev.reasonForChange}&rdquo;</em>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer with Signatures */}
        <div className="pt-8 border-t border-slate-300 mt-12 text-xs">
          <div className="flex justify-between items-end pb-4">
            <div className="text-center">
              <div className="h-10 border-b border-dashed border-slate-400 w-40 mb-1" />
              <p className="font-semibold text-slate-800">Medical Lab Technician</p>
              <p className="text-[10px] text-slate-400">DMLT, Certified</p>
            </div>

            <div className="text-center">
              <div className="h-10 border-b border-dashed border-slate-400 w-44 mb-1" />
              <p className="font-semibold text-slate-800">{signatoryName}</p>
              <p className="text-[10px] text-slate-500">{signatoryDesignation}</p>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-2">
            {reportFooter}
          </div>
        </div>
      </div>
    </div>
  );
}
