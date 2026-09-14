import { db } from '@/lib/database2';
import { STORE_NAMES, INDEX_NAMES } from '@/lib/schemas_v2';
import { 
  storeSchemas, 
  Assignment, 
  Rank, 
  Payroll,
  AssignmentStatus,
  PayrollStatus,
  PayrollItem,
  PaymentMethod
} from '@/lib/validation/personnel.schemas';
import { isOfType } from '@/lib/validation/typeGuards';

type StoreName = keyof typeof storeSchemas;
type EntityType<T extends StoreName> = T extends typeof STORE_NAMES.RANKS
  ? Rank
  : T extends typeof STORE_NAMES.CREW_ASSIGNMENTS
  ? Assignment
  : T extends typeof STORE_NAMES.PAYROLLS
  ? Payroll
  : never;

class PersonnelApi {
  private async getAll<T extends StoreName>(storeName: T): Promise<EntityType<T>[]> {
    try {
      const items = await db.getAll(storeName);
      return items.filter((item): item is EntityType<T> => 
        isOfType(storeSchemas[storeName], item)
      );
    } catch (error) {
      console.error(`Error fetching ${storeName}:`, error);
      throw new Error(`Failed to fetch ${storeName}`);
    }
  }

  private async getById<T extends StoreName>(
    storeName: T,
    id: string
  ): Promise<EntityType<T> | undefined> {
    try {
      const item = await db.get(storeName, id);
      return isOfType(storeSchemas[storeName], item) ? item : undefined;
    } catch (error) {
      console.error(`Error fetching ${storeName} with id ${id}:`, error);
      throw new Error(`Failed to fetch ${storeName}`);
    }
  }

  private async create<T extends StoreName>(
    storeName: T,
    data: Omit<EntityType<T>, keyof EntityType<T> & { id: string; createdAt: string; updatedAt: string }>,
    userId: string
  ): Promise<EntityType<T>> {
    try {
      const now = new Date().toISOString();
      const entity = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      } as EntityType<T>;

      const [validated] = await Promise.all([
        this.validate(storeName, entity),
        db.create(storeName, entity),
      ]);

      return validated;
    } catch (error) {
      console.error(`Error creating ${storeName}:`, error);
      throw new Error(`Failed to create ${storeName}`);
    }
  }

  private async update<T extends StoreName>(
    storeName: T,
    id: string,
    data: Partial<Omit<EntityType<T>, 'id' | 'createdAt' | 'createdBy'>>,
    userId: string
  ): Promise<EntityType<T>> {
    try {
      const existing = await this.getById(storeName, id);
      if (!existing) {
        throw new Error(`${storeName} not found`);
      }

      const updated = {
        ...existing,
        ...data,
        id,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      } as EntityType<T>;

      const [validated] = await Promise.all([
        this.validate(storeName, updated),
        db.update(storeName, id, updated),
      ]);

      return validated;
    } catch (error) {
      console.error(`Error updating ${storeName} ${id}:`, error);
      throw new Error(`Failed to update ${storeName}`);
    }
  }

  private async delete<T extends StoreName>(
    storeName: T,
    id: string
  ): Promise<boolean> {
    try {
      await db.delete(storeName, id);
      return true;
    } catch (error) {
      console.error(`Error deleting ${storeName} ${id}:`, error);
      throw new Error(`Failed to delete ${storeName}`);
    }
  }

  private async validate<T extends StoreName>(
    storeName: T,
    data: unknown
  ): Promise<EntityType<T>> {
    const schema = storeSchemas[storeName];
    const result = schema.safeParse(data);
    
    if (!result.success) {
      const errors = result.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      throw new Error(`Validation failed for ${storeName}:\n${errors}`);
    }
    
    return result.data as EntityType<T>;
  }

  // Public methods for Ranks
  async getRanks(): Promise<Rank[]> {
    return this.getAll(STORE_NAMES.RANKS);
  }

  async getRankById(id: string): Promise<Rank | undefined> {
    return this.getById(STORE_NAMES.RANKS, id);
  }

  async createRank(data: Omit<Rank, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, userId: string): Promise<Rank> {
    return this.create(STORE_NAMES.RANKS, data, userId);
  }

  async updateRank(id: string, data: Partial<Omit<Rank, 'id' | 'createdAt' | 'createdBy'>>, userId: string): Promise<Rank> {
    return this.update(STORE_NAMES.RANKS, id, data, userId);
  }

  async deleteRank(id: string): Promise<boolean> {
    return this.delete(STORE_NAMES.RANKS, id);
  }

  // Public methods for Assignments
  async getAssignments(): Promise<Assignment[]> {
    return this.getAll(STORE_NAMES.CREW_ASSIGNMENTS);
  }

  async getAssignmentById(id: string): Promise<Assignment | undefined> {
    return this.getById(STORE_NAMES.CREW_ASSIGNMENTS, id);
  }

  async getAssignmentsBySeafarer(seafarerId: string): Promise<Assignment[]> {
    try {
      const assignments = await db.getByIndex(
        STORE_NAMES.CREW_ASSIGNMENTS,
        INDEX_NAMES.CREW_ASSIGNMENTS_BY_SEAFARER,
        seafarerId
      );
      return assignments.filter((a): a is Assignment => 
        isOfType(storeSchemas[STORE_NAMES.CREW_ASSIGNMENTS], a)
      );
    } catch (error) {
      console.error('Error fetching assignments by seafarer:', error);
      throw new Error('Failed to fetch assignments');
    }
  }

  async createAssignment(
    data: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, 
    userId: string
  ): Promise<Assignment> {
    return this.create(STORE_NAMES.CREW_ASSIGNMENTS, data, userId);
  }

  async updateAssignment(
    id: string, 
    data: Partial<Omit<Assignment, 'id' | 'createdAt' | 'createdBy'>>, 
    userId: string
  ): Promise<Assignment> {
    return this.update(STORE_NAMES.CREW_ASSIGNMENTS, id, data, userId);
  }

  async deleteAssignment(id: string): Promise<boolean> {
    return this.delete(STORE_NAMES.CREW_ASSIGNMENTS, id);
  }

  // Public methods for Payrolls
  async getPayrolls(): Promise<Payroll[]> {
    return this.getAll(STORE_NAMES.PAYROLLS);
  }

  async getPayrollById(id: string): Promise<Payroll | undefined> {
    return this.getById(STORE_NAMES.PAYROLLS, id);
  }

  async getPayrollsBySeafarer(seafarerId: string): Promise<Payroll[]> {
    try {
      const payrolls = await db.getByIndex(
        STORE_NAMES.PAYROLLS,
        INDEX_NAMES.PAYROLLS_BY_SEAFARER,
        seafarerId
      );
      return payrolls.filter((p): p is Payroll => 
        isOfType(storeSchemas[STORE_NAMES.PAYROLLS], p)
      );
    } catch (error) {
      console.error('Error fetching payrolls by seafarer:', error);
      throw new Error('Failed to fetch payrolls');
    }
  }

  async createPayroll(
    data: Omit<Payroll, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, 
    userId: string
  ): Promise<Payroll> {
    return this.create(STORE_NAMES.PAYROLLS, data, userId);
  }

  async updatePayroll(
    id: string, 
    data: Partial<Omit<Payroll, 'id' | 'createdAt' | 'createdBy'>>, 
    userId: string
  ): Promise<Payroll> {
    return this.update(STORE_NAMES.PAYROLLS, id, data, userId);
  }

  async deletePayroll(id: string): Promise<boolean> {
    return this.delete(STORE_NAMES.PAYROLLS, id);
  }

  // Utility methods
  async calculatePayroll(
    assignmentId: string,
    periodStart: string,
    periodEnd: string,
    items: Omit<PayrollItem, 'id' | 'total'>[]
  ): Promise<{
    basicSalary: number;
    items: PayrollItem[];
    totalEarnings: number;
    totalDeductions: number;
    netPay: number;
  }> {
    // In a real app, this would calculate based on assignment details, working days, etc.
    const calculatedItems = items.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      total: item.amount * (item.quantity || 1) * (item.rate || 1),
    }));

    const totalEarnings = calculatedItems
      .filter(item => ['salary', 'overtime', 'bonus', 'allowance', 'reimbursement'].includes(item.type))
      .reduce((sum, item) => sum + item.total, 0);

    const totalDeductions = calculatedItems
      .filter(item => ['deduction', 'tax'].includes(item.type))
      .reduce((sum, item) => sum + item.total, 0);

    return {
      basicSalary: calculatedItems.find(item => item.type === 'salary')?.total || 0,
      items: calculatedItems,
      totalEarnings,
      totalDeductions,
      netPay: totalEarnings - totalDeductions,
    };
  }
}

export const personnelApi = new PersonnelApi();

export type { Assignment, Rank, Payroll, AssignmentStatus, PayrollStatus, PayrollItem, PaymentMethod };
