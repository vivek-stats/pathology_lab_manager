'use client';

import React, { useState } from 'react';
import { X, IndianRupee, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { formatCurrencyINR } from '@/lib/timezone';

interface RecordDoctorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  doctorName: string;
  outstandingBalance: number;
  onSuccess: (paymentResult: any) => void;
}

export function RecordDoctorPaymentModal({
  isOpen,
  onClose,
  doctorId,
  doctorName,
  outstandingBalance,
  onSuccess,
}: RecordDoctorPaymentModalProps) {
  const [amount, setAmount] = useState<number | string>(outstandingBalance > 0 ? outstandingBalance : '');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'upi' | 'cash' | 'cheque'>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isAdjustment, setIsAdjustment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const numAmount = Number(amount) || 0;
  const isOverpayment = numAmount > outstandingBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (isOverpayment && !isAdjustment) {
      setError(
        `Payment amount (₹${numAmount}) exceeds the current outstanding commission of ${formatCurrencyINR(
          outstandingBalance
        )}. Check "Allow Ledger Balance Adjustment" if you intend to record an advance or manual balance credit.`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/doctors/${doctorId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          paymentMethod,
          referenceNumber: referenceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
          isAdjustment,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record commission payment');
      }

      onSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
              Record Commission Payout
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Doctor: <strong className="text-slate-800">{doctorName}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Outstanding Banner */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Outstanding Balance Due
              </span>
              <span className="text-lg font-extrabold text-slate-900">
                {formatCurrencyINR(outstandingBalance)}
              </span>
            </div>
            {outstandingBalance > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAmount(outstandingBalance);
                  setError(null);
                }}
                className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-2.5 py-1 rounded"
              >
                Pay Full
              </button>
            )}
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              step="any"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
              className="w-full text-sm font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="bank_transfer">Direct Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="upi">UPI / QR Code</option>
              <option value="cheque">Bank Cheque</option>
              <option value="cash">Cash Settlement</option>
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transaction Reference / Cheque #
            </label>
            <input
              type="text"
              placeholder="e.g. UTR-998231002, CHQ-00123"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Memo / Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Commission settlement for October referrals"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Overpayment / Adjustment Warning & Checkbox */}
          {isOverpayment && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>Amount exceeds current outstanding balance!</span>
              </div>
              <label className="flex items-start gap-2 cursor-pointer text-amber-800">
                <input
                  type="checkbox"
                  checked={isAdjustment}
                  onChange={(e) => setIsAdjustment(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                />
                <span>
                  Allow Ledger Balance Adjustment / Advance (authorizes payout exceeding current earned referrals)
                </span>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || numAmount <= 0}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
