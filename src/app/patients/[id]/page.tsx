'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowLeft,
  CalendarPlus,
  FileText,
  Receipt,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/Badge';
import { BookVisitModal } from '@/components/visits/BookVisitModal';
import { formatCurrencyINR, formatISTDate, formatISTDateTime, formatISTTime } from '@/lib/timezone';

export default function PatientProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const [patient, setPatient] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookingAlert, setBookingAlert] = useState<{ message: string; visitId: string } | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/patients/${params.id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load patient profile');
      }

      setPatient(data.patient);
      setVisits(data.visits || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-slate-400">
        <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-teal-600" />
        <p className="text-sm font-medium">Loading patient 360 profile...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Patient Record Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">{error || 'Could not locate patient profile.'}</p>
        <Link
          href="/patients"
          className="mt-4 inline-flex items-center gap-2 text-teal-600 hover:text-teal-800 font-semibold text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Patient Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <Link
          href="/patients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Patients</span>
        </Link>

        <button
          onClick={() => setIsBookModalOpen(true)}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition"
        >
          <CalendarPlus className="h-4 w-4" />
          <span>Book New Visit</span>
        </button>
      </div>

      {/* Booking Alert Banner */}
      {bookingAlert && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{bookingAlert.message}</span>
          </div>
          <Link
            href={`/visits/${bookingAlert.visitId}`}
            className="font-bold underline text-emerald-800 hover:text-emerald-950 ml-3"
          >
            Enter Results Now &rarr;
          </Link>
        </div>
      )}

      {/* Patient Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
              <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                {patient.patientId}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600">
              <span className="capitalize font-semibold text-slate-800">
                {patient.gender} • {patient.age} {patient.ageUnit}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {patient.mobile || 'No mobile provided'}
              </span>
              {patient.email && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {patient.email}
                  </span>
                </>
              )}
              {patient.referredByDoctorName && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Referred By: {patient.referredByDoctorName}
                  </span>
                </>
              )}
            </div>

            {patient.address && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span>{patient.address}</span>
              </div>
            )}
          </div>

          <div className="text-right text-xs text-slate-400">
            <p>Permanent Registration Date:</p>
            <p className="font-semibold text-slate-700 mt-0.5">
              {formatISTDate(patient.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Visit History Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Clinical Visit &amp; Test History
            </h2>
            <p className="text-xs text-slate-500">
              Ordered in reverse chronological order (newest first). Showing lifetime visits and daily Asia/Kolkata queue tokens.
            </p>
          </div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 self-start sm:self-auto">
            {visits.length} Total Visits
          </span>
        </div>

        {visits.length === 0 ? (
          <div className="p-12 text-center">
            <FlaskConical className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No Visits Booked Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Order diagnostic tests for this patient to generate a visit order and daily token.
            </p>
            <button
              onClick={() => setIsBookModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 bg-teal-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-teal-700 shadow-sm"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>Book First Visit</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Lifetime Visit #</th>
                  <th className="px-5 py-3">Daily Queue Token</th>
                  <th className="px-5 py-3">Visit Date &amp; Time (IST)</th>
                  <th className="px-5 py-3">Tests Ordered</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Billing</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visits.map((visit, index) => {
                  const visitNum = visit.patientVisitNumber || (visits.length - index);
                  return (
                    <tr key={visit._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Lifetime Visit Number */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Visit #{visitNum}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-medium">
                          {visitNum === 1 ? 'Initial Visit' : `Visit ${visitNum} of ${visits.length}`}
                        </div>
                      </td>

                      {/* Daily Queue Token & Visit ID */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-7 w-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs inline-flex items-center justify-center shadow-2xs"
                            title="Daily Queue Token for this date in Asia/Kolkata"
                          >
                            #{visit.dailySerial}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                            Daily Token
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-1 font-semibold">
                          {visit.visitId}
                        </div>
                      </td>

                      {/* Visit Date & Time in Asia/Kolkata */}
                      <td className="px-5 py-4 text-xs">
                        <div className="font-semibold text-slate-800">
                          {formatISTDate(visit.visitDate)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatISTTime(visit.visitDate)} (Asia/Kolkata)
                        </div>
                      </td>

                    {/* Tests */}
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
                      <div className="text-[11px] text-slate-400 mt-1">
                        Ref: {visit.doctorSnapshot?.name || 'Self'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusBadge status={visit.status} />
                    </td>

                    {/* Billing */}
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

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/visits/${visit.visitId || visit._id}`}
                          className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded transition"
                        >
                          Results
                        </Link>
                        <Link
                          href={`/reports/${visit.visitId || visit._id}`}
                          target="_blank"
                          title="Print Lab Report (A4)"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                        >
                          <FileText className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/receipts/${visit.visitId || visit._id}`}
                          target="_blank"
                          title="Print Payment Receipt"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                        >
                          <Receipt className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Book Visit Modal */}
      {isBookModalOpen && (
        <BookVisitModal
          isOpen={isBookModalOpen}
          onClose={() => setIsBookModalOpen(false)}
          patient={patient}
          onSuccess={(newVisit: any) => {
            fetchProfile();
            setBookingAlert({
              message: `Visit booked successfully! Daily Token #${newVisit.dailySerial} (${newVisit.visitId}).`,
              visitId: newVisit.visitId || newVisit._id,
            });
          }}
        />
      )}
    </div>
  );
}
