'use client';

import React, { useState } from 'react';
import { AlertTriangle, Database, RefreshCw, CheckCircle2 } from 'lucide-react';

interface DbStatusBannerProps {
  dbConnected: boolean;
  errorMessage?: string;
  onRetried?: () => void;
}

export function DbStatusBanner({ dbConnected, errorMessage, onRetried }: DbStatusBannerProps) {
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<string | null>(null);

  if (dbConnected) {
    return null;
  }

  const handleRetry = async () => {
    try {
      setRetrying(true);
      setRetryResult(null);
      const res = await fetch('/api/health?force=true');
      const data = await res.json();
      if (data?.database?.isConnected) {
        setRetryResult('Connected successfully! Reloading...');
        if (onRetried) {
          onRetried();
        } else {
          window.location.reload();
        }
      } else {
        setRetryResult(data?.database?.error || 'Database is still unreachable. Check your MongoDB service.');
      }
    } catch (err: any) {
      setRetryResult(err.message || 'Check failed');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg shadow-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0 text-amber-500 mt-0.5">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="ml-3 flex-1 text-sm text-amber-800">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-amber-900 flex items-center gap-2">
              <Database className="h-4 w-4" /> Persistent Storage (MongoDB) Not Connected
            </h3>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md shadow-xs transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
              <span>{retrying ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
          <p className="mt-1 text-amber-700">
            {errorMessage || 'Cannot establish connection to MongoDB. Application is in offline/diagnostic mode.'}
          </p>

          {retryResult && (
            <div className="mt-2 text-xs font-medium text-amber-900 bg-amber-100 p-2 rounded border border-amber-300">
              {retryResult}
            </div>
          )}

          <div className="mt-2.5 bg-amber-100/70 p-2.5 rounded text-xs font-mono text-amber-900 border border-amber-200">
            <strong>MongoDB Configuration:</strong>
            <p className="mt-1 font-sans text-xs text-amber-800">
              Set <code>MONGODB_URI</code> in <code>.env.local</code>. Example for Atlas:
            </p>
            <div className="bg-white/80 p-1.5 rounded mt-1 border border-amber-300 text-[11px] select-all break-all">
              MONGODB_URI=mongodb+srv://&lt;username&gt;:&lt;password&gt;@lab.9hwbam5.mongodb.net/pathology_lab?retryWrites=true&amp;w=majority
            </div>
            <ul className="list-disc list-inside mt-2 space-y-1 font-sans text-xs text-amber-800">
              <li>In MongoDB Atlas, check <strong>Security &gt; Database Access</strong> to verify your username and password.</li>
              <li>Check <strong>Security &gt; Network Access</strong> to allow your IP or <code>0.0.0.0/0</code>.</li>
              <li>Click <strong>Test Connection</strong> above to retry without restarting the server.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
