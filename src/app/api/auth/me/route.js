import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, toClientUser, verifySessionToken } from "@/lib/auth-session";

export async function GET() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json(
    {
      user: toClientUser({
        id: Number(payload.id),
        name: String(payload.name),
        email: String(payload.email),
        imageUrl: payload.imageUrl ? String(payload.imageUrl) : null,
      }),
    },
    { status: 200 }
  );
}
