'use client';

import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  Calendar,
  Clock,
  ArrowLeft,
  Users,
  CalendarCheck,
  FlaskConical,
  CreditCard,
  IndianRupee,
  TrendingUp,
  Percent,
  FileText,
  Printer,
  PlusCircle,
  Phone,
  Mail,
  MapPin,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { DoctorFormModal } from '@/components/doctors/DoctorFormModal';
import { RecordDoctorPaymentModal } from '@/components/doctors/RecordDoctorPaymentModal';
import { formatCurrencyINR, formatISTDate, formatISTDateTime, formatISTTime } from '@/lib/timezone';
import { IDoctor, IDoctorDashboardMetrics } from '@/types';

export default function DoctorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [data, setData] = useState<IDoctorDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date & Status filters in Asia/Kolkata
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'unsettled' | 'settled' | 'cancelled'>('all');
  const [activeTab, setActiveTab] = useState<'visits' | 'ledger'>('visits');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  const fetchDoctorDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const searchParams = new URLSearchParams();
      if (fromDate) searchParams.set('from', fromDate);
      if (toDate) searchParams.set('to', toDate);

      const res = await fetch(`/api/doctors/${params.id}?${searchParams.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load doctor dashboard');

      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorDashboard();
  }, [params.id, fromDate, toDate]);

  const handleClearDateFilters = () => {
    setFromDate('');
    setToDate('');
  };

  const handleSetQuickPreset = (preset: 'today' | 'month' | 'all') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (preset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'month') {
      const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      setFromDate(monthStart);
      setToDate(todayStr);
    } else {
      setFromDate('');
      setToDate('');
    }
  };

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center text-slate-400">
        <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-teal-600" />
        <p className="text-sm font-medium">Loading clinician dashboard &amp; referral metrics...</p>
      </div>
    );
  }

  if (error || !data?.doctor) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">Doctor Profile Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">{error || 'Could not locate referring doctor.'}</p>
        <Link href="/doctors" className="text-xs text-teal-600 underline mt-3 inline-block">
          Return to Doctors Directory
        </Link>
      </div>
    );
  }

  const { doctor, metrics, visits, payments } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <Link
          href="/doctors"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Doctors</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-3 py-2 rounded-lg transition shadow-xs"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit Profile</span>
          </button>

          <Link
            href={`/doctors/${doctor._id}/statement${fromDate || toDate ? `?from=${fromDate}&to=${toDate}` : ''}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Commission Statement</span>
          </Link>

          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
          >
            <IndianRupee className="h-4 w-4" />
            <span>Record Commission Payout</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {alertSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{alertSuccess}</span>
          </div>
          <button onClick={() => setAlertSuccess(null)} className="text-emerald-700 font-bold ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Doctor Bio Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{doctor.name}</h1>
              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                {doctor.code || 'DOC'}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                  doctor.isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {doctor.isActive ? 'Active Referring' : 'Inactive'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600">
              <span className="font-semibold text-teal-800">
                {doctor.specialization}
                {doctor.qualification ? ` (${doctor.qualification})` : ''}
              </span>
              <span>•</span>
              <span className="bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded border border-teal-200">
                Current Commission: {doctor.commissionPercent}%
              </span>
              {doctor.mobile && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {doctor.mobile}
                  </span>
                </>
              )}
              {doctor.email && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {doctor.email}
                  </span>
                </>
              )}
            </div>

            {doctor.clinicAddress && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span>{doctor.clinicAddress}</span>
              </div>
            )}
          </div>

          <div className="text-right text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="block text-[11px] font-semibold uppercase text-slate-400">
              Net Outstanding Commission Due
            </span>
            <span
              className={`text-xl font-black mt-0.5 block ${
                metrics.outstandingCommission > 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {formatCurrencyINR(metrics.outstandingCommission)}
            </span>
            <span className="text-[10px] text-slate-400">
              Lifetime Earned: {formatCurrencyINR(metrics.lifetimeEarned)} • Paid: {formatCurrencyINR(metrics.lifetimePaid)}
            </span>
          </div>
        </div>
      </div>

      {/* Date Filter Toolbar (Asia/Kolkata) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-teal-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Filter by Referral Period (Asia/Kolkata)
            </span>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => handleSetQuickPreset('today')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition"
            >
              Today
            </button>
            <button
              onClick={() => handleSetQuickPreset('month')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition"
            >
              This Month
            </button>
            <button
              onClick={() => handleSetQuickPreset('all')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition"
            >
              All Time
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-medium text-slate-600">From:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium text-slate-700"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-medium text-slate-600">To:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium text-slate-700"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-medium text-slate-600">Ledger Status:</label>
            <select
              value={paymentStatusFilter}
              onChange={(e: any) => setPaymentStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium text-slate-700 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="unsettled">Due / Outstanding</option>
              <option value="settled">Settled / Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {(fromDate || toDate) && (
            <button
              onClick={handleClearDateFilters}
              className="text-xs text-rose-600 hover:text-rose-800 underline font-medium"
            >
              Clear Filter
            </button>
          )}

          <div className="ml-auto text-[11px] text-slate-400">
            {fromDate || toDate
              ? `Filtered for: ${fromDate || 'Start'} to ${toDate || 'End'} (IST)`
              : 'Showing all-time referral performance'}
          </div>
        </div>
      </div>

      {/* 7 Required Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Metric 1: Unique Referred Patients */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Unique Patients
          </span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">
            {metrics.uniquePatientCount}
          </span>
          <span className="text-[10px] text-teal-600 font-medium">Distinct Individuals</span>
        </div>

        {/* Metric 2: Total Visits Referred */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Visits
          </span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">
            {metrics.totalVisitsCount}
          </span>
          <span className="text-[10px] text-slate-400">
            {metrics.cancelledVisitsCount > 0 ? `${metrics.cancelledVisitsCount} cancelled` : 'All valid'}
          </span>
        </div>

        {/* Metric 3: Number of Tests Ordered */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Tests Ordered
          </span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">
            {metrics.totalTestsCount}
          </span>
          <span className="text-[10px] text-blue-600 font-medium">Lab Investigations</span>
        </div>

        {/* Metric 4: Total Eligible Test Amount */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Eligible Amount
          </span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">
            {formatCurrencyINR(metrics.totalEligibleAmount)}
          </span>
          <span className="text-[10px] text-slate-400">Net Test Revenue</span>
        </div>

        {/* Metric 5: Commission Earned */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Commission Earned
          </span>
          <span className="text-xl font-extrabold text-teal-700 mt-1 block">
            {formatCurrencyINR(metrics.totalCommissionEarned)}
          </span>
          <span className="text-[10px] text-slate-400">Snapshotted Rates</span>
        </div>

        {/* Metric 6: Commission Paid */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Commission Paid
          </span>
          <span className="text-xl font-extrabold text-emerald-700 mt-1 block">
            {formatCurrencyINR(metrics.totalCommissionPaid)}
          </span>
          <span className="text-[10px] text-slate-400">Period Payouts</span>
        </div>

        {/* Metric 7: Outstanding Commission */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Outstanding Due
          </span>
          <span
            className={`text-xl font-extrabold mt-1 block ${
              metrics.outstandingCommission > 0 ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {formatCurrencyINR(metrics.outstandingCommission)}
          </span>
          <span className="text-[10px] text-slate-400">Net Payable</span>
        </div>
      </div>

      {/* Tabs Section: Referral History vs Commission Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-6">
          <button
            onClick={() => setActiveTab('visits')}
            className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'visits'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarCheck className="h-4 w-4" />
            <span>Commission Ledger &amp; Referrals ({visits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'ledger'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <IndianRupee className="h-4 w-4" />
            <span>Disbursement Vouchers ({payments.length})</span>
          </button>
        </div>

        {/* Tab 1: Commission Ledger Table */}
        {activeTab === 'visits' && (() => {
          // Calculate per-visit settlement status in the commission ledger using chronological allocation
          const sortedChronological = [...visits]
            .filter((v) => v.status !== 'cancelled')
            .sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime());

          let remainingPaid = metrics.lifetimePaid;
          const visitSettlementMap = new Map<string, { paid: number; outstanding: number; status: 'settled' | 'partial' | 'unpaid' }>();

          for (const v of sortedChronological) {
            const earned = v.doctorSnapshot?.commissionAmount ?? 0;
            if (remainingPaid >= earned) {
              visitSettlementMap.set(String(v._id), { paid: earned, outstanding: 0, status: 'settled' });
              remainingPaid -= earned;
            } else if (remainingPaid > 0) {
              visitSettlementMap.set(String(v._id), {
                paid: Math.round(remainingPaid * 100) / 100,
                outstanding: Math.round((earned - remainingPaid) * 100) / 100,
                status: 'partial',
              });
              remainingPaid = 0;
            } else {
              visitSettlementMap.set(String(v._id), { paid: 0, outstanding: earned, status: 'unpaid' });
            }
          }

          const filteredVisits = visits.filter((v) => {
            if (paymentStatusFilter === 'all') return true;
            if (paymentStatusFilter === 'cancelled') return v.status === 'cancelled';
            if (v.status === 'cancelled') return false;

            const st = visitSettlementMap.get(String(v._id));
            if (paymentStatusFilter === 'settled') return st?.status === 'settled';
            if (paymentStatusFilter === 'unsettled') return st?.status === 'unpaid' || st?.status === 'partial';
            return true;
          });

          return (
            <div>
              {filteredVisits.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <CalendarCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-800">No Ledger Entries Match Filters</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Try adjusting the Date Range or Ledger Status filters to view referral commission records.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3">Date (IST)</th>
                        <th className="px-5 py-3">Visit ID / Token</th>
                        <th className="px-5 py-3">Patient Reference</th>
                        <th className="px-5 py-3">Eligible Test Amount</th>
                        <th className="px-5 py-3">Rate</th>
                        <th className="px-5 py-3">Commission Earned</th>
                        <th className="px-5 py-3">Amount Paid</th>
                        <th className="px-5 py-3">Outstanding</th>
                        <th className="px-5 py-3">Payment Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVisits.map((v) => {
                        const isCancelled = v.status === 'cancelled';
                        const settlement = visitSettlementMap.get(String(v._id));
                        const earned = isCancelled ? 0 : (v.doctorSnapshot?.commissionAmount ?? 0);
                        const paid = isCancelled ? 0 : (settlement?.paid ?? 0);
                        const outstanding = isCancelled ? 0 : (settlement?.outstanding ?? earned);

                        return (
                          <tr key={v._id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Date */}
                            <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                              <div className="font-semibold text-slate-800">{formatISTDate(v.visitDate)}</div>
                              <div className="text-[11px] text-slate-400">{formatISTTime(v.visitDate)}</div>
                            </td>

                            {/* Visit ID & Daily Token */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="h-6 w-6 rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] inline-flex items-center justify-center">
                                  #{v.dailySerial}
                                </span>
                                <span className="text-[11px] font-mono font-semibold text-slate-900">
                                  {v.visitId}
                                </span>
                              </div>
                            </td>

                            {/* Patient Reference */}
                            <td className="px-5 py-3.5">
                              <Link
                                href={`/patients/${v.patientSnapshot?.permanentId || v.patient?._id}`}
                                className="font-bold text-slate-900 hover:text-teal-700 text-xs transition"
                              >
                                {v.patientSnapshot?.name}
                              </Link>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-slate-600 font-medium">
                                  {v.patientSnapshot?.permanentId}
                                </span>
                                <span>•</span>
                                <span>{v.patientSnapshot?.gender}, {v.patientSnapshot?.age} {v.patientSnapshot?.ageUnit}</span>
                              </div>
                            </td>

                            {/* Eligible Test Amount */}
                            <td className="px-5 py-3.5 font-semibold text-slate-900 text-xs">
                              {formatCurrencyINR(v.doctorSnapshot?.eligibleAmount ?? v.billing?.netAmount)}
                            </td>

                            {/* Commission Rate */}
                            <td className="px-5 py-3.5">
                              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded border border-slate-200">
                                {v.doctorSnapshot?.commissionPercent ?? doctor.commissionPercent}%
                              </span>
                            </td>

                            {/* Commission Earned */}
                            <td className="px-5 py-3.5">
                              <span
                                className={`text-xs font-extrabold ${
                                  isCancelled ? 'text-slate-400 line-through' : 'text-teal-700'
                                }`}
                              >
                                {isCancelled ? '₹0.00' : formatCurrencyINR(earned)}
                              </span>
                            </td>

                            {/* Amount Paid */}
                            <td className="px-5 py-3.5 text-xs font-semibold text-indigo-700">
                              {isCancelled ? '—' : formatCurrencyINR(paid)}
                            </td>

                            {/* Outstanding */}
                            <td className="px-5 py-3.5 text-xs font-bold">
                              {isCancelled ? (
                                <span className="text-slate-400">—</span>
                              ) : outstanding > 0 ? (
                                <span className="text-rose-600">{formatCurrencyINR(outstanding)}</span>
                              ) : (
                                <span className="text-emerald-700">₹0.00</span>
                              )}
                            </td>

                            {/* Payment Status */}
                            <td className="px-5 py-3.5">
                              {isCancelled ? (
                                <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded uppercase">
                                  Cancelled
                                </span>
                              ) : settlement?.status === 'settled' ? (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded uppercase">
                                  Settled
                                </span>
                              ) : settlement?.status === 'partial' ? (
                                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded uppercase">
                                  Partial
                                </span>
                              ) : (
                                <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-bold px-2 py-0.5 rounded uppercase">
                                  Due
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3.5 text-right">
                              <Link
                                href={`/visits/${v.visitId || v._id}`}
                                className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded transition"
                              >
                                View Visit
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* Tab 2: Commission Payment Ledger */}
        {activeTab === 'ledger' && (
          <div>
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">
                Showing all recorded commission settlements and payout vouchers for this clinician.
              </span>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New Payout Entry</span>
              </button>
            </div>

            {payments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <IndianRupee className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800">No Commission Payouts Recorded Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When you settle commissions with this doctor, record the transaction details here.
                </p>
                {metrics.outstandingCommission > 0 && (
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm"
                  >
                    <IndianRupee className="h-4 w-4" />
                    <span>Settle Due Balance ({formatCurrencyINR(metrics.outstandingCommission)})</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Payment Date (IST)</th>
                      <th className="px-5 py-3">Payout Amount</th>
                      <th className="px-5 py-3">Payment Method</th>
                      <th className="px-5 py-3">Reference / Txn #</th>
                      <th className="px-5 py-3">Notes / Memo</th>
                      <th className="px-5 py-3 text-right">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-800">
                          {formatISTDateTime(p.paymentDate)}
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="text-sm font-bold text-emerald-700">
                            {formatCurrencyINR(p.amount)}
                          </span>
                          {p.isAdjustment && (
                            <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                              Adjustment / Advance
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-xs font-semibold uppercase text-slate-700">
                          {p.paymentMethod.replace('_', ' ')}
                        </td>

                        <td className="px-5 py-3.5 text-xs font-mono text-slate-600">
                          {p.referenceNumber || '—'}
                        </td>

                        <td className="px-5 py-3.5 text-xs text-slate-500 max-w-xs truncate">
                          {p.notes || '—'}
                        </td>

                        <td className="px-5 py-3.5 text-right text-xs text-slate-400">
                          {p.recordedBy || 'Accounts'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Doctor Modal */}
      <DoctorFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={doctor}
        onSuccess={() => {
          fetchDoctorDashboard();
          setAlertSuccess('Doctor details updated successfully! Future visits will use the updated rate.');
        }}
      />

      {/* Record Commission Payout Modal */}
      <RecordDoctorPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        doctorId={doctor._id}
        doctorName={doctor.name}
        outstandingBalance={metrics.outstandingCommission}
        onSuccess={(result) => {
          fetchDoctorDashboard();
          setAlertSuccess(
            `Commission payout of ${formatCurrencyINR(result.payment?.amount)} recorded successfully!`
          );
        }}
      />
    </div>
  );
}
