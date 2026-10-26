'use client';

import React, { useState, useEffect } from 'react';
import { X, CalendarPlus, Check, AlertCircle, Search } from 'lucide-react';
import { formatCurrencyINR } from '@/lib/timezone';

interface BookVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  onSuccess: (newVisit: any) => void;
}

export function BookVisitModal({
  isOpen,
  onClose,
  patient,
  onSuccess,
}: BookVisitModalProps) {
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'net_banking'>('cash');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [testSearch, setTestSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (patient) {
      const docId =
        typeof patient.referredByDoctor === 'object'
          ? patient.referredByDoctor?._id
          : patient.referredByDoctor;
      setSelectedDoctorId(docId || '');
    }

    setLoading(true);
    Promise.all([
      fetch('/api/tests').then((r) => r.json()),
      fetch('/api/doctors?status=active').then((r) => r.json()),
    ])
      .then(([testData, doctorData]) => {
        setAvailableTests(testData.tests || []);
        setDoctors(doctorData.doctors || []);
      })
      .catch((err) => {
        setError('Failed to load tests or doctors catalog');
      })
      .finally(() => setLoading(false));
  }, [isOpen, patient]);

  if (!isOpen || !patient) return null;

  const toggleTest = (testId: string) => {
    if (selectedTestIds.includes(testId)) {
      setSelectedTestIds(selectedTestIds.filter((id) => id !== testId));
    } else {
      setSelectedTestIds([...selectedTestIds, testId]);
    }
  };

  const selectedTests = availableTests.filter((t) => selectedTestIds.includes(t._id));
  const subTotal = selectedTests.reduce((sum, t) => sum + (t.price || 0), 0);
  const netAmount = Math.max(0, subTotal - (discount || 0));
  const balance = Math.max(0, netAmount - (paidAmount || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTestIds.length === 0) {
      setError('Please select at least one lab test.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient._id || patient.patientId,
          doctorId: selectedDoctorId || null,
          testIds: selectedTestIds,
          discount: Number(discount) || 0,
          paidAmount: Number(paidAmount) || 0,
          paymentMethod,
          transactionRef: transactionRef || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to book visit');
      }

      onSuccess(data.visit);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTests = availableTests
    .filter((t) => t.isActive !== false)
    .filter(
      (t) =>
        t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
        t.code.toLowerCase().includes(testSearch.toLowerCase()) ||
        t.category.toLowerCase().includes(testSearch.toLowerCase())
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-teal-600" />
              Book Lab Visit / Tests
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Patient: <strong className="text-slate-800">{patient.name}</strong> ({patient.patientId || 'New'}) • {patient.gender}, {patient.age} {patient.ageUnit}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Referring Doctor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Referring Doctor / Clinician
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Self / Direct (No Commission)</option>
              {doctors
                .filter((doc) => doc.isActive)
                .map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    {doc.name} {doc.code ? `(${doc.code})` : ''} ({doc.specialization} - {doc.commissionPercent}%)
                  </option>
                ))}
            </select>
          </div>

          {/* Multiple Test Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Select Tests to Perform <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-teal-700 font-medium">
                {selectedTestIds.length} test(s) selected
              </span>
            </div>

            {/* Test Search Input */}
            <div className="relative mb-2">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tests by name, code (CBC, LFT...), or category..."
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50"
              />
            </div>

            {/* Tests Checkbox Grid */}
            <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto p-2 divide-y divide-slate-100 bg-white">
              {loading ? (
                <p className="text-center py-4 text-xs text-slate-400">Loading tests...</p>
              ) : filteredTests.length === 0 ? (
                <p className="text-center py-4 text-xs text-slate-400">No matching tests found</p>
              ) : (
                filteredTests.map((test) => {
                  const isChecked = selectedTestIds.includes(test._id);
                  return (
                    <div
                      key={test._id}
                      onClick={() => toggleTest(test._id)}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        isChecked ? 'bg-teal-50/70 text-teal-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isChecked ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300'
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="text-xs font-semibold">
                            <span className="font-mono text-teal-700 mr-2">[{test.code}]</span>
                            {test.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {test.category} • Sample: {test.sampleType}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {formatCurrencyINR(test.price)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Billing & Payment Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Billing &amp; Payment Breakdown
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Subtotal
                </label>
                <div className="text-sm font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                  {formatCurrencyINR(subTotal)}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={subTotal}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-300 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Net Amount
                </label>
                <div className="text-sm font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg">
                  {formatCurrencyINR(netAmount)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Paid Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={netAmount}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-300 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="card">Debit / Credit Card</option>
                  <option value="net_banking">Net Banking</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Outstanding Balance
                </label>
                <div
                  className={`text-sm font-bold px-3 py-1.5 rounded-lg border ${
                    balance > 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {formatCurrencyINR(balance)}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedTestIds.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Generating Daily Token...' : 'Confirm & Book Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
