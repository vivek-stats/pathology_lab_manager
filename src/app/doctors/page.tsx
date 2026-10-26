'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  UserCheck,
  Search,
  Plus,
  Percent,
  Clock,
  Phone,
  Edit2,
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  IndianRupee,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DoctorFormModal } from '@/components/doctors/DoctorFormModal';
import { formatCurrencyINR } from '@/lib/timezone';
import { IDoctor } from '@/types';

export default function DoctorsPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Live suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<IDoctor | null>(null);

  const fetchDoctors = async (query = searchQuery, status = statusFilter) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (status !== 'all') params.set('status', status);

      const res = await fetch(`/api/doctors?${params.toString()}`);
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced live suggestions & table auto-filtering
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSuggesting(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set('q', trimmed);
        if (statusFilter !== 'all') params.set('status', statusFilter);

        const res = await fetch(`/api/doctors?${params.toString()}`);
        const data = await res.json();
        const results = data.doctors || [];
        setSuggestions(results.slice(0, 6));
        setShowSuggestions(true);

        // Also update directory table automatically
        fetchDoctors(trimmed, statusFilter);
      } catch (err) {
        console.error('Live doctor search error:', err);
      } finally {
        setIsSuggesting(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Refetch when status filter changes
  useEffect(() => {
    fetchDoctors(searchQuery, statusFilter);
  }, [statusFilter]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    fetchDoctors(searchQuery, statusFilter);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    fetchDoctors('', statusFilter);
  };

  const handleSelectSuggestion = (doc: any) => {
    setShowSuggestions(false);
    router.push(`/doctors/${doc._id}`);
  };

  const handleToggleStatus = async (doctor: any) => {
    try {
      const res = await fetch(`/api/doctors/${doctor._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !doctor.isActive }),
      });
      if (res.ok) {
        fetchDoctors(searchQuery, statusFilter);
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // High-level summary metrics across loaded doctors
  const totalDoctors = doctors.length;
  const activeDoctors = doctors.filter((d) => d.isActive).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-teal-600" />
            Referring Clinicians Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Doctor referral directory, individual commission configurations, and payment settlement ledgers.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingDoctor(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add Referring Doctor</span>
        </button>
      </div>

      {/* Referring Doctor Count Summary Card (Commission cards moved into individual doctor dashboards) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Referring Doctors Directory
          </p>
          <div className="flex items-baseline gap-3 mt-1">
            <h3 className="text-2xl font-extrabold text-slate-900">{totalDoctors}</h3>
            <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              {activeDoctors} Active in Referral Catalog
            </span>
            {totalDoctors - activeDoctors > 0 && (
              <span className="text-xs text-slate-500 font-medium">
                ({totalDoctors - activeDoctors} Inactive)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Referral commission analytics, transaction statements, and settlement ledgers are maintained inside each doctor&apos;s individual dashboard.
          </p>
        </div>
        <div className="p-3 bg-teal-50 rounded-xl text-teal-600 border border-teal-100 flex-shrink-0">
          <UserCheck className="h-7 w-7" />
        </div>
      </div>

      {/* Filter and Live Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          {/* Live Text Search with Floating Dropdown */}
          <div ref={searchContainerRef} className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Live search by Doctor Name, Code (e.g. DOC-001), Specialization, or Mobile..."
              value={searchQuery}
              onFocus={() => {
                if (searchQuery.trim() && suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Live Autocomplete Suggestions Dropdown */}
            {showSuggestions && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-80 overflow-y-auto divide-y divide-slate-100">
                {isSuggesting ? (
                  <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-teal-600" />
                    <span>Searching doctors...</span>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    No matching doctors found for &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <div>
                    <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Matching Doctors ({suggestions.length})</span>
                      <span className="text-[10px] text-teal-600 font-normal">Click to open dashboard</span>
                    </div>
                    {suggestions.map((doc) => (
                      <button
                        key={doc._id}
                        type="button"
                        onClick={() => handleSelectSuggestion(doc)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-teal-50/70 transition flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{doc.name}</span>
                            <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {doc.code || 'DOC'}
                            </span>
                            {!doc.isActive && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span className="text-teal-700 font-medium">{doc.specialization}</span>
                            {doc.qualification && <span>({doc.qualification})</span>}
                            {doc.mobile && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  {doc.mobile}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {doc.commissionPercent}%
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Doctors</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              Search
            </button>

            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-xs text-slate-500 hover:text-slate-800 underline px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </form>

        <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
          <span>
            Showing <strong className="text-slate-800">{doctors.length}</strong> doctors in directory
          </span>
          <span className="text-[11px] text-teal-700">
            Changing commission rates only affects future visits; past visits retain historical snapshots.
          </span>
        </div>
      </div>

      {/* Doctors Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Clock className="h-7 w-7 animate-spin mx-auto mb-2 text-teal-600" />
            <p className="text-xs">Loading doctors directory...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No Doctors Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery
                ? 'No doctors match your search query.'
                : 'Add your first referring physician to begin tracking referral commissions.'}
            </p>
            <button
              onClick={() => {
                setEditingDoctor(null);
                setIsModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 bg-teal-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-teal-700 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add First Doctor</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Doctor Code</th>
                  <th className="px-5 py-3">Doctor Name &amp; Specialization</th>
                  <th className="px-5 py-3">Contact Details</th>
                  <th className="px-5 py-3">Commission %</th>
                  <th className="px-5 py-3">Referrals</th>
                  <th className="px-5 py-3">Outstanding Balance</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctors.map((doctor) => (
                  <tr key={doctor._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Code */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {doctor.code || 'DOC'}
                      </span>
                    </td>

                    {/* Name & Specialization */}
                    <td className="px-5 py-4">
                      <Link
                        href={`/doctors/${doctor._id}`}
                        className="font-bold text-slate-900 hover:text-teal-700 text-xs transition block"
                      >
                        {doctor.name}
                      </Link>
                      <div className="text-[11px] text-teal-700 font-medium">
                        {doctor.specialization}
                        {doctor.qualification && (
                          <span className="text-slate-400 ml-1">({doctor.qualification})</span>
                        )}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-4 text-xs">
                      {doctor.mobile ? (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{doctor.mobile}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      {doctor.email && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{doctor.email}</div>
                      )}
                    </td>

                    {/* Commission Rate */}
                    <td className="px-5 py-4">
                      <span className="bg-teal-50 text-teal-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-teal-200 inline-flex items-center gap-0.5">
                        <Percent className="h-3 w-3" />
                        {doctor.commissionPercent}%
                      </span>
                    </td>

                    {/* Total Referrals */}
                    <td className="px-5 py-4 text-xs font-semibold text-slate-800">
                      {doctor.stats?.activeVisits ?? 0} visits
                    </td>

                    {/* Outstanding Balance */}
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs font-extrabold ${
                          doctor.stats?.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrencyINR(doctor.stats?.outstandingBalance)}
                      </span>
                      {doctor.stats?.outstandingBalance > 0 && (
                        <div className="text-[10px] text-slate-400">Due for payout</div>
                      )}
                    </td>

                    {/* Active Status Toggle */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleStatus(doctor)}
                        title="Click to toggle active status"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border transition ${
                          doctor.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {doctor.isActive ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions - Clear separate "View Dashboard" and "Edit" */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Dashboard Button */}
                        <Link
                          href={`/doctors/${doctor._id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg transition shadow-2xs"
                          title="Open Doctor Dashboard & Ledger"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Dashboard</span>
                        </Link>

                        {/* Edit Button */}
                        <button
                          onClick={() => {
                            setEditingDoctor(doctor);
                            setIsModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg transition"
                          title="Edit Doctor Details"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Doctor Modal */}
      <DoctorFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingDoctor}
        onSuccess={() => {
          fetchDoctors(searchQuery, statusFilter);
        }}
      />
    </div>
  );
}
