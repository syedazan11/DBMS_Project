import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../../../../utils/dbConfig";
import { expenseTags, expenses, tags } from "../../../../../../utils/schema";
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

const parseExpenseId = (params) => {
  const expenseId = Number(params?.expenseId);
  return Number.isFinite(expenseId) ? expenseId : null;
};

const assertExpenseOwnership = async (expenseId, userId) => {
  const owner = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
    .limit(1);
  return owner.length > 0;
};

export async function GET(_request, { params }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expenseId = parseExpenseId(params);
    if (!expenseId) {
      return NextResponse.json({ error: "Invalid expense id." }, { status: 400 });
    }

    const ownsExpense = await assertExpenseOwnership(expenseId, userId);
    if (!ownsExpense) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }

    const result = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
      })
      .from(expenseTags)
      .innerJoin(tags, eq(expenseTags.tagId, tags.id))
      .where(and(eq(expenseTags.expenseId, expenseId), eq(tags.userId, userId)));

    return NextResponse.json({ tags: result }, { status: 200 });
  } catch (error) {
    console.error("GET /api/expenses/[expenseId]/tags failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense tags." },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expenseId = parseExpenseId(params);
    if (!expenseId) {
      return NextResponse.json({ error: "Invalid expense id." }, { status: 400 });
    }

    const ownsExpense = await assertExpenseOwnership(expenseId, userId);
    if (!ownsExpense) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }

    const body = await request.json();
    const rawTagIds = Array.isArray(body?.tagIds) ? body.tagIds : null;
    if (!rawTagIds) {
      return NextResponse.json({ error: "tagIds must be an array." }, { status: 400 });
    }

    const tagIds = [...new Set(rawTagIds.map(Number))].filter((id) =>
      Number.isFinite(id)
    );

    if (tagIds.length > 0) {
      const validTags = await db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.userId, userId), inArray(tags.id, tagIds)));

      if (validTags.length !== tagIds.length) {
        return NextResponse.json(
          { error: "One or more tags are invalid for this user." },
          { status: 400 }
        );
      }
    }

    await db.delete(expenseTags).where(eq(expenseTags.expenseId, expenseId));

    if (tagIds.length > 0) {
      await db.insert(expenseTags).values(
        tagIds.map((tagId) => ({
          expenseId,
          tagId,
        }))
      );
    }

    return NextResponse.json({ success: true, tagIds }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/expenses/[expenseId]/tags failed:", error);
    return NextResponse.json(
      { error: "Failed to update expense tags." },
      { status: 500 }
    );
  }
}
