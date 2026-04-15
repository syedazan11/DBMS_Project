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
    const email = body?.email?.trim()?.toLowerCase();
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 }
      );
    }

    const [foundUser] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        imageUrl: users.imageUrl,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email));

    if (!foundUser) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, foundUser.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = await createSessionToken(foundUser);
    const response = NextResponse.json(
      {
        user: toClientUser(foundUser),
      },
      { status: 200 }
    );
    setSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.json(
      { message: "Unable to sign in right now." },
      { status: 500 }
    );
  }
}
