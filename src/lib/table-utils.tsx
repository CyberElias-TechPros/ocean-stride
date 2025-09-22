import React from 'react';

type ColumnConfig<TData> = {
  id: string;
  header: string;
  accessor?: keyof TData | ((row: TData) => any);
  cell?: (value: any, row: TData) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
};

export function createFilterOptions<TData>(
  data: TData[],
  key: keyof TData,
  labelKey?: keyof TData
): { label: string; value: string }[] {
  const uniqueValues = Array.from(new Set(data.map((item) => String(item[key]))));
  return uniqueValues.map((value) => ({
    label: labelKey ? String(data.find((item) => String(item[key]) === value)?.[labelKey] || value) : String(value),
    value: String(value),
  }));
}

export function formatDate(value: string | Date): string {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string | Date): string {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export function getStatusVariant(status: string): StatusVariant {
  const statusMap: Record<string, StatusVariant> = {
    active: 'success',
    inactive: 'default',
    pending: 'warning',
    error: 'error',
    success: 'success',
    failed: 'error',
    processing: 'info',
    completed: 'success',
    cancelled: 'default',
  };
  
  return statusMap[status.toLowerCase()] || 'default';
}

export function StatusBadge({ status }: { status: string }) {
  const variant = getStatusVariant(status);
  const variantClasses = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  };
  
  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}
    >
      {status}
    </span>
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}