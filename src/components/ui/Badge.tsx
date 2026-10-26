import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'primary', size = 'sm', className = '' }: BadgeProps) {
  const variantStyles = {
    primary: 'bg-teal-50 text-teal-700 border-teal-200',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
    case 'paid':
    case 'normal':
      return <Badge variant="success">{status.toUpperCase()}</Badge>;
    case 'partial':
    case 'partial_ready':
    case 'processing':
    case 'sample_collected':
      return <Badge variant="warning">{status.replace('_', ' ').toUpperCase()}</Badge>;
    case 'registered':
    case 'pending':
      return <Badge variant="info">{status.toUpperCase()}</Badge>;
    case 'unpaid':
    case 'high':
    case 'low':
    case 'abnormal':
    case 'cancelled':
      return <Badge variant="danger">{status.toUpperCase()}</Badge>;
    default:
      return <Badge variant="gray">{status}</Badge>;
  }
}
