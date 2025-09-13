import { z } from 'zod';
import {
  AddressSchema,
  ContactSchema,
  CompanySettingsSchema,
  CompanySchema,
  PersonalInfoSchema,
  CertificateSchema,
  EmploymentSchema,
  FinancialSchema,
  SeafarerSchema,
  VesselSchema,
  CrewAssignmentSchema,
  PayrollRecordSchema,
} from './schemas';

export type Address = z.infer<typeof AddressSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type CompanySettings = z.infer<typeof CompanySettingsSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;
export type Certificate = z.infer<typeof CertificateSchema>;
export type Employment = z.infer<typeof EmploymentSchema>;
export type Financial = z.infer<typeof FinancialSchema>;
export type Seafarer = z.infer<typeof SeafarerSchema>;
export type Vessel = z.infer<typeof VesselSchema>;
export type CrewAssignment = z.infer<typeof CrewAssignmentSchema>;
export type PayrollRecord = z.infer<typeof PayrollRecordSchema>;

export type IDBValidKey = string | number | Date | ArrayBufferView | ArrayBuffer | IDBKeyRange;

export interface IDBIndexConfig {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
}

export interface IDBStoreConfig {
  name: string;
  options?: IDBObjectStoreParameters;
  indexes?: IDBIndexConfig[];
}

export type EntityKey<T> = T & { id: string; createdAt: string; updatedAt: string };
export type NewEntity<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
