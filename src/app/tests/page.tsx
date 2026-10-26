'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  FlaskConical,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  RefreshCw,
  X,
  Filter,
  Sliders,
  ChevronDown,
  ChevronUp,
  Tag,
  IndianRupee,
} from 'lucide-react';
import { TestFormModal } from '@/components/tests/TestFormModal';
import { DbStatusBanner } from '@/components/common/DbStatusBanner';
import { formatCurrencyINR } from '@/lib/timezone';
import { ITest } from '@/types';

export default function TestsPage() {
  const [tests, setTests] = useState<ITest[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(true);
  const [dbMessage, setDbMessage] = useState<string | undefined>();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Expanded card parameters state
  const [expandedTestIds, setExpandedTestIds] = useState<Set<string>>(new Set());

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<ITest | null>(null);

  const fetchTests = async (
    query = searchQuery,
    category = selectedCategory,
    status = statusFilter
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (category && category !== 'all') params.set('category', category);
      if (status) params.set('status', status);

      const res = await fetch(`/api/tests?${params.toString()}`);
      const data = await res.json();

      setDbConnected(data.dbConnected ?? true);
      setDbMessage(data.message);

      if (data.tests) {
        setTests(data.tests);
      }
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Failed to fetch tests catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTests(searchQuery, selectedCategory, statusFilter);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Refetch when category or status changes
  useEffect(() => {
    fetchTests(searchQuery, selectedCategory, statusFilter);
  }, [selectedCategory, statusFilter]);

  const handleToggleStatus = async (test: ITest) => {
    try {
      const newStatus = !test.isActive;
      const res = await fetch(`/api/tests/${test._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (res.ok) {
        // Optimistically or refetch
        fetchTests(searchQuery, selectedCategory, statusFilter);
      }
    } catch (err) {
      console.error('Failed to toggle test status:', err);
    }
  };

  const toggleExpand = (testId: string) => {
    setExpandedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setStatusFilter('all');
  };

  const activeCount = tests.filter((t) => t.isActive).length;
  const inactiveCount = tests.filter((t) => !t.isActive).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Database Diagnostic Alert */}
      <DbStatusBanner dbConnected={dbConnected} errorMessage={dbMessage} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-teal-600" />
            Test Catalog &amp; Parameter Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure laboratory investigations, specimen requirements, prices, turnaround times, and clinical reference ranges.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTest(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Test</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Live Search Input */}
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search investigations by Code (CBC, LFT...) or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-56">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-700"
            >
              <option value="all">All Departments ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-44">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
              }
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {(searchQuery || selectedCategory !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-slate-500 hover:text-slate-800 underline px-2 py-2"
            >
              Reset
            </button>
          )}
        </div>

        {/* Status Subheader */}
        <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-slate-800">{tests.length}</strong> investigations
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">
              {activeCount} Active
            </span>
            {inactiveCount > 0 && (
              <>
                <span>•</span>
                <span className="text-slate-500 font-medium">
                  {inactiveCount} Inactive (Archived)
                </span>
              </>
            )}
          </div>
          <span className="text-[11px] text-teal-700">
            Catalog price changes apply to future visits; historical visit snapshots are permanently preserved.
          </span>
        </div>
      </div>

      {/* Tests Catalog Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-teal-600" />
          <p className="text-xs font-medium">Loading tests catalog...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200 text-center shadow-xs">
          <FlaskConical className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No Tests Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery || selectedCategory !== 'all' || statusFilter !== 'all'
              ? 'No tests matched your current search or category filter.'
              : 'The test catalog is currently empty. Add your first laboratory investigation to begin.'}
          </p>
          <button
            onClick={() => {
              setEditingTest(null);
              setIsModalOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add First Test</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => {
            const isExpanded = expandedTestIds.has(test._id);
            return (
              <div
                key={test._id}
                className={`bg-white rounded-xl border transition shadow-xs flex flex-col justify-between ${
                  test.isActive
                    ? 'border-slate-200 hover:border-teal-300'
                    : 'border-slate-200 bg-slate-50/60 opacity-80'
                }`}
              >
                <div className="p-5 space-y-3">
                  {/* Top Header: Code, Active Toggle, Price */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {test.code}
                        </span>
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {test.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mt-1.5 line-clamp-2">
                        {test.name}
                      </h3>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-extrabold text-slate-900">
                        {formatCurrencyINR(test.price)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        <span>TAT: {test.tatHours ?? 4}h</span>
                      </div>
                    </div>
                  </div>

                  {/* Specimen / Sample Info */}
                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Specimen
                      </span>
                      <span className="font-medium text-slate-800 text-[11px]">
                        {test.sampleType}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Parameters
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpand(test._id)}
                        className="text-[11px] font-bold text-teal-700 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>{test.parameters?.length || 0} items</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Parameters Drawer */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-150">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Investigation Parameters
                      </p>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-[11px] border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                        {test.parameters?.map((p, idx) => (
                          <div key={idx} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-800">{p.name}</p>
                              {p.genderSpecific ? (
                                <p className="text-[10px] text-slate-500">
                                  M: {p.maleNormalRange || '—'} | F: {p.femaleNormalRange || '—'}
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-500">
                                  Ref: {p.normalRange || '—'}
                                </p>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {p.unit || '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 rounded-b-xl flex items-center justify-between">
                  {/* Active / Inactive Status Toggle */}
                  <button
                    onClick={() => handleToggleStatus(test)}
                    title="Click to toggle catalog availability"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full border transition ${
                      test.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                    }`}
                  >
                    {test.isActive ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        <span>Deactivated</span>
                      </>
                    )}
                  </button>

                  {/* Edit Test Button */}
                  <button
                    onClick={() => {
                      setEditingTest(test);
                      setIsModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition shadow-2xs"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                    <span>Edit Test</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Test Modal */}
      <TestFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingTest}
        existingCategories={categories}
        onSuccess={() => {
          fetchTests(searchQuery, selectedCategory, statusFilter);
        }}
      />
    </div>
  );
}
