'use client';

import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle } from 'lucide-react';
import { IDoctor } from '@/types';

interface DoctorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedDoctor: IDoctor) => void;
  initialData?: IDoctor | null;
}

export function DoctorFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: DoctorFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    qualification: '',
    specialization: 'General Physician',
    clinicAddress: '',
    mobile: '',
    email: '',
    commissionPercent: 10,
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        code: initialData.code || '',
        qualification: initialData.qualification || '',
        specialization: initialData.specialization || 'General Physician',
        clinicAddress: initialData.clinicAddress || '',
        mobile: initialData.mobile || '',
        email: initialData.email || '',
        commissionPercent: initialData.commissionPercent ?? 10,
        isActive: initialData.isActive ?? true,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        qualification: '',
        specialization: 'General Physician',
        clinicAddress: '',
        mobile: '',
        email: '',
        commissionPercent: 10,
        isActive: true,
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const isEditing = Boolean(initialData?._id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = isEditing ? `/api/doctors/${initialData?._id}` : '/api/doctors';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          commissionPercent: Number(formData.commissionPercent) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save doctor');
      }

      onSuccess(data.doctor);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-teal-600" />
            <h3 className="font-bold text-slate-800">
              {isEditing ? 'Edit Referring Doctor' : 'Add New Referring Doctor'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Doctor Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Rajesh Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Code and Qualification */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Doctor Code (Optional)
              </label>
              <input
                type="text"
                placeholder="Auto-assigned if blank"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Degree / Qualification
              </label>
              <input
                type="text"
                placeholder="e.g. MBBS, MD (Medicine)"
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Specialization & Commission Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specialization
              </label>
              <input
                type="text"
                placeholder="e.g. Consultant Physician"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Commission Rate (%) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="15"
                  value={formData.commissionPercent}
                  onChange={(e) => setFormData({ ...formData, commissionPercent: Number(e.target.value) })}
                  className="w-full text-sm px-3 py-2 pr-8 border border-slate-300 rounded-lg font-bold text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>
          </div>

          {/* Contact (Mobile & Email) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="doctor@hospital.org"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Clinic Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Clinic / Hospital Address
            </label>
            <input
              type="text"
              placeholder="Room 102, City Health Clinic, Main Road"
              value={formData.clinicAddress}
              onChange={(e) => setFormData({ ...formData, clinicAddress: e.target.value })}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Active Status Toggle */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div>
              <span className="text-xs font-semibold text-slate-800">Active Status</span>
              <p className="text-[11px] text-slate-400">
                Inactive doctors are hidden from the new visit referral dropdown.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
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
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditing ? 'Update Doctor' : 'Save Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
