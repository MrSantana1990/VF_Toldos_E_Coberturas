import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  quotes,
  InsertQuote,
  appointments,
  InsertAppointment,
  transactions,
  InsertTransaction,
  galleryImages,
  InsertGalleryImage,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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
      values.role = "admin";
      updateSet.role = "admin";
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

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Queries para Orçamentos
export async function getQuotes(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(quotes).limit(limit).offset(offset);
  return result;
}

export async function getQuotesStats() {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, completed: 0 };
  const allQuotes = await db.select().from(quotes);
  return {
    total: allQuotes.length,
    pending: allQuotes.filter(q => q.status === "pending").length,
    completed: allQuotes.filter(q => q.status === "completed").length,
  };
}

export async function getQuoteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, id))
    .limit(1);
  return result[0];
}

export async function createQuote(data: InsertQuote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quotes).values(data);
  return result;
}

export async function updateQuoteStatus(
  id: number,
  status: "pending" | "completed" | "rejected"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(quotes).set({ status }).where(eq(quotes.id, id));
}

export async function updateQuote(id: number, patch: Partial<InsertQuote>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!Object.keys(patch).length) return;
  await db.update(quotes).set(patch).where(eq(quotes.id, id));
}

export async function deleteQuote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(quotes).where(eq(quotes.id, id));
}

// Queries para Agendamentos
export async function getAppointments(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select()
    .from(appointments)
    .limit(limit)
    .offset(offset);
  return result;
}

export async function createAppointment(data: InsertAppointment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(appointments).values(data);
  return result;
}

export async function updateAppointmentStatus(
  id: number,
  status: "agendado" | "concluido" | "cancelado"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(appointments).set({ status }).where(eq(appointments.id, id));
}

export async function deleteAppointment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(appointments).where(eq(appointments.id, id));
}

// Queries para Transações
export async function getTransactions(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select()
    .from(transactions)
    .limit(limit)
    .offset(offset);
  return result;
}

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(transactions).values(data);
  return result;
}

export async function deleteTransaction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(transactions).where(eq(transactions.id, id));
}

// Queries para Galeria
export async function getGalleryImages(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select()
    .from(galleryImages)
    .orderBy(desc(galleryImages.displayOrder))
    .limit(limit)
    .offset(offset);
  return result;
}

export async function createGalleryImage(data: InsertGalleryImage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(galleryImages).values(data);
  return result;
}

// TODO: add feature queries here as your schema grows.
