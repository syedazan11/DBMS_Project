import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../../../utils/dbConfig";
import { tags } from "../../../../utils/schema";
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

export async function GET(request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nameQuery = searchParams.get("name")?.trim();

    const whereClause = nameQuery
      ? and(eq(tags.userId, userId), eq(tags.name, nameQuery))
      : eq(tags.userId, userId);

    const result = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        userId: tags.userId,
        createdAt: tags.createdAt,
      })
      .from(tags)
      .where(whereClause)
      .orderBy(asc(tags.name));

    return NextResponse.json({ tags: result }, { status: 200 });
  } catch (error) {
    console.error("GET /api/tags failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const rawName = typeof body?.name === "string" ? body.name.trim() : "";
    const color =
      typeof body?.color === "string" && body.color.trim()
        ? body.color.trim()
        : "#000000";

    if (!rawName) {
      return NextResponse.json(
        { error: "Tag name is required." },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.userId, userId), eq(tags.name, rawName)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Tag with this name already exists." },
        { status: 409 }
      );
    }

    const created = await db
      .insert(tags)
      .values({
        name: rawName,
        color,
        userId,
        createdAt: new Date(),
      })
      .returning({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        userId: tags.userId,
        createdAt: tags.createdAt,
      });

    return NextResponse.json({ tag: created[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tags failed:", error);
    return NextResponse.json(
      { error: "Failed to create tag." },
      { status: 500 }
    );
  }
}
