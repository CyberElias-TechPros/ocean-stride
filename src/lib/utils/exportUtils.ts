/**
 * Utility function to export data to CSV format and trigger download
 * @param data - Array of objects to export
 * @param headers - Optional array of header names. If not provided, uses Object.keys of first data item
 * @param filename - Optional filename for download. Defaults to 'export.csv'
 */
export function exportToCSV(
  data: Record<string, any>[],
  headers?: string[],
  filename: string = 'export.csv'
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Determine headers
  const csvHeaders = headers || Object.keys(data[0]);

  // Function to format values based on type
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'string') {
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const escaped = value.replace(/"/g, '""');
      if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
        return `"${escaped}"`;
      }
      return escaped;
    }
    // For objects or arrays, stringify
    return JSON.stringify(value);
  };

  // Create CSV rows
  const csvRows = data.map(row =>
    csvHeaders.map(header => formatValue(row[header])).join(',')
  );

  // Combine headers and rows
  const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}