import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../../../../utils/dbConfig";
import { expenseTags, expenses, tags } from "../../../../../utils/schema";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";

const getSessionUserId = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload?.id) return null;

  const userId = Number(payload.id);
  return Number.isFinite(userId) ? userId : null;
};

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select({
        expenseId: expenses.id,
        expenseName: expenses.name,
        amount: expenses.amount,
        budgetId: expenses.budgetId,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
        tagId: tags.id,
        tagName: tags.name,
        tagColor: tags.color,
      })
      .from(expenses)
      .leftJoin(expenseTags, eq(expenses.id, expenseTags.expenseId))
      .leftJoin(tags, and(eq(expenseTags.tagId, tags.id), eq(tags.userId, userId)))
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.createdAt));

    const expensesMap = new Map();
    for (const row of rows) {
      if (!expensesMap.has(row.expenseId)) {
        expensesMap.set(row.expenseId, {
          id: row.expenseId,
          name: row.expenseName,
          amount: row.amount,
          budgetId: row.budgetId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          tags: [],
        });
      }

      if (row.tagId) {
        expensesMap.get(row.expenseId).tags.push({
          id: row.tagId,
          name: row.tagName,
          color: row.tagColor,
        });
      }
    }

    return NextResponse.json(
      { expenses: Array.from(expensesMap.values()) },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/expenses/with-tags failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses with tags." },
      { status: 500 }
    );
  }
}
