'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  Phone,
  MapPin,
  FileCheck2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  Trash2,
  Eye,
  Info,
  ShieldCheck,
  Globe,
  Mail,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { ILabSettings, DEFAULT_LAB_SETTINGS } from '@/types';

type TabKey = 'lab' | 'contact' | 'address' | 'preferences' | 'preview';

export default function SoftwareSettingsPage() {
  const [settings, setSettings] = useState<ILabSettings>(DEFAULT_LAB_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<ILabSettings>(DEFAULT_LAB_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('lab');

  // Fetch settings on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setSettings(data.settings);
          setOriginalSettings(data.settings);
        }
      })
      .catch((err) => {
        setSaveError('Failed to load settings. Using local lab defaults.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Compute dirty state
  const isDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  // Warn user before leaving page if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved configuration changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Handle controlled input changes
  const handleChange = (field: keyof ILabSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Reset to original settings
  const handleReset = () => {
    if (window.confirm('Reset all unsaved changes to their last saved state?')) {
      setSettings(originalSettings);
      setFieldErrors({});
      setSaveError(null);
    }
  };

  // Handle Logo Upload (Data URL)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size exceeds 2MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleChange('logoUrl', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Settings
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings.labName || settings.labName.trim().length < 2) {
      setFieldErrors({ labName: ['Laboratory name is required (minimum 2 characters)'] });
      setActiveTab('lab');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    setFieldErrors({});

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.details) {
          setFieldErrors(data.details);
        }
        throw new Error(data.error || 'Failed to save settings');
      }

      setSettings(data.settings);
      setOriginalSettings(data.settings);
      setSaveSuccess('Software settings & lab branding saved successfully.');

      // Auto dismiss success toast after 4s
      setTimeout(() => {
        setSaveSuccess(null);
      }, 4000);
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred while saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500">
        <Clock className="h-8 w-8 animate-spin mx-auto mb-3 text-teal-600" />
        <p className="text-sm font-medium">Loading software configuration...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Software Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure laboratory branding, contact details, physical address, and print preferences.
          </p>
        </div>

        {/* Global Save Actions */}
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Unsaved changes
            </span>
          )}

          <button
            type="button"
            onClick={handleReset}
            disabled={!isDirty || saving}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition ${
              isDirty && !saving
                ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
            }`}
            title="Reset to last saved values"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || !isDirty}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg shadow transition ${
              saving
                ? 'bg-teal-700 text-white cursor-wait'
                : isDirty
                ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <Clock className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button
            onClick={() => setSaveSuccess(null)}
            className="text-xs text-emerald-700 hover:underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
          <button
            onClick={() => setSaveError(null)}
            className="text-xs text-rose-700 hover:underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-4 overflow-x-auto text-sm font-medium">
        <button
          onClick={() => setActiveTab('lab')}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 whitespace-nowrap transition ${
            activeTab === 'lab'
              ? 'border-teal-600 text-teal-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Laboratory Info</span>
        </button>

        <button
          onClick={() => setActiveTab('contact')}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 whitespace-nowrap transition ${
            activeTab === 'contact'
              ? 'border-teal-600 text-teal-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Phone className="h-4 w-4" />
          <span>Contact Info</span>
        </button>

        <button
          onClick={() => setActiveTab('address')}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 whitespace-nowrap transition ${
            activeTab === 'address'
              ? 'border-teal-600 text-teal-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>Physical Address</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 whitespace-nowrap transition ${
            activeTab === 'preferences'
              ? 'border-teal-600 text-teal-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          <span>Report &amp; Receipts</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 whitespace-nowrap transition ${
            activeTab === 'preview'
              ? 'border-teal-600 text-teal-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Eye className="h-4 w-4" />
          <span>Live Branding Preview</span>
        </button>
      </div>

      {/* Tab Panels */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Tab 1: Laboratory Information */}
        {activeTab === 'lab' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-600" />
                <span>Laboratory Information</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Primary lab identity used on headers, clinical reports, and invoices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lab Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Laboratory / Pathology Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.labName}
                  onChange={(e) => handleChange('labName', e.target.value)}
                  placeholder="e.g. Apex Diagnostics & Pathology Laboratory"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    fieldErrors.labName ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                  }`}
                  required
                />
                {fieldErrors.labName && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.labName[0]}</p>
                )}
              </div>

              {/* Tagline */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Tagline / Subheading
                </label>
                <input
                  type="text"
                  value={settings.tagline || ''}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  placeholder="e.g. Precision Diagnostics & Advanced Blood Testing"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Lab Registration / License Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Registration / Clinical License No.
                </label>
                <input
                  type="text"
                  value={settings.registrationNumber || ''}
                  onChange={(e) => handleChange('registrationNumber', e.target.value)}
                  placeholder="e.g. DL-REG-2024-88492"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Accreditation Details */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Accreditation &amp; Certifications
                </label>
                <input
                  type="text"
                  value={settings.accreditation || ''}
                  onChange={(e) => handleChange('accreditation', e.target.value)}
                  placeholder="e.g. NABL Accredited | ISO 15189:2022"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Logo Management */}
              <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Laboratory Logo
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Thumbnail Preview */}
                  <div className="h-20 w-36 bg-white border border-slate-300 rounded-lg flex items-center justify-center p-2 overflow-hidden shadow-sm flex-shrink-0">
                    {settings.logoUrl ? (
                      <img
                        src={settings.logoUrl}
                        alt="Lab Logo Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <Building2 className="h-6 w-6 mx-auto mb-1 opacity-60" />
                        <span className="text-[10px]">No Logo Set</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 text-xs">
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-100 shadow-sm transition">
                        <Upload className="h-3.5 w-3.5 text-teal-600" />
                        <span>Upload Image File</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>

                      {settings.logoUrl && (
                        <button
                          type="button"
                          onClick={() => handleChange('logoUrl', '')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-rose-600 hover:text-rose-700 font-medium"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="text-slate-500 text-[11px]">
                      Or provide a direct image URL:
                    </div>
                    <input
                      type="text"
                      value={settings.logoUrl || ''}
                      onChange={(e) => handleChange('logoUrl', e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Contact Information */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Phone className="h-5 w-5 text-teal-600" />
                <span>Contact Information</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official phone numbers, email, website, and WhatsApp numbers displayed on documents.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Contact Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Contact Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={settings.primaryPhone || ''}
                    onChange={(e) => handleChange('primaryPhone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Secondary Contact Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Secondary / Landline Phone
                </label>
                <div className="relative">
                  <Phone className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={settings.secondaryPhone || ''}
                    onChange={(e) => handleChange('secondaryPhone', e.target.value)}
                    placeholder="+91 11 2345 6789"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Laboratory Email
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    value={settings.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="info@apexpathology.lab"
                    className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      fieldErrors.email ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.email[0]}</p>
                )}
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Official Website
                </label>
                <div className="relative">
                  <Globe className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={settings.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://apexpathology.lab"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* WhatsApp Business */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp Helpline / Report Updates Number
                </label>
                <div className="relative">
                  <MessageSquare className="h-4 w-4 absolute left-3 top-2.5 text-emerald-600" />
                  <input
                    type="text"
                    value={settings.whatsapp || ''}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Laboratory Address */}
        {activeTab === 'address' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-teal-600" />
                <span>Physical Laboratory Address</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Physical street location printed on reports, sample collection vouchers, and billing slips.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Address Line 1 */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Address Line 1 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.addressLine1 || ''}
                  onChange={(e) => handleChange('addressLine1', e.target.value)}
                  placeholder="Plot 42, Health City Enclave"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Address Line 2 */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={settings.addressLine2 || ''}
                  onChange={(e) => handleChange('addressLine2', e.target.value)}
                  placeholder="Near Metro Station / Landmark"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  City <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="New Delhi"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  State / Union Territory <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.state || ''}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="Delhi"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  PIN / Postal Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.postalCode || ''}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                  placeholder="110001"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={settings.country || 'India'}
                  onChange={(e) => handleChange('country', e.target.value)}
                  placeholder="India"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Report & Receipt Preferences */}
        {activeTab === 'preferences' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-teal-600" />
                <span>Report &amp; Receipt Preferences</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize disclaimers, authorized signatories, currency, and time display standards.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Report Header Text */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Report Header Banner Text
                </label>
                <input
                  type="text"
                  value={settings.reportHeader || ''}
                  onChange={(e) => handleChange('reportHeader', e.target.value)}
                  placeholder="e.g. Official Medical Examination & Pathology Investigation Report"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Report Disclaimer / Footer */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Report Clinical Disclaimer / Footer Text
                </label>
                <textarea
                  rows={3}
                  value={settings.reportFooter || ''}
                  onChange={(e) => handleChange('reportFooter', e.target.value)}
                  placeholder="This is a computer-generated diagnostic report. Medical interpretations should be correlated clinically by a qualified medical practitioner."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Prints at the bottom of every diagnostic test report.
                </p>
              </div>

              {/* Receipt Footer Text */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Receipt Note / Footer Text
                </label>
                <textarea
                  rows={2}
                  value={settings.receiptFooter || ''}
                  onChange={(e) => handleChange('receiptFooter', e.target.value)}
                  placeholder="Thank you for choosing our pathology services. Please retain this receipt for test report collection."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Prints at the bottom of every patient billing receipt and token voucher.
                </p>
              </div>

              {/* Authorized Signatory Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Authorized Signatory Name
                </label>
                <input
                  type="text"
                  value={settings.signatoryName || ''}
                  onChange={(e) => handleChange('signatoryName', e.target.value)}
                  placeholder="Dr. Vivek Sharma"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Authorized Signatory Designation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Signatory Designation &amp; Degree
                </label>
                <input
                  type="text"
                  value={settings.signatoryDesignation || ''}
                  onChange={(e) => handleChange('signatoryDesignation', e.target.value)}
                  placeholder="MD (Pathology), Consultant Pathologist"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Default Currency */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Default Currency
                </label>
                <input
                  type="text"
                  value={settings.currency || 'INR'}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  placeholder="INR"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Standard ISO currency code (Default: INR / ₹).
                </p>
              </div>

              {/* Timezone Preference */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  System Timezone
                </label>
                <input
                  type="text"
                  value={settings.timezone || 'Asia/Kolkata'}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  placeholder="Asia/Kolkata"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  readOnly
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  All lab queues, visits, and receipts operate strictly on Asia/Kolkata (IST).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Live Branding Preview */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-center gap-3">
              <Info className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <span>
                This preview shows how your current settings will render at the top and bottom of official diagnostic reports and printed receipts.
              </span>
            </div>

            {/* Mock Report Header Preview */}
            <div className="bg-white border-2 border-slate-200 rounded-xl p-8 shadow-sm max-w-3xl mx-auto space-y-8">
              <div className="border-b-2 border-slate-800 pb-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      {settings.labName || 'Apex Diagnostics & Pathology Laboratory'}
                    </h3>
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
                      {settings.tagline || 'Precision Diagnostics & Advanced Blood Testing'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {[settings.addressLine1, settings.addressLine2, settings.city, settings.state, settings.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Phone: {settings.primaryPhone}{' '}
                      {settings.secondaryPhone && `| ${settings.secondaryPhone}`}
                      {settings.email && ` | Email: ${settings.email}`}
                    </p>
                  </div>

                  {settings.logoUrl && (
                    <img
                      src={settings.logoUrl}
                      alt="Lab Logo"
                      className="h-16 max-w-[140px] object-contain border border-slate-200 rounded p-1"
                    />
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 font-medium">
                  <span>Lic: {settings.registrationNumber || 'DL-REG-2024-88492'}</span>
                  <span>{settings.accreditation || 'ISO 15189:2022 STANDARDS'}</span>
                  <span className="text-slate-700 font-semibold uppercase">{settings.reportHeader || 'Pathology Report'}</span>
                </div>
              </div>

              {/* Mock Body */}
              <div className="py-6 text-center text-slate-300 text-xs border border-dashed border-slate-200 rounded-lg">
                [ Patient Demographic Details &amp; Test Investigation Results Table ]
              </div>

              {/* Mock Footer Preview */}
              <div className="pt-6 border-t border-slate-300 text-xs">
                <div className="flex justify-between items-end pb-4">
                  <div className="text-center">
                    <div className="h-8 border-b border-dashed border-slate-400 w-36 mb-1" />
                    <p className="font-semibold text-slate-800">Medical Lab Technician</p>
                    <p className="text-[10px] text-slate-400">DMLT, Certified</p>
                  </div>

                  <div className="text-center">
                    <div className="h-8 border-b border-dashed border-slate-400 w-44 mb-1" />
                    <p className="font-semibold text-slate-800">
                      {settings.signatoryName || 'Dr. Vivek Sharma'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {settings.signatoryDesignation || 'MD (Pathology), Consultant Pathologist'}
                    </p>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                  {settings.reportFooter ||
                    '*** End of Medical Examination Report • Generated via Apex Pathology Lab Management System ***'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save Bar (Sticky on Mobile/Scroll) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {isDirty ? (
              <span className="text-amber-700 font-semibold">
                ⚠️ You have unsaved changes. Remember to click &ldquo;Save Settings&rdquo; to persist them.
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">
                ✓ All configuration settings are up to date and saved to database.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty || saving}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                isDirty && !saving
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Reset Changes
            </button>

            <button
              type="submit"
              disabled={saving || !isDirty}
              className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg shadow transition ${
                saving
                  ? 'bg-teal-700 text-white cursor-wait'
                  : isDirty
                  ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
