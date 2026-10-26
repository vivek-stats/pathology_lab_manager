'use client';

import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Search,
  Calendar,
  Clock,
  FileText,
  Receipt,
  FlaskConical,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/Badge';
import { formatCurrencyINR, formatISTDate, formatISTTime, getTodayISTDateString } from '@/lib/timezone';

export default function VisitsPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(getTodayISTDateString());
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFilter) params.set('date', dateFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/visits?${params.toString()}`);
      const data = await res.json();
      setVisits(data.visits || []);
    } catch (err) {
      console.error('Failed to fetch visits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [dateFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVisits();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-teal-600" />
            Lab Visits &amp; Testing Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track daily patient serial tokens, enter lab test results, and manage billing.
          </p>
        </div>

        <Link
          href="/patients"
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-sm"
        >
          <span>Book Visit For Patient</span>
        </Link>
      </div>

      {/* Filter and Date Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Patient Name, ID, Mobile, or Visit Token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Date filter in IST */}
            <div className="relative">
              <Calendar className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Status dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Statuses</option>
              <option value="registered">Registered</option>
              <option value="sample_collected">Sample Collected</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed / Ready</option>
            </select>

            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              Search
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{visits.length}</strong> visits for{' '}
            <strong className="text-slate-800">{dateFilter || 'All Dates'}</strong> (IST)
          </span>
          {dateFilter === getTodayISTDateString() && (
            <span className="text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              Today&apos;s Lab Intake
            </span>
          )}
        </div>
      </div>

      {/* Visits Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Clock className="h-7 w-7 animate-spin mx-auto mb-2 text-teal-600" />
            <p className="text-sm font-medium">Loading lab visits...</p>
          </div>
        ) : visits.length === 0 ? (
          <div className="p-12 text-center">
            <FlaskConical className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No Visits Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are no visits matching this date or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Token #</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Tests Ordered</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Billing</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visits.map((visit) => (
                  <tr key={visit._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                          #{visit.dailySerial}
                        </span>
                        <div className="text-[11px] font-mono text-slate-400">
                          {formatISTTime(visit.visitDate)}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {visit.patientSnapshot?.name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-slate-600">
                          {visit.patientSnapshot?.permanentId}
                        </span>
                        <span>•</span>
                        <span>{visit.patientSnapshot?.mobile}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {visit.tests.map((t: any) => (
                          <span
                            key={t.code}
                            className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded border border-slate-200 font-medium"
                          >
                            {t.code}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={visit.status} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {formatCurrencyINR(visit.billing?.netAmount)}
                      </div>
                      <div className="text-xs mt-0.5">
                        {visit.billing?.balanceAmount > 0 ? (
                          <span className="text-rose-600 font-bold">
                            Due: {formatCurrencyINR(visit.billing.balanceAmount)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Fully Paid</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/visits/${visit.visitId || visit._id}`}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition"
                        >
                          Enter Results
                        </Link>
                        <Link
                          href={`/reports/${visit.visitId || visit._id}`}
                          target="_blank"
                          title="Print Lab Report (A4)"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        >
                          <FileText className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/receipts/${visit.visitId || visit._id}`}
                          target="_blank"
                          title="Print Receipt"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Receipt className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
