'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  Calendar,
  UserPlus,
  CalendarPlus,
  RefreshCw,
  AlertCircle,
  Phone,
  Eye,
  UserCheck,
  X,
} from 'lucide-react';
import { RegisterPatientModal } from '@/components/patients/RegisterPatientModal';
import { BookVisitModal } from '@/components/visits/BookVisitModal';
import { DbStatusBanner } from '@/components/common/DbStatusBanner';
import { formatISTDate } from '@/lib/timezone';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(true);
  const [dbMessage, setDbMessage] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Live suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isBookVisitOpen, setIsBookVisitOpen] = useState(false);
  const [selectedPatientForVisit, setSelectedPatientForVisit] = useState<any>(null);

  const fetchPatients = async (query = searchQuery, date = selectedDate, targetPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (date) params.set('date', date);
      params.set('page', String(targetPage));
      params.set('limit', '15');

      const res = await fetch(`/api/patients?${params.toString()}`);
      const data = await res.json();

      setDbConnected(data.dbConnected ?? true);
      setDbMessage(data.message);

      if (data.patients) {
        setPatients(data.patients);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err);
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
        const res = await fetch(`/api/patients?q=${encodeURIComponent(trimmed)}&limit=6`);
        const data = await res.json();
        setSuggestions(data.patients || []);
        setShowSuggestions(true);

        // Also update the underlying table automatically
        setPage(1);
        fetchPatients(trimmed, selectedDate, 1);
      } catch (err) {
        console.error('Live search error:', err);
      } finally {
        setIsSuggesting(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initial load or page / date change
  useEffect(() => {
    fetchPatients(searchQuery, selectedDate, page);
  }, [page, selectedDate]);

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
    setPage(1);
    fetchPatients(searchQuery, selectedDate, 1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDate('');
    setSuggestions([]);
    setShowSuggestions(false);
    setPage(1);
    fetchPatients('', '', 1);
  };

  const handleSelectSuggestion = (patient: any) => {
    setShowSuggestions(false);
    router.push(`/patients/${patient.patientId || patient._id}`);
  };

  const handlePatientRegistered = (newPatient: any) => {
    fetchPatients('', '', 1);
    setSelectedPatientForVisit(newPatient);
    setIsBookVisitOpen(true);
  };

  const handleVisitBooked = (visit: any) => {
    router.push(`/visits/${visit.visitId || visit._id}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Database Diagnostic Alert */}
      <DbStatusBanner dbConnected={dbConnected} errorMessage={dbMessage} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-teal-600" />
            Patient Directory &amp; Registration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search permanent patient records, review clinical visit histories, and register new patients.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          <span>New Patient Registration</span>
        </button>
      </div>

      {/* Filter and Live Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Live Text Search with Floating Dropdown */}
          <div ref={searchContainerRef} className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Live search by Name, Permanent ID (e.g. PAT-202610-0001), or Mobile..."
              value={searchQuery}
              onFocus={() => {
                if (searchQuery.trim() && suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Live Autocomplete Suggestions Dropdown */}
            {showSuggestions && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-80 overflow-y-auto divide-y divide-slate-100">
                {isSuggesting ? (
                  <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-teal-600" />
                    <span>Searching matching patients...</span>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    No matching patient records found for &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <div>
                    <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Matching Patients ({suggestions.length})</span>
                      <span className="text-[10px] text-teal-600 font-normal">Click to open 360 profile</span>
                    </div>
                    {suggestions.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => handleSelectSuggestion(p)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-teal-50/70 transition flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{p.name}</span>
                            <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                              {p.patientId}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span className="capitalize">{p.gender}, {p.age} {p.ageUnit}</span>
                            {p.mobile && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  {p.mobile}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {p.referredByDoctorName || 'Self / Direct'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date Filter (IST) */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="date"
                title="Filter by Registration Date (IST)"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-700 font-medium"
              />
            </div>

            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition"
            >
              Search
            </button>

            {(searchQuery || selectedDate) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-slate-500 hover:text-slate-800 underline px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </form>

        {/* Status subheader */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{patients.length}</strong> of{' '}
            <strong className="text-slate-800">{totalCount}</strong> registered patients
          </span>
          {selectedDate && (
            <span className="text-teal-700 font-medium">
              Filtered for IST Date: {selectedDate}
            </span>
          )}
        </div>
      </div>

      {/* Patient Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-2 text-teal-600" />
            <p className="text-sm font-medium">Fetching patient directory...</p>
          </div>
        ) : !dbConnected ? (
          <div className="p-12 text-center">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-slate-800">Persistent Storage Required</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Please connect your MongoDB database in <code>.env.local</code> to save and search patient records.
            </p>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Patients Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery || selectedDate
                ? 'No patient records matched your search query or date filter.'
                : 'No patients have been registered in the system yet.'}
            </p>
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="mt-4 inline-flex items-center gap-2 bg-teal-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-teal-700 shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register First Patient</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Permanent ID</th>
                  <th className="px-5 py-3">Patient Name</th>
                  <th className="px-5 py-3">Age / Gender</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Referred By</th>
                  <th className="px-5 py-3">Registered (IST)</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((patient) => (
                  <tr key={patient._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Permanent Patient ID */}
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-1 rounded border border-teal-200">
                        {patient.patientId}
                      </span>
                    </td>

                    {/* Patient Name */}
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/patients/${patient.patientId || patient._id}`}
                        className="font-semibold text-slate-900 hover:text-teal-700 transition"
                      >
                        {patient.name}
                      </Link>
                      {patient.address && (
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">
                          {patient.address}
                        </p>
                      )}
                    </td>

                    {/* Age & Gender */}
                    <td className="px-5 py-3.5">
                      <span className="capitalize text-slate-800 font-medium">
                        {patient.age} {patient.ageUnit}
                      </span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="capitalize text-slate-500">{patient.gender}</span>
                    </td>

                    {/* Mobile */}
                    <td className="px-5 py-3.5">
                      {patient.mobile ? (
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{patient.mobile}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                      {patient.email && (
                        <p className="text-[11px] text-slate-400">{patient.email}</p>
                      )}
                    </td>

                    {/* Referred By (Doctor Name or Self / Direct) */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                          patient.referredByDoctorName &&
                          patient.referredByDoctorName !== 'Self / Direct'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <UserCheck className="h-3 w-3" />
                        <span>{patient.referredByDoctorName || 'Self / Direct'}</span>
                      </span>
                    </td>

                    {/* Registration Date */}
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {formatISTDate(patient.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Book Visit Button */}
                        <button
                          onClick={() => {
                            setSelectedPatientForVisit(patient);
                            setIsBookVisitOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition"
                          title="Order Tests & Book Visit"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                          <span>Book Visit</span>
                        </button>

                        {/* View 360 Profile */}
                        <Link
                          href={`/patients/${patient.patientId || patient._id}`}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="View Patient Profile & History"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 bg-slate-50">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <RegisterPatientModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={handlePatientRegistered}
      />

      {selectedPatientForVisit && (
        <BookVisitModal
          isOpen={isBookVisitOpen}
          onClose={() => {
            setIsBookVisitOpen(false);
            setSelectedPatientForVisit(null);
          }}
          patient={selectedPatientForVisit}
          onSuccess={handleVisitBooked}
        />
      )}
    </div>
  );
}
