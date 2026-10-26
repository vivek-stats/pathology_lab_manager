'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RegisterPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPatient: any) => void;
}

export function RegisterPatientModal({
  isOpen,
  onClose,
  onSuccess,
}: RegisterPatientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    ageUnit: 'years' as 'years' | 'months' | 'days',
    gender: 'male' as 'male' | 'female' | 'other',
    mobile: '',
    email: '',
    address: '',
    bloodGroup: '',
    emergencyContact: '',
    referredByDoctor: '',
  });

  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch active doctors for the referral dropdown
    setLoadingDoctors(true);
    fetch('/api/doctors?status=active')
      .then((res) => res.json())
      .then((data) => {
        if (data.doctors) {
          setDoctors(data.doctors);
        }
      })
      .catch((err) => {
        console.error('Failed to load active doctors catalog:', err);
      })
      .finally(() => {
        setLoadingDoctors(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  // Sensible max limits for age based on selected unit
  const maxAge =
    formData.ageUnit === 'years'
      ? 150
      : formData.ageUnit === 'months'
      ? 120
      : 365;

  const agePlaceholder =
    formData.ageUnit === 'years'
      ? '35'
      : formData.ageUnit === 'months'
      ? '6'
      : '15';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
        age: Number(formData.age),
        ageUnit: formData.ageUnit,
        gender: formData.gender,
      };

      if (formData.mobile.trim()) payload.mobile = formData.mobile.trim();
      if (formData.email.trim()) payload.email = formData.email.trim();
      if (formData.address.trim()) payload.address = formData.address.trim();
      if (formData.bloodGroup) payload.bloodGroup = formData.bloodGroup;
      if (formData.emergencyContact.trim()) payload.emergencyContact = formData.emergencyContact.trim();
      if (formData.referredByDoctor) payload.referredByDoctor = formData.referredByDoctor;

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register patient');
      }

      onSuccess(data.patient);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-teal-600" />
            <h3 className="font-bold text-slate-800">Register New Patient</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name - REQUIRED */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Patient Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Age, Unit, Gender - Age & Gender REQUIRED */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Age <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                max={maxAge}
                placeholder={agePlaceholder}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Age Unit
              </label>
              <select
                value={formData.ageUnit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ageUnit: e.target.value as 'years' | 'months' | 'days',
                  })
                }
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="years">Years</option>
                <option value="months">Months</option>
                <option value="days">Days</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sex / Gender <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.gender}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gender: e.target.value as 'male' | 'female' | 'other',
                  })
                }
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Mobile & Blood Group - OPTIONAL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Blood Group <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="">Select (Optional)</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          {/* Referred By Doctor - OPTIONAL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Referred By Doctor <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <select
              value={formData.referredByDoctor}
              onChange={(e) => setFormData({ ...formData, referredByDoctor: e.target.value })}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              disabled={loadingDoctors}
            >
              <option value="">Self / Direct (Not referred)</option>
              {doctors
                .filter((d) => d.isActive)
                .map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    {doc.name} {doc.code ? `(${doc.code})` : ''} {doc.specialization ? `— ${doc.specialization}` : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* Address - OPTIONAL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Residential Address <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="House, Street, Area, City"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

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
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
