'use client';

import React, { useEffect, useState } from 'react';
import { Database, Clock, User, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { formatISTDate, formatISTTime } from '@/lib/timezone';

export function Header() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [labName, setLabName] = useState<string>(process.env.NEXT_PUBLIC_LAB_NAME || 'Apex Diagnostics');
  const [dbStatus, setDbStatus] = useState<{ isConnected: boolean; message?: string }>({
    isConnected: false,
    message: 'Checking...',
  });

  useEffect(() => {
    // Update live IST clock every second
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(formatISTDate(now));
      setCurrentTime(formatISTTime(now));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Fetch database connection health
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setDbStatus({
          isConnected: data?.database?.isConnected ?? false,
          message: data?.database?.message,
        });
      })
      .catch(() => {
        setDbStatus({ isConnected: false, message: 'Server unreachable' });
      });

    // Fetch lab name for branding
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings?.labName) {
          setLabName(data.settings.labName);
        }
      })
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* IST Clock */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md">
          <Clock className="h-3.5 w-3.5 text-teal-600" />
          <span>IST:</span>
          <span className="font-semibold text-slate-800">{currentDate || 'Loading...'}</span>
          <span className="text-slate-400">|</span>
          <span className="text-teal-700 font-mono font-bold">{currentTime}</span>
        </div>

        {/* Database Status Pill */}
        <div
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
            dbStatus.isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
          title={dbStatus.message}
        >
          {dbStatus.isConnected ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>MongoDB Connected</span>
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              <span>DB Disconnected</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* User Profile */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-800">Lab Technician</p>
            <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{labName}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
