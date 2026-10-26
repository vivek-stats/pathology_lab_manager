'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  FlaskConical,
  IndianRupee,
  Clock,
  Sliders,
  Check,
} from 'lucide-react';
import { ITest, ITestParameter } from '@/types';

interface TestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ITest | null;
  existingCategories?: string[];
  onSuccess: (test: ITest) => void;
}

const COMMON_SAMPLE_TYPES = [
  'EDTA Whole Blood (2ml)',
  'Serum',
  'Serum (12h Fasting)',
  'Fluoride Plasma',
  'Fresh Spot Urine (15ml)',
  'Citrate Plasma',
  'Heparin Whole Blood',
  'Stool Routine',
  'Throat / Nasal Swab',
  'CSF / Body Fluid',
];

const DEFAULT_CATEGORIES = [
  'Hematology',
  'Biochemistry',
  'Endocrinology',
  'Clinical Pathology',
  'Serology & Immunology',
  'Microbiology',
];

interface ParameterRow {
  name: string;
  unit: string;
  normalRange: string;
  low?: number | string;
  high?: number | string;
  genderSpecific: boolean;
  maleNormalRange: string;
  femaleNormalRange: string;
}

export function TestFormModal({
  isOpen,
  onClose,
  initialData,
  existingCategories = [],
  onSuccess,
}: TestFormModalProps) {
  const isEditing = Boolean(initialData);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hematology');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [sampleType, setSampleType] = useState('EDTA Whole Blood (2ml)');
  const [customSampleType, setCustomSampleType] = useState('');
  const [isCustomSampleType, setIsCustomSampleType] = useState(false);
  const [price, setPrice] = useState<number | string>(350);
  const [tatHours, setTatHours] = useState<number | string>(4);
  const [isActive, setIsActive] = useState(true);

  const [parameters, setParameters] = useState<ParameterRow[]>([
    {
      name: '',
      unit: '',
      normalRange: '',
      low: '',
      high: '',
      genderSpecific: false,
      maleNormalRange: '',
      femaleNormalRange: '',
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Combined categories list without duplicates
  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...existingCategories])
  ).filter(Boolean);

  // Reset or populate form when opened
  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (initialData) {
      setCode(initialData.code);
      setName(initialData.name);

      if (allCategories.includes(initialData.category)) {
        setCategory(initialData.category);
        setIsCustomCategory(false);
        setCustomCategory('');
      } else {
        setCategory('Other');
        setIsCustomCategory(true);
        setCustomCategory(initialData.category);
      }

      if (COMMON_SAMPLE_TYPES.includes(initialData.sampleType)) {
        setSampleType(initialData.sampleType);
        setIsCustomSampleType(false);
        setCustomSampleType('');
      } else {
        setSampleType('Other');
        setIsCustomSampleType(true);
        setCustomSampleType(initialData.sampleType);
      }

      setPrice(initialData.price);
      setTatHours(initialData.tatHours ?? 4);
      setIsActive(initialData.isActive);

      if (initialData.parameters && initialData.parameters.length > 0) {
        setParameters(
          initialData.parameters.map((p) => ({
            name: p.name,
            unit: p.unit || '',
            normalRange: p.normalRange || '',
            low: p.low ?? '',
            high: p.high ?? '',
            genderSpecific: Boolean(p.genderSpecific),
            maleNormalRange: p.maleNormalRange || '',
            femaleNormalRange: p.femaleNormalRange || '',
          }))
        );
      } else {
        setParameters([
          {
            name: '',
            unit: '',
            normalRange: '',
            low: '',
            high: '',
            genderSpecific: false,
            maleNormalRange: '',
            femaleNormalRange: '',
          },
        ]);
      }
    } else {
      // Default new test
      setCode('');
      setName('');
      setCategory('Hematology');
      setIsCustomCategory(false);
      setCustomCategory('');
      setSampleType('EDTA Whole Blood (2ml)');
      setIsCustomSampleType(false);
      setCustomSampleType('');
      setPrice(350);
      setTatHours(4);
      setIsActive(true);
      setParameters([
        {
          name: '',
          unit: '',
          normalRange: '',
          low: '',
          high: '',
          genderSpecific: false,
          maleNormalRange: '',
          femaleNormalRange: '',
        },
      ]);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Add parameter row
  const addParameterRow = () => {
    setParameters([
      ...parameters,
      {
        name: '',
        unit: '',
        normalRange: '',
        low: '',
        high: '',
        genderSpecific: false,
        maleNormalRange: '',
        femaleNormalRange: '',
      },
    ]);
  };

  // Remove parameter row
  const removeParameterRow = (index: number) => {
    if (parameters.length <= 1) {
      setError('A test must define at least one investigation parameter.');
      return;
    }
    const updated = parameters.filter((_, i) => i !== index);
    setParameters(updated);
  };

  // Update specific parameter field
  const updateParameterField = (index: number, field: keyof ParameterRow, value: any) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation checks
    const finalCategory = isCustomCategory ? customCategory.trim() : category;
    if (!finalCategory) {
      setError('Please specify a department / category for this test.');
      return;
    }

    const finalSampleType = isCustomSampleType ? customSampleType.trim() : sampleType;
    if (!finalSampleType) {
      setError('Please specify a specimen / sample type for this test.');
      return;
    }

    if (parameters.length === 0) {
      setError('Every test must have at least one investigation parameter.');
      return;
    }

    // Check parameter completeness & duplicate names
    const seenNames = new Set<string>();
    for (let i = 0; i < parameters.length; i++) {
      const p = parameters[i];
      if (!p.name.trim()) {
        setError(`Parameter #${i + 1} is missing a name.`);
        return;
      }

      const clean = p.name.trim().toLowerCase();
      if (seenNames.has(clean)) {
        setError(`Duplicate parameter name '${p.name.trim()}' detected. Each parameter in a test must be unique.`);
        return;
      }
      seenNames.add(clean);

      // Check numeric bounds consistency
      const lowNum = p.low !== '' && p.low !== null && p.low !== undefined ? Number(p.low) : null;
      const highNum = p.high !== '' && p.high !== null && p.high !== undefined ? Number(p.high) : null;
      if (lowNum !== null && highNum !== null && !isNaN(lowNum) && !isNaN(highNum)) {
        if (lowNum > highNum) {
          setError(`Parameter '${p.name}': Low bound (${lowNum}) cannot exceed high bound (${highNum}).`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        category: finalCategory,
        sampleType: finalSampleType,
        price: Number(price),
        tatHours: Number(tatHours) || 4,
        isActive,
        parameters: parameters.map((p) => ({
          name: p.name.trim(),
          unit: p.unit.trim(),
          normalRange: p.normalRange.trim(),
          low: p.low !== '' && !isNaN(Number(p.low)) ? Number(p.low) : undefined,
          high: p.high !== '' && !isNaN(Number(p.high)) ? Number(p.high) : undefined,
          genderSpecific: p.genderSpecific,
          maleNormalRange: p.maleNormalRange.trim(),
          femaleNormalRange: p.femaleNormalRange.trim(),
        })),
      };

      const url = isEditing ? `/api/tests/${initialData!._id}` : '/api/tests';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save test');
      }

      onSuccess(data.test);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-100 text-teal-800 rounded-lg">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isEditing ? `Edit Test: ${initialData?.code}` : 'Add New Lab Investigation'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure investigation code, sample type, catalog price, and normal ranges.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Core Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Test Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Test Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CBC, LFT, KFT"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">Unique alphanumeric code</p>
            </div>

            {/* Test Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Investigation Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Complete Blood Count (CBC) with Differential"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department / Category <span className="text-rose-500">*</span>
              </label>
              {!isCustomCategory ? (
                <div className="space-y-1">
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === 'Other') {
                        setIsCustomCategory(true);
                        setCustomCategory('');
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="Other">+ Custom Department...</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    required
                    placeholder="Enter custom department"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(false);
                      setCategory('Hematology');
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
                    title="Choose from existing"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Sample Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specimen / Sample Type <span className="text-rose-500">*</span>
              </label>
              {!isCustomSampleType ? (
                <select
                  value={sampleType}
                  onChange={(e) => {
                    if (e.target.value === 'Other') {
                      setIsCustomSampleType(true);
                      setCustomSampleType('');
                    } else {
                      setSampleType(e.target.value);
                    }
                  }}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium"
                >
                  {COMMON_SAMPLE_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="Other">+ Custom Specimen...</option>
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    required
                    placeholder="Enter custom specimen"
                    value={customSampleType}
                    onChange={(e) => setCustomSampleType(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomSampleType(false);
                      setSampleType('EDTA Whole Blood (2ml)');
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
                    title="Choose from standard"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Price & TAT in a 2-col nested box */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Price (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full text-xs pl-6 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  TAT (Hours)
                </label>
                <div className="relative">
                  <Clock className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="number"
                    min="1"
                    value={tatHours}
                    onChange={(e) => setTatHours(e.target.value)}
                    className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <p className="text-xs font-bold text-slate-800">Test Active in Catalog</p>
              <p className="text-[11px] text-slate-500">
                Active tests appear in visit booking catalog. Deactivated tests cannot be booked for new visits but are safely preserved on past records.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          {/* Dynamic Parameters Builder */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-teal-600" />
                  <span>Investigation Parameters ({parameters.length})</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Configure clinical parameters, units of measure, and default reference ranges.
                </p>
              </div>

              <button
                type="button"
                onClick={addParameterRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Parameter</span>
              </button>
            </div>

            {/* Parameters Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100/80 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-10">#</th>
                      <th className="py-2.5 px-3 min-w-[170px]">Parameter Name *</th>
                      <th className="py-2.5 px-3 min-w-[90px]">Unit</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Normal Range</th>
                      <th className="py-2.5 px-3 min-w-[120px]">Numeric (Low / High)</th>
                      <th className="py-2.5 px-3 min-w-[110px]">Gender Specific</th>
                      <th className="py-2.5 px-3 text-right w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parameters.map((param, index) => (
                      <React.Fragment key={index}>
                        <tr className="hover:bg-slate-50/70 transition">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                            {index + 1}
                          </td>

                          {/* Parameter Name */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              required
                              placeholder="e.g. Hemoglobin"
                              value={param.name}
                              onChange={(e) =>
                                updateParameterField(index, 'name', e.target.value)
                              }
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                            />
                          </td>

                          {/* Unit */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="g/dL, mg/dL..."
                              value={param.unit}
                              onChange={(e) =>
                                updateParameterField(index, 'unit', e.target.value)
                              }
                              className="w-full text-xs font-mono px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </td>

                          {/* Display Normal Range */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="e.g. 13.0 - 17.0"
                              value={param.normalRange}
                              onChange={(e) =>
                                updateParameterField(index, 'normalRange', e.target.value)
                              }
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </td>

                          {/* Numeric Low / High */}
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="any"
                                placeholder="Low"
                                value={param.low ?? ''}
                                onChange={(e) =>
                                  updateParameterField(index, 'low', e.target.value)
                                }
                                className="w-1/2 text-[11px] px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 text-center"
                              />
                              <span className="text-slate-400 text-xs">-</span>
                              <input
                                type="number"
                                step="any"
                                placeholder="High"
                                value={param.high ?? ''}
                                onChange={(e) =>
                                  updateParameterField(index, 'high', e.target.value)
                                }
                                className="w-1/2 text-[11px] px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 text-center"
                              />
                            </div>
                          </td>

                          {/* Gender Specific Toggle */}
                          <td className="py-2 px-3">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-600">
                              <input
                                type="checkbox"
                                checked={param.genderSpecific}
                                onChange={(e) =>
                                  updateParameterField(index, 'genderSpecific', e.target.checked)
                                }
                                className="rounded text-teal-600 focus:ring-teal-500 h-3.5 w-3.5 border-slate-300"
                              />
                              <span>Male / Female</span>
                            </label>
                          </td>

                          {/* Remove Row */}
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeParameterRow(index)}
                              disabled={parameters.length <= 1}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded disabled:opacity-30 disabled:hover:text-slate-400 transition"
                              title="Delete parameter"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Gender-Specific Inputs */}
                        {param.genderSpecific && (
                          <tr className="bg-teal-50/40">
                            <td colSpan={7} className="px-6 py-2.5 border-t border-teal-100">
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <label className="block text-[10px] font-bold text-teal-900 uppercase mb-1">
                                    Male Reference Range
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 13.0 - 17.0"
                                    value={param.maleNormalRange}
                                    onChange={(e) =>
                                      updateParameterField(index, 'maleNormalRange', e.target.value)
                                    }
                                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-teal-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-rose-900 uppercase mb-1">
                                    Female Reference Range
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 12.0 - 15.5"
                                    value={param.femaleNormalRange}
                                    onChange={(e) =>
                                      updateParameterField(index, 'femaleNormalRange', e.target.value)
                                    }
                                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-rose-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{loading ? 'Saving Test...' : isEditing ? 'Save Changes' : 'Create Lab Test'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
