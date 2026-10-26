'use client';

import React, { useEffect, useState } from 'react';
import {
  Clock,
  ArrowLeft,
  FileText,
  Receipt,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  CreditCard,
  User,
  FlaskConical,
  Edit2,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { formatCurrencyINR, formatISTDateTime } from '@/lib/timezone';
import { CorrectDoctorModal } from '@/components/visits/CorrectDoctorModal';

export default function VisitDetailsPage({
  params,
}: {
  params: { visitId: string };
}) {
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results State
  const [resultsForm, setResultsForm] = useState<any[]>([]);
  const [reasonForChange, setReasonForChange] = useState('');
  const [enteredBy, setEnteredBy] = useState('Lab Technician');

  // Payment Recording State
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'net_banking'>('cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [isCorrectDoctorModalOpen, setIsCorrectDoctorModalOpen] = useState(false);

  const fetchVisit = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/visits/${params.visitId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load visit');

      setVisit(data.visit);
      setResultsForm(data.visit.results || []);
      if (data.visit.billing?.balanceAmount) {
        setPaymentAmount(data.visit.billing.balanceAmount);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisit();
  }, [params.visitId]);

  const handleResultValueChange = (index: number, val: string) => {
    const updated = [...resultsForm];
    updated[index].value = val;

    // Check against normal range if numeric
    const item = updated[index];
    if (val.trim() === '') {
      item.status = 'pending';
    } else {
      // Determine if within numerical bounds if available
      item.status = 'normal';
    }
    setResultsForm(updated);
  };

  const handleStatusChange = (index: number, newStatus: string) => {
    const updated = [...resultsForm];
    updated[index].status = newStatus;
    setResultsForm(updated);
  };

  const handleSaveResults = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const res = await fetch(`/api/visits/${params.visitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: resultsForm,
          reasonForChange: reasonForChange || undefined,
          enteredBy,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save results');

      setVisit(data.visit);
      setSaveSuccess(true);
      setReasonForChange('');
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || paymentAmount <= 0) return;

    setRecordingPayment(true);
    try {
      const res = await fetch(`/api/visits/${params.visitId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(paymentAmount),
          method: paymentMethod,
          transactionRef: transactionRef || undefined,
          receivedBy: 'Reception',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      fetchVisit();
      setTransactionRef('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRecordingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-slate-400">
        <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-teal-600" />
        <p className="text-sm font-medium">Loading visit order and test parameters...</p>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">Visit Not Found</h2>
        <Link href="/visits" className="text-xs text-teal-600 underline mt-2 block">
          Return to Visits Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/visits"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                Token #{visit.dailySerial}
              </h1>
              <span className="font-mono text-xs font-semibold text-slate-500">
                ({visit.visitId})
              </span>
              <StatusBadge status={visit.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registered on {formatISTDateTime(visit.visitDate)} (Asia/Kolkata)
            </p>
          </div>
        </div>

        {/* Print Buttons */}
        <div className="flex items-center gap-2">
          <Link
            href={`/reports/${visit.visitId || visit._id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm"
          >
            <FileText className="h-4 w-4" />
            <span>Print Report (A4)</span>
          </Link>
          <Link
            href={`/receipts/${visit.visitId || visit._id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm"
          >
            <Receipt className="h-4 w-4" />
            <span>Print Receipt</span>
          </Link>
        </div>
      </div>

      {/* Patient & Doctor Snapshot Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patient Details */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Patient Information
          </div>
          <div className="font-bold text-slate-900 text-base">
            {visit.patientSnapshot?.name}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            <span className="font-mono text-teal-700 font-semibold mr-1">
              {visit.patientSnapshot?.permanentId}
            </span>
            • {visit.patientSnapshot?.gender}, {visit.patientSnapshot?.age} {visit.patientSnapshot?.ageUnit}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Phone: {visit.patientSnapshot?.mobile}
          </div>
        </div>

        {/* Doctor Details */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Referring Clinician
              </span>
              <button
                type="button"
                onClick={() => setIsCorrectDoctorModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-900 font-semibold hover:underline"
              >
                <Edit2 className="h-3 w-3" />
                <span>Correct Doctor</span>
              </button>
            </div>
            <div className="font-bold text-slate-900 text-base">
              {visit.doctorSnapshot?.name || 'Self / Direct'}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Commission Rate:</span>
              <span className="font-semibold text-slate-800">
                {visit.doctorSnapshot?.commissionPercent || 0}%
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-between">
              <span>Commission Earned:</span>
              <span className="font-bold text-teal-700">
                {formatCurrencyINR(visit.doctorSnapshot?.commissionAmount || 0)}
              </span>
            </div>
          </div>

          {/* Audit History Pill if Doctor was Corrected */}
          {visit.doctorAuditTrail && visit.doctorAuditTrail.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-amber-800 bg-amber-50/60 p-2 rounded border border-amber-200/60">
              <span className="font-bold flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-amber-600" />
                <span>Correction Audit History ({visit.doctorAuditTrail.length})</span>
              </span>
              <p className="text-slate-600 mt-0.5 truncate" title={visit.doctorAuditTrail[visit.doctorAuditTrail.length - 1].reason}>
                Latest: {visit.doctorAuditTrail[visit.doctorAuditTrail.length - 1].reason}
              </p>
            </div>
          )}
        </div>

        {/* Billing Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Billing Summary
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Net Amount:</span>
            <span className="font-bold text-slate-900">
              {formatCurrencyINR(visit.billing?.netAmount)}
            </span>
          </div>
          <div className="flex items-baseline justify-between text-xs mt-1">
            <span className="text-emerald-700 font-medium">Paid:</span>
            <span className="font-semibold text-emerald-700">
              {formatCurrencyINR(visit.billing?.paidAmount)}
            </span>
          </div>
          <div className="flex items-baseline justify-between text-xs mt-1 pt-1 border-t border-slate-100">
            <span className="font-semibold text-slate-700">Balance Due:</span>
            <span className={`font-bold ${visit.billing?.balanceAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {formatCurrencyINR(visit.billing?.balanceAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Results Entry Form */}
      <form onSubmit={handleSaveResults} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-teal-600" />
              Pathology Test Parameter Results Entry
            </h2>
            <p className="text-xs text-slate-500">
              Input test findings, units, and specify parameter status (Normal, Low, High, Abnormal).
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Results Saved!
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save & Update Results'}</span>
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Investigation / Parameter</th>
                <th className="px-5 py-3">Observed Value</th>
                <th className="px-5 py-3">Unit</th>
                <th className="px-5 py-3">Reference Range</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resultsForm.map((item, idx) => (
                <tr key={`${item.testId}-${item.parameterName}-${idx}`} className="hover:bg-slate-50/60">
                  {/* Parameter Name & Test */}
                  <td className="px-5 py-3">
                    <div className="font-semibold text-slate-900 text-xs">
                      {item.parameterName}
                    </div>
                    <div className="text-[10px] text-teal-700 font-medium">
                      {item.testName}
                    </div>
                  </td>

                  {/* Value Input */}
                  <td className="px-5 py-3">
                    <input
                      type="text"
                      placeholder="Enter value"
                      value={item.value || ''}
                      onChange={(e) => handleResultValueChange(idx, e.target.value)}
                      className="w-36 text-xs px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </td>

                  {/* Unit */}
                  <td className="px-5 py-3 text-xs font-mono text-slate-600">
                    {item.unit || '—'}
                  </td>

                  {/* Normal Range */}
                  <td className="px-5 py-3 text-xs text-slate-600">
                    {item.normalRange || '—'}
                  </td>

                  {/* Status Dropdown */}
                  <td className="px-5 py-3">
                    <select
                      value={item.status || 'pending'}
                      onChange={(e) => handleStatusChange(idx, e.target.value)}
                      className={`text-xs px-2 py-1 rounded font-semibold border ${
                        item.status === 'normal'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : item.status === 'high' || item.status === 'low' || item.status === 'abnormal'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="low">Low</option>
                      <option value="abnormal">Abnormal</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Revision & Correction Log Footprint */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Change / Correction Note (Recorded in Revision Audit)
              </label>
              <input
                type="text"
                placeholder="e.g. Sample re-tested on auto-analyzer, corrected typographical entry"
                value={reasonForChange}
                onChange={(e) => setReasonForChange(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Technician / Pathologist Sign-off Name
              </label>
              <input
                type="text"
                value={enteredBy}
                onChange={(e) => setEnteredBy(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Revision History Section */}
      {visit.resultRevisions && visit.resultRevisions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            Result Revision History ({visit.resultRevisions.length} Revisions)
          </h3>
          <p className="text-xs text-slate-500">
            Audit trail of previous results saved for this visit.
          </p>
          <div className="space-y-2 mt-2">
            {visit.resultRevisions.map((rev: any, index: number) => (
              <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center justify-between text-slate-700 font-semibold">
                  <span>Revision #{rev.revisionNumber}</span>
                  <span className="font-normal text-slate-500">
                    {formatISTDateTime(rev.savedAt)} by {rev.savedBy}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">
                  Reason: <em>{rev.reasonForChange}</em>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settle Balance / Add Payment Section */}
      {visit.billing?.balanceAmount > 0 && (
        <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-rose-600" />
                Record Payment / Settle Outstanding Balance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Outstanding balance on this visit order is{' '}
                <strong className="text-rose-600">{formatCurrencyINR(visit.billing?.balanceAmount)}</strong>.
              </p>
            </div>
          </div>

          <form onSubmit={handleRecordPayment} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                max={visit.billing.balanceAmount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full text-sm font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI / QR Code</option>
                <option value="card">Debit / Credit Card</option>
                <option value="net_banking">Net Banking</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Txn Ref (Optional)
              </label>
              <input
                type="text"
                placeholder="UPI Ref / Card Last 4"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={recordingPayment || !paymentAmount}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {recordingPayment ? 'Recording...' : 'Record Payment'}
            </button>
          </form>
        </div>
      )}
      {/* Correct Referring Doctor Modal */}
      {isCorrectDoctorModalOpen && (
        <CorrectDoctorModal
          isOpen={isCorrectDoctorModalOpen}
          onClose={() => setIsCorrectDoctorModalOpen(false)}
          visitId={visit.visitId || visit._id}
          currentDoctorId={visit.doctorSnapshot?.doctorId}
          currentDoctorName={visit.doctorSnapshot?.name}
          netAmount={visit.billing?.netAmount || 0}
          onSuccess={() => fetchVisit()}
        />
      )}
    </div>
  );
}
