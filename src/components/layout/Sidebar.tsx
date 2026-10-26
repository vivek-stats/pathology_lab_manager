'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FlaskConical,
  FileText,
  Clock,
  ShieldCheck,
  CalendarCheck,
  Activity,
  Settings,
} from 'lucide-react';

const navItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: 'Patients',
    href: '/patients',
    icon: Users,
    badge: 'Core',
  },
  {
    name: 'Visits & Queue',
    href: '/visits',
    icon: CalendarCheck,
    badge: null,
  },
  {
    name: 'Doctors',
    href: '/doctors',
    icon: UserCheck,
    badge: null,
  },
  {
    name: 'Test Management',
    href: '/tests',
    icon: FlaskConical,
    badge: null,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    badge: null,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [labBrand, setLabBrand] = useState({
    name: process.env.NEXT_PUBLIC_LAB_NAME || 'Apex Pathology Lab',
    license: process.env.NEXT_PUBLIC_LAB_LICENSE || 'DL-REG-2024',
    tagline: 'DIAGNOSTICS & RESEARCH',
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          setLabBrand({
            name: data.settings.labName || process.env.NEXT_PUBLIC_LAB_NAME || 'Apex Pathology Lab',
            license: data.settings.registrationNumber || process.env.NEXT_PUBLIC_LAB_LICENSE || 'DL-REG-2024',
            tagline: data.settings.tagline || 'DIAGNOSTICS & RESEARCH',
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 bg-slate-950/60 border-b border-slate-800/80 gap-3">
        <div className="h-9 w-9 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
          <Activity className="h-5 w-5" />
        </div>
        <div className="overflow-hidden">
          <h1 className="text-sm font-bold text-white tracking-tight truncate" title={labBrand.name}>
            {labBrand.name}
          </h1>
          <p className="text-[11px] text-teal-400/90 font-medium tracking-wide truncate" title={labBrand.tagline}>
            {labBrand.tagline}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
          Main Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-teal-700 text-teal-100'
                      : 'bg-slate-800 text-teal-400 border border-teal-500/20'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Laboratory Metadata & IST Timezone footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-300">
          <Clock className="h-3.5 w-3.5 text-teal-400" />
          <span>Lab Timezone: <strong>Asia/Kolkata (IST)</strong></span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Lic: {labBrand.license}</span>
        </div>
        <div className="pt-2 text-[11px] text-slate-300 border-t border-slate-800/80">
          Daily serials reset at midnight IST
        </div>
      </div>
    </aside>
  );
}
