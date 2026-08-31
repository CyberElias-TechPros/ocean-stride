import { db as newDb, isRemoteEnabled } from './database2';
import { db as oldDb } from './database';
import {
  Company,
  Vessel,
  CrewChange,
  Payroll,
  STORE_NAMES,
} from './schemas';
import {
  Seafarer,
  Document,
} from './schemas_v2';

// Type guards
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPayroll(obj: unknown): obj is Payroll {
  return (
    isObject(obj) &&
    hasStringProperty(obj, 'id') &&
    hasStringProperty(obj, 'seafarerId') &&
    hasStringProperty(obj, 'seafarerName') &&
    hasStringProperty(obj, 'currency') &&
    hasStringProperty(obj, 'status') &&
    hasStringProperty(obj, 'createdAt') &&
    hasStringProperty(obj, 'updatedAt')
  );
}

function isOldPayroll(obj: unknown): obj is {
  id: string;
  companyId: string;
  seafarerId: string;
  vesselId?: string;
  period?: { start: string; end: string };
  basicSalary: number;
  netSalary: number;
  currency?: string;
  status?: string;
  paymentDate?: string;
} {
  return (
    isObject(obj) &&
    hasStringProperty(obj, 'id') &&
    hasStringProperty(obj, 'companyId') &&
    hasStringProperty(obj, 'seafarerId') &&
    (obj.vesselId === undefined || typeof obj.vesselId === 'string') &&
    (obj.period === undefined || 
     (isObject(obj.period) && 
      hasStringProperty(obj.period, 'start') && 
      hasStringProperty(obj.period, 'end'))) &&
    typeof obj.basicSalary === 'number' &&
    typeof obj.netSalary === 'number' &&
    (obj.currency === undefined || typeof obj.currency === 'string') &&
    (obj.status === undefined || typeof obj.status === 'string') &&
    (obj.paymentDate === undefined || typeof obj.paymentDate === 'string')
  );
}

function hasProperty<T extends object, K extends string>(
  obj: T,
  prop: K
): obj is T & Record<K, unknown> {
  return prop in obj;
}

function hasStringProperty<T extends object, K extends string>(
  obj: T,
  prop: K
): obj is T & Record<K, string> {
  return hasProperty(obj, prop) && typeof obj[prop] === 'string';
}

function hasNumberProperty<T extends object, K extends string>(
  obj: T,
  prop: K
): obj is T & Record<K, number> {
  return hasProperty(obj, prop) && typeof obj[prop] === 'number';
}

class DatabaseMigrator {
  private static instance: DatabaseMigrator;
  private isMigrating = false;

  private constructor() {}

  static getInstance(): DatabaseMigrator {
    if (!DatabaseMigrator.instance) {
      DatabaseMigrator.instance = new DatabaseMigrator();
    }
    return DatabaseMigrator.instance;
  }

  async checkAndMigrate(): Promise<boolean> {
    // Skip if already migrating
    if (this.isMigrating) {
      return false;
    }

    this.isMigrating = true;
    
    try {
      const needsMigration = await this.needsMigration();
      if (!needsMigration) {
        return false;
      }

      // Initialize the new database
      if (!newDb.isInitialized()) {
        await newDb.init();
      }

      // Initialize the old database
      try {
        // First ensure the old database is initialized
        if (typeof oldDb.init === 'function') {
          await oldDb.init();
        }

        // Then verify we can access it
        const companies = await oldDb.getAll('companies');
      } catch (error) {
        console.error('[Migration] Failed to initialize or access old database:', error);
        throw new Error('Could not access old database for migration');
      }

      // Start the migration process
      await this.migrateData();

      // Mark migration as complete
      await this.markMigrationComplete();

      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    } finally {
      this.isMigrating = false;
    }
  }

  private async needsMigration(): Promise<boolean> {
    try {
      // Check if the old database exists
      const oldDbName = 'OceanStrideDB';
      const req = indexedDB.open(oldDbName);
      
      return new Promise<boolean>((resolve) => {
        req.onsuccess = () => {
          const db = req.result;
          const version = db.version;
          db.close();
          
          // If we can open the old database, migration is needed
          resolve(version > 0);
        };
        
        req.onerror = () => {
          // If we can't open the old database, no migration is needed
          resolve(false);
        };
      });
    } catch (error) {
      console.warn('Error checking migration status:', error);
      return false;
    }
  }

  private async migrateData(): Promise<void> {
    // Initialize the new database
    await newDb.init();

    // Migrate companies
    await this.migrateCompanies();
    
    // Migrate vessels
    await this.migrateVessels();
    
    // Migrate seafarers
    await this.migrateSeafarers();
    
    // Migrate crew changes
    await this.migrateCrewChanges();
    
    // Migrate payrolls
    await this.migratePayrolls();
    
    // Migrate documents
    await this.migrateDocuments();
    
    // Migrate notifications
    await this.migrateNotifications();
  }

  private async migrateCompanies(): Promise<void> {
    try {
      const companies = await oldDb.getAll('companies');
      
      for (const company of companies) {
        if (!isObject(company)) continue;
        
        // Skip if company already exists in new DB
        const companyId = hasStringProperty(company, 'id') ? company.id : '';
        if (companyId) {
          const exists = await newDb.getById<Company>('companies', companyId);
          if (exists) continue;
        }

        // Map old company to new schema with type safety
        const newCompany: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'companyId' | 'createdBy' | 'updatedBy'> = {
          name: hasStringProperty(company, 'name') ? company.name : 'Unnamed Company',
          address: hasStringProperty(company, 'address') ? company.address : '',
          phone: hasStringProperty(company, 'phone') ? company.phone : '',
          email: hasStringProperty(company, 'email') ? company.email : '',
          website: hasStringProperty(company, 'website') ? company.website : undefined,
          logoUrl: hasStringProperty(company, 'logoUrl') ? company.logoUrl : undefined,
          taxId: hasStringProperty(company, 'taxId') ? company.taxId : undefined,
          settings: {
            currency: 'USD',
            dateFormat: 'MM/dd/yyyy',
            timezone: 'UTC'
          }
        };

        // Add company to new database using createCompany which handles ID and timestamps
        await newDb.createCompany(newCompany);
      }
    } catch (error) {
      console.error('Error migrating companies:', error);
      throw error;
    }
  }

  private async migrateVessels(): Promise<void> {
    try {
      const oldVessels = await oldDb.getAll('vessels');
      
      for (const vessel of oldVessels) {
        if (!isObject(vessel)) continue;
        
        // Skip if vessel already exists in new DB
        const vesselId = hasStringProperty(vessel, 'id') ? vessel.id : '';
        if (vesselId) {
          const exists = await newDb.getById<Vessel>('vessels', vesselId);
          if (exists) continue;
        }

        // Map old vessel to new schema with type safety
        const newVessel: Omit<Vessel, 'id' | 'createdAt' | 'updatedAt' | 'companyId' | 'createdBy' | 'updatedBy'> = {
          name: hasStringProperty(vessel, 'name') ? vessel.name : 'Unnamed Vessel',
          imoNumber: hasStringProperty(vessel, 'imoNumber') ? vessel.imoNumber : '',
          type: hasStringProperty(vessel, 'type') ? vessel.type : 'Other',
          flag: hasStringProperty(vessel, 'flag') ? vessel.flag : '',
          yearBuilt: hasNumberProperty(vessel, 'yearBuilt') ? vessel.yearBuilt : new Date().getFullYear(),
          grossTonnage: hasNumberProperty(vessel, 'grossTonnage') ? vessel.grossTonnage : 0,
          deadweight: hasNumberProperty(vessel, 'deadweight') ? vessel.deadweight : 
                     hasNumberProperty(vessel, 'dwt') ? vessel.dwt : 0, // Handle old 'dwt' field
          callSign: hasStringProperty(vessel, 'callSign') ? vessel.callSign : '',
          mmsi: hasStringProperty(vessel, 'mmsi') ? vessel.mmsi : '',
          status: this.mapVesselStatus(hasStringProperty(vessel, 'status') ? vessel.status : undefined),
          lastInspectionDate: hasStringProperty(vessel, 'lastInspectionDate') ? vessel.lastInspectionDate : undefined,
          nextInspectionDate: hasStringProperty(vessel, 'nextInspectionDate') ? vessel.nextInspectionDate : undefined,
          notes: hasStringProperty(vessel, 'notes') ? vessel.notes : undefined
        };

        // Add vessel to new database using createVessel which handles ID and timestamps
        await newDb.createVessel(newVessel);
      }
    } catch (error) {
      console.error('Error migrating vessels:', error);
      throw error;
    }
  }

  private mapVesselStatus(oldStatus?: string): Vessel['status'] {
    if (!oldStatus) return 'active';
    
    const statusMap: Record<string, Vessel['status']> = {
      'active': 'active',
      'inactive': 'inactive',
      'maintenance': 'maintenance',
      'chartered': 'chartered',
    };
    
    return statusMap[oldStatus.toLowerCase()] || 'active';
  }

  private async migrateSeafarers(): Promise<void> {
    try {
      const oldSeafarers = await oldDb.getAll('seafarers');
      
      for (const oldSeafarer of oldSeafarers) {
        if (!isObject(oldSeafarer)) continue;
        
        // Skip if seafarer already exists in new DB
        const seafarerId = hasStringProperty(oldSeafarer, 'id') ? oldSeafarer.id : '';
        if (seafarerId) {
          const exists = await newDb.getById<Seafarer>('seafarers', seafarerId);
          if (exists) continue;
        }

        // Safely extract personal info with type guards
        const personalInfo = hasProperty(oldSeafarer, 'personalInfo') && isObject(oldSeafarer.personalInfo) 
          ? oldSeafarer.personalInfo 
          : {};
          
        const employment = hasProperty(oldSeafarer, 'employment') && isObject(oldSeafarer.employment)
          ? oldSeafarer.employment
          : {};
          
        const financial = hasProperty(oldSeafarer, 'financial') && isObject(oldSeafarer.financial)
          ? oldSeafarer.financial
          : {};

        const newSeafarer: Omit<Seafarer, 'id' | 'createdAt' | 'updatedAt' | 'companyId' | 'createdBy' | 'updatedBy'> = {
          personalInfo: {
            firstName: hasStringProperty(personalInfo, 'firstName') ? personalInfo.firstName : '',
            lastName: hasStringProperty(personalInfo, 'lastName') ? personalInfo.lastName : '',
            dateOfBirth: hasStringProperty(personalInfo, 'dateOfBirth') 
              ? personalInfo.dateOfBirth 
              : new Date().toISOString(),
            placeOfBirth: hasStringProperty(personalInfo, 'placeOfBirth') ? personalInfo.placeOfBirth : '',
            nationality: hasStringProperty(personalInfo, 'nationality') ? personalInfo.nationality : '',
            gender: 'prefer_not_to_say',
            maritalStatus: hasStringProperty(personalInfo, 'maritalStatus') && 
              ['single', 'married', 'divorced', 'widowed'].includes(personalInfo.maritalStatus)
                ? personalInfo.maritalStatus as 'single' | 'married' | 'divorced' | 'widowed'
                : 'single',
            address: {
              street: hasStringProperty(personalInfo, 'address') && isObject(personalInfo.address)
                ? hasStringProperty(personalInfo.address, 'street') ? personalInfo.address.street : ''
                : '',
              city: hasStringProperty(personalInfo, 'address') && isObject(personalInfo.address)
                ? hasStringProperty(personalInfo.address, 'city') ? personalInfo.address.city : ''
                : '',
              state: '',
              postalCode: '',
              country: hasStringProperty(personalInfo, 'nationality') ? personalInfo.nationality : '',
            },
            contact: {
              email: hasStringProperty(personalInfo, 'email') ? personalInfo.email : '',
              phone: hasStringProperty(personalInfo, 'phone') ? personalInfo.phone : '',
              emergencyContact: {
                name: '',
                relationship: '',
                phone: '',
              },
            },
          },
          documents: [],
          payrolls: [],
          emergencyContacts: [],
          employment: {
            rank: hasStringProperty(employment, 'position') ? employment.position : '',
            rankId: '',
            employeeId: hasStringProperty(employment, 'employeeId') ? employment.employeeId : '',
            department: 'deck', // Default value
            status: this.mapSeafarerStatus(hasStringProperty(employment, 'status') ? employment.status : undefined),
            currentVesselId: hasStringProperty(employment, 'currentVessel') ? employment.currentVessel : undefined,
            currentVesselName: '',
            baseWage: hasNumberProperty(financial, 'basicWage') ? financial.basicWage : 0,
            wageCurrency: hasStringProperty(financial, 'currency') ? financial.currency : 'USD',
            workHoursPerWeek: 48, // Default value
            leaveDaysPerYear: 30, // Default value
            employmentType: 'permanent', // Default value
            employmentStatus: 'active',
            joinedDate: hasStringProperty(employment, 'joinedDate') 
              ? employment.joinedDate 
              : new Date().toISOString(),
          },
          trainings: [],
          medicals: [],
          skills: Array.isArray(oldSeafarer.skills) 
            ? oldSeafarer.skills.filter((s: any) => typeof s === 'string')
            : [],
          languages: Array.isArray(oldSeafarer.languages)
            ? oldSeafarer.languages.map((lang: any) => ({
                language: typeof lang === 'string' ? lang : '',
                proficiency: 'intermediate' as const
              }))
            : [],
        };

        await newDb.createSeafarer(newSeafarer);
      }
    } catch (error) {
      console.error('Error migrating seafarers:', error);
      throw error;
    }
  }

  private mapSeafarerStatus(oldStatus?: string): Seafarer['employment']['status'] {
    if (!oldStatus) return 'on_leave';
    
    const statusMap: Record<string, Seafarer['employment']['status']> = {
      'active': 'onboard',
      'onboard': 'onboard',
      'on-leave': 'on_leave',
      'available': 'on_leave',
      'inactive': 'inactive',
    };
    
    return statusMap[oldStatus.toLowerCase()] || 'on_leave';
  }

  private async migrateCrewChanges(): Promise<void> {
    try {
      const oldAssignments = await oldDb.getAll('crew_assignments');
      
      for (const assignment of oldAssignments) {
        if (!isObject(assignment)) continue;
        
        // Skip if assignment already exists in new DB
        const assignmentId = hasStringProperty(assignment, 'id') ? assignment.id : '';
        if (assignmentId) {
          const exists = await newDb.getById<CrewChange>('crew_changes', assignmentId);
          if (exists) continue;
        }

        // Safely extract assignment properties with type guards
        const vesselId = hasStringProperty(assignment, 'vesselId') ? assignment.vesselId : '';
        const seafarerId = hasStringProperty(assignment, 'seafarerId') ? assignment.seafarerId : '';
        const startDate = hasStringProperty(assignment, 'startDate') ? assignment.startDate : new Date().toISOString();
        const endDate = hasStringProperty(assignment, 'endDate') ? assignment.endDate : undefined;
        const status = hasStringProperty(assignment, 'status') ? assignment.status : '';
        const position = hasStringProperty(assignment, 'position') ? assignment.position : '';
        
        // Get vessel and seafarer details if available
        let vesselName = '';
        let seafarerName = '';
        
        if (vesselId) {
          try {
            const vessel = await newDb.getById<Vessel>('vessels', vesselId);
            if (vessel) {
              vesselName = vessel.name;
            }
          } catch (error) {
            console.warn(`Could not find vessel with id ${vesselId}`, error);
          }
        }
        
        // Get seafarer details
        if (seafarerId) {
          try {
            const seafarer = await newDb.getById<Seafarer>('seafarers', seafarerId);
            if (seafarer) {
              seafarerName = `${seafarer.personalInfo.firstName || ''} ${seafarer.personalInfo.lastName || ''}`.trim();
            }
          } catch (error) {
            console.warn(`Could not find seafarer with id ${seafarerId}`, error);
          }
        }
        
        const newCrewChange: Omit<CrewChange, 'id' | 'createdAt' | 'updatedAt' | 'companyId' | 'createdBy' | 'updatedBy'> = {
          vesselId,
          vesselName,
          port: hasStringProperty(assignment, 'port') ? assignment.port : '',
          scheduledDate: startDate,
          actualDate: status === 'completed' ? (endDate || startDate) : undefined,
          status: this.mapCrewChangeStatus(status),
          notes: hasStringProperty(assignment, 'notes') ? assignment.notes : undefined,
          crewMembers: [
            {
              seafarerId,
              seafarerName,
              rank: position,
              type: 'sign_on',
              status: this.mapCrewMemberStatus(status),
            },
          ],
        };

        // Add the crew change to the database
        try {
          await newDb.createCrewChange(newCrewChange);
        } catch (error) {
          console.error('Error creating crew change:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error migrating crew changes:', error);
      throw error;
    }
  }

  private mapCrewChangeStatus(oldStatus?: string): CrewChange['status'] {
    if (!oldStatus) return 'scheduled';
    
    const statusMap: Record<string, CrewChange['status']> = {
      'active': 'in_progress',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'scheduled': 'scheduled',
    };
    
    return statusMap[oldStatus.toLowerCase()] || 'scheduled';
  }

  private mapCrewMemberStatus(oldStatus?: string): 'scheduled' | 'completed' | 'missed' | 'delayed' {
    if (!oldStatus) return 'scheduled';
    
    const statusMap: Record<string, 'scheduled' | 'completed' | 'missed' | 'delayed'> = {
      'active': 'completed',
      'completed': 'completed',
      'cancelled': 'missed',
      'scheduled': 'scheduled',
    };
    
    return statusMap[oldStatus.toLowerCase()] || 'scheduled';
  }

  private async migratePayrolls(): Promise<void> {
    try {
      // Legacy DB uses singular 'payroll' store name
      const oldPayrolls = await oldDb.getAll('payroll');
      let migratedCount = 0;
      
      for (const oldPayroll of oldPayrolls) {
        if (!isOldPayroll(oldPayroll)) {
          continue;
        }

        const newPayroll: Omit<Payroll, 'id' | 'createdAt' | 'updatedAt' | 'companyId' | 'createdBy' | 'updatedBy'> = {
          seafarerId: oldPayroll.seafarerId,
          seafarerName: '',
          vesselId: oldPayroll.vesselId,
          vesselName: '',
          periodStart: oldPayroll.period?.start || new Date().toISOString(),
          periodEnd: oldPayroll.period?.end || new Date().toISOString(),
          basicSalary: oldPayroll.basicSalary || 0,
          overtimeHours: 0,
          overtimeRate: 0,
          bonuses: [],
          deductions: [],
          netSalary: oldPayroll.netSalary || 0,
          currency: oldPayroll.currency || 'USD',
          paymentDate: oldPayroll.paymentDate || new Date().toISOString(),
          paymentMethod: 'bank_transfer',
          status: this.mapPayrollStatus(oldPayroll.status),
          // Notes is optional in the Payroll interface, so we can safely omit it if not present
          ...(hasStringProperty(oldPayroll, 'notes') && { notes: String(oldPayroll.notes) })
        };

        // Try to get the seafarer name
        try {
          const seafarer = await oldDb.getById('seafarers', oldPayroll.seafarerId) as unknown;
          if (isObject(seafarer)) {
            const seafarerData = seafarer as Record<string, unknown>;
            if (hasProperty(seafarerData, 'personalInfo') && 
                isObject(seafarerData.personalInfo)) {
              const personalInfo = seafarerData.personalInfo as Record<string, unknown>;
              const firstName = hasStringProperty(personalInfo, 'firstName') ? String(personalInfo.firstName) : '';
              const lastName = hasStringProperty(personalInfo, 'lastName') ? String(personalInfo.lastName) : '';
              newPayroll.seafarerName = `${firstName} ${lastName}`.trim();
            }
          }
        } catch (error) {
          // Could not find seafarer - continue without name
        }

        // Try to get the vessel name
        if (oldPayroll.vesselId) {
          try {
            const vessel = await oldDb.getById('vessels', oldPayroll.vesselId);
            if (vessel && isObject(vessel) && hasStringProperty(vessel, 'name')) {
              newPayroll.vesselName = vessel.name;
            }
          } catch (error) {
            // Could not find vessel - continue without name
          }
        }

        await newDb.create('payrolls', newPayroll);
        migratedCount++;
      }
    } catch (error) {
      console.error('Error migrating payrolls:', error);
      throw error;
    }
  }

  private mapPayrollStatus(oldStatus?: string): Payroll['status'] {
    if (!oldStatus) return 'draft';
    
    const statusMap: Record<string, Payroll['status']> = {
      'draft': 'draft',
      'pending': 'pending',
      'approved': 'paid', // Map 'approved' to 'paid' since that's what the Payroll interface expects
      'paid': 'paid',
      'cancelled': 'cancelled'
    };
    
    return statusMap[oldStatus.toLowerCase()] || 'draft';
  }

  private async migrateDocuments(): Promise<void> {
    try {
      // In the old schema, documents are embedded in the seafarer
      const oldSeafarers = await oldDb.getAll('seafarers');
      let documentCount = 0;
      
      for (const seafarer of oldSeafarers) {
        if (!isObject(seafarer) || 
            !hasProperty(seafarer, 'qualifications') || 
            !isObject(seafarer.qualifications) ||
            !hasProperty(seafarer.qualifications, 'certificates') ||
            !Array.isArray(seafarer.qualifications.certificates)) {
          continue;
        }
        
        // Get seafarer details for document reference
        const seafarerId = hasStringProperty(seafarer, 'id') ? seafarer.id : '';
        const firstName = hasStringProperty(seafarer, 'firstName') ? seafarer.firstName : '';
        const lastName = hasStringProperty(seafarer, 'lastName') ? seafarer.lastName : '';
        const seafarerName = `${firstName} ${lastName}`.trim();
        
        for (const cert of seafarer.qualifications.certificates) {
          if (!isObject(cert) ||
              !hasStringProperty(cert, 'name') ||
              !hasStringProperty(cert, 'number') ||
              !hasStringProperty(cert, 'issuedDate')) {
            continue;
          }
          
          const issueDate = hasStringProperty(cert, 'issuedDate') ? cert.issuedDate : new Date().toISOString();
          const expiryDate = hasStringProperty(cert, 'expiryDate') ? cert.expiryDate : undefined;
          const fileUrl = hasStringProperty(cert, 'document') ? cert.document : '';
          
          // Get seafarer details safely
          const seafarerData = seafarer as Record<string, unknown>;
          const seafarerId = hasStringProperty(seafarerData, 'id') ? String(seafarerData.id) : '';
          
          // Get seafarer name safely
          let seafarerName = '';
          if (hasProperty(seafarerData, 'personalInfo') && isObject(seafarerData.personalInfo)) {
            const personalInfo = seafarerData.personalInfo as Record<string, unknown>;
            const firstName = hasStringProperty(personalInfo, 'firstName') ? personalInfo.firstName : '';
            const lastName = hasStringProperty(personalInfo, 'lastName') ? personalInfo.lastName : '';
            seafarerName = `${firstName} ${lastName}`.trim();
          }
          
          const newDocument: Omit<Document, 'id' | 'createdAt' | 'updatedAt' | 'companyId' | 'createdBy' | 'updatedBy'> = {
            type: 'certificate',
            name: String(cert.name),
            description: `Certificate number: ${cert.number}`,
            issueDate: issueDate,
            expiryDate: expiryDate,
            fileUrl: fileUrl,
            mimeType: 'application/pdf',
            fileSize: 0,
            relatedTo: {
              entityType: 'seafarer',
              entityId: seafarerId,
              entityName: seafarerName,
            },
            status: this.getDocumentStatus(expiryDate),
          };

          await newDb.createDocument(newDocument);
          documentCount++;
        }
      }
    } catch (error) {
      console.error('Error migrating documents:', error);
      throw error;
    }
  }

  private getDocumentStatus(expiryDate?: string): Document['status'] {
    if (!expiryDate) return 'valid';
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    if (expiry < now) return 'expired';
    if (expiry <= thirtyDaysFromNow) return 'expiring_soon';
    return 'valid';
  }

  private async migrateNotifications(): Promise<void> {
    try {
      const oldNotifications = await oldDb.getAll('notifications');
      for (const raw of oldNotifications) {
        if (!isObject(raw)) continue;
        const id = hasStringProperty(raw, 'id') ? raw.id : '';
        const exists = await newDb.get(STORE_NAMES.NOTIFICATIONS, id);
        if (exists) continue;
        await newDb.createNotification({
          type: hasStringProperty(raw, 'type') ? raw.type as 'info' | 'warning' | 'error' | 'success' : 'info',
          title: hasStringProperty(raw, 'title') ? raw.title : 'Notification',
          message: hasStringProperty(raw, 'message') ? raw.message : '',
          read: Boolean(raw.read),
          actionUrl: hasStringProperty(raw, 'actionUrl') ? raw.actionUrl : undefined,
        });
      }
    } catch (error) {
      console.error('Error migrating notifications:', error);
      // Don't throw for notifications as they're less critical
    }
  }

  private async markMigrationComplete(): Promise<void> {
    try {
      // Store migration completion in localStorage
      localStorage.setItem('migrationCompleted', 'true');
    } catch (error) {
      console.error('Error marking migration as complete:', error);
      throw error;
    }
  }
}

export const migrator = DatabaseMigrator.getInstance();

// Export a function to be called during app initialization
// Track if migration is in progress
let migrationInProgress = false;

export async function runMigrationIfNeeded(): Promise<boolean> {
  // Legacy browser IndexedDB migration is unnecessary when the Cloudflare
  // Worker is the source of truth. Skipping here also prevents the infinite
  // isInitialized() polling below in remote mode.
  if (isRemoteEnabled()) {
    return false;
  }

  // Skip if already migrated or migration is in progress
  if (localStorage.getItem('databaseMigrationComplete') === 'true' || migrationInProgress) {
    return false;
  }

  migrationInProgress = true;
  
  try {
    // Ensure the database is initialized
    if (!newDb.isInitialized()) {
      await new Promise<void>((resolve) => {
        const checkDb = setInterval(() => {
          if (newDb.isInitialized()) {
            clearInterval(checkDb);
            resolve();
          }
        }, 100);
      });
    }
    
    return await migrator.checkAndMigrate();
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  } finally {
    migrationInProgress = false;
  }
}

// Don't run migration on import, let the app control when to run it
// This prevents race conditions with database initialization
