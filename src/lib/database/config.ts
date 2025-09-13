import { IDBStoreConfig } from './types';

export const DB_NAME = 'ocean_stride_db';
export const DB_VERSION = 1;

export const STORES: Record<string, IDBStoreConfig> = {
  COMPANIES: {
    name: 'companies',
    options: { keyPath: 'id' },
    indexes: [
      { name: 'name', keyPath: 'name', options: { unique: false } },
      { name: 'code', keyPath: 'code', options: { unique: true } },
    ],
  },
  SEAFARERS: {
    name: 'seafarers',
    options: { keyPath: 'id' },
    indexes: [
      { name: 'companyId', keyPath: 'companyId', options: { unique: false } },
      { name: 'email', keyPath: 'personalInfo.email', options: { unique: true } },
      { name: 'status', keyPath: 'employment.status', options: { unique: false } },
      { name: 'rank', keyPath: 'qualifications.rank', options: { unique: false } },
    ],
  },
  VESSELS: {
    name: 'vessels',
    options: { keyPath: 'id' },
    indexes: [
      { name: 'companyId', keyPath: 'companyId', options: { unique: false } },
      { name: 'imoNumber', keyPath: 'imoNumber', options: { unique: true } },
      { name: 'name', keyPath: 'name', options: { unique: false } },
      { name: 'type', keyPath: 'type', options: { unique: false } },
    ],
  },
  CREW_ASSIGNMENTS: {
    name: 'crew_assignments',
    options: { keyPath: 'id' },
    indexes: [
      { name: 'seafarerId', keyPath: 'seafarerId', options: { unique: false } },
      { name: 'vesselId', keyPath: 'vesselId', options: { unique: false } },
      { name: 'status', keyPath: 'status', options: { unique: false } },
      { name: 'startDate', keyPath: 'startDate', options: { unique: false } },
    ],
  },
  PAYROLL_RECORDS: {
    name: 'payroll_records',
    options: { keyPath: 'id' },
    indexes: [
      { name: 'companyId', keyPath: 'companyId', options: { unique: false } },
      { name: 'seafarerId', keyPath: 'seafarerId', options: { unique: false } },
      { name: 'status', keyPath: 'status', options: { unique: false } },
      { name: 'periodStart', keyPath: 'period.start', options: { unique: false } },
      { name: 'periodEnd', keyPath: 'period.end', options: { unique: false } },
    ],
  },
  CERTIFICATES: {
    name: 'certificates',
    options: { keyPath: 'id' },
    indexes: [
      { name: 'seafarerId', keyPath: 'seafarerId', options: { unique: false } },
      { name: 'expiryDate', keyPath: 'expiryDate', options: { unique: false } },
      { name: 'status', keyPath: 'status', options: { unique: false } },
    ],
  },
  DOCUMENTS: {
    name: 'documents',
    options: { keyPath: 'id' },
    indexes: [
      { name: 'entityType', keyPath: 'entityType', options: { unique: false } },
      { name: 'entityId', keyPath: 'entityId', options: { unique: false } },
      { name: 'type', keyPath: 'type', options: { unique: false } },
    ],
  },
  SETTINGS: {
    name: 'settings',
    options: { keyPath: 'key' },
  },
} as const;

export type StoreName = keyof typeof STORES;
