'use client';

import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle, Save } from 'lucide-react';
import { IDoctor } from '@/types';
import { formatCurrencyINR } from '@/lib/timezone';

interface CorrectDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitId: string;
  currentDoctorId?: string;
  currentDoctorName?: string;
  netAmount: number;
  onSuccess: () => void;
}

export function CorrectDoctorModal({
  isOpen,
  onClose,
  visitId,
  currentDoctorId,
  currentDoctorName,
  netAmount,
  onSuccess,
}: CorrectDoctorModalProps) {
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(currentDoctorId || '');
  const [reason, setReason] = useState('');
  const [changedBy, setChangedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/doctors?status=active')
      .then((res) => res.json())
      .then((data) => {
        setDoctors(data.doctors || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedDoctor = doctors.find((d) => d._id === selectedDoctorId);
  const newRate = selectedDoctor ? selectedDoctor.commissionPercent : 0;
  const newCommission = Math.round(((netAmount * newRate) / 100) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for correcting the referring doctor association.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/visits/${visitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedDoctorId || null,
          doctorCorrectionReason: reason.trim(),
          changedBy: changedBy.trim() || 'Authorized Staff',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update referring doctor');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-teal-600" />
            <h3 className="font-bold text-slate-800 text-sm">Correct Referring Doctor Association</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Current Association
            </span>
            <p className="font-bold text-slate-900">{currentDoctorName || 'Self / Direct (No Commission)'}</p>
            <p className="text-slate-500 text-[11px]">
              Eligible Net Test Amount: <strong className="text-slate-800">{formatCurrencyINR(netAmount)}</strong>
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Correct Referring Clinician *
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="">Self / Direct (Walk-in without Referring Doctor)</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.specialization}) — Rate: {d.commissionPercent}%
                </option>
              ))}
            </select>
          </div>

          {/* New Snapshot Preview */}
          <div className="bg-teal-50/70 border border-teal-200 rounded-lg p-3 text-teal-900 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">
              New Commission Snapshot Preview
            </span>
            <div className="flex justify-between items-center text-xs">
              <span>Doctor Rate:</span>
              <strong className="font-mono">{newRate}%</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span>Recalculated Commission:</span>
              <strong className="text-emerald-800 text-sm font-bold">{formatCurrencyINR(newCommission)}</strong>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Reason for Correction *
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Reception mistakenly selected wrong doctor; verified from patient prescription slip."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Authorized Staff Name / Supervisor
            </label>
            <input
              type="text"
              value={changedBy}
              onChange={(e) => setChangedBy(e.target.value)}
              placeholder="e.g. Suman (Head Receptionist) or Admin"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{submitting ? 'Saving Correction...' : 'Apply Correction & Audit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
