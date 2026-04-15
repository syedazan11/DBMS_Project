import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../../../../utils/dbConfig";
import { users } from "../../../../../utils/schema";
import {
  createSessionToken,
  setSessionCookie,
  toClientUser,
} from "@/lib/auth-session";

export async function POST(request) {
  try {
    const body = await request.json();
    const name = body?.name?.trim();
    const email = body?.email?.trim()?.toLowerCase();
    const password = body?.password;

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return NextResponse.json(
        { message: "An account already exists with this email." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        imageUrl: users.imageUrl,
      });

    const token = await createSessionToken(newUser);
    const response = NextResponse.json({ user: toClientUser(newUser) }, { status: 201 });
    setSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.json(
      { message: "Unable to create account right now." },
      { status: 500 }
    );
  }
}
