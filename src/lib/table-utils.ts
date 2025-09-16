import { ColumnDef } from '@tanstack/react-table';

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

export function createColumns<TData>(
  configs: ColumnConfig<TData>[]
): ColumnDef<TData>[] {
  return configs.map((config) => ({
    id: config.id,
    accessorKey: config.accessor as string,
    header: ({ column }) => (
      <div 
        className={config.sortable ? 'cursor-pointer select-none' : ''}
        onClick={config.sortable ? () => column.toggleSorting(column.getIsSorted() === 'asc') : undefined}
      >
        {config.header}
        {config.sortable && (
          <span className="ml-2">
            {column.getIsSorted() === 'desc' ? '↓' : column.getIsSorted() === 'asc' ? '↑' : '↕'}
          </span>
        )}
      </div>
    ),
    cell: config.cell 
      ? ({ row }) => config.cell?.(row.original[config.id as keyof TData], row.original)
      : ({ getValue }) => {
          const value = getValue();
          return <div className={`text-${config.align || 'left'}`}>{value as React.ReactNode}</div>;
        },
    enableSorting: config.sortable,
    enableColumnFilter: config.filterable,
    size: config.width ? (typeof config.width === 'string' ? undefined : config.width) : 150,
  }));
}

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
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
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
