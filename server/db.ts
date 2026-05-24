import { eq, gte, lte, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, expenses, InsertExpense, debts, InsertDebt, categories, tags, expenseTags } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Expenses queries
export async function getUserExpenses(userId: number, filters?: { startDate?: Date; endDate?: Date; categoryId?: number }) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [eq(expenses.userId, userId)];
  
  if (filters?.startDate) {
    conditions.push(gte(expenses.date, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(expenses.date, filters.endDate));
  }
  if (filters?.categoryId) {
    conditions.push(eq(expenses.categoryId, filters.categoryId));
  }

  return db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.date));
}

export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(expenses).values(data);
}

export async function updateExpense(id: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(expenses).set(data).where(eq(expenses.id, id));
}

export async function deleteExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(expenses).where(eq(expenses.id, id));
}

// Debts queries
export async function getUserDebts(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(debts).where(eq(debts.userId, userId)).orderBy(desc(debts.dueDate));
}

export async function createDebt(data: InsertDebt) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(debts).values(data);
}

export async function updateDebt(id: number, data: Partial<InsertDebt>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(debts).set(data).where(eq(debts.id, id));
}

export async function deleteDebt(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(debts).where(eq(debts.id, id));
}

// Categories queries
export async function getCategories() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(categories).orderBy(categories.name);
}

// Tags queries
export async function getUserTags(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(tags).where(eq(tags.userId, userId)).orderBy(tags.name);
}

export async function createTag(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(tags).values({ userId, name });
}

// Expense tags queries
export async function addExpenseTag(expenseId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(expenseTags).values({ expenseId, tagId });
}

export async function removeExpenseTag(expenseId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(expenseTags).where(
    and(eq(expenseTags.expenseId, expenseId), eq(expenseTags.tagId, tagId))
  );
}

// Get expense by ID
export async function getExpenseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Get debt by ID
export async function getDebtById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(debts).where(eq(debts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Dashboard metrics
export async function getExpenseMetrics(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return { totalExpenses: 0, expensesByCategory: [] };

  const result = await db
    .select({
      categoryId: expenses.categoryId,
      categoryName: categories.name,
      total: expenses.amount,
    })
    .from(expenses)
    .innerJoin(categories, eq(expenses.categoryId, categories.id))
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.date, startDate),
        lte(expenses.date, endDate)
      )
    );

  return result;
}
