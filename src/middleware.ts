import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";

const authRoutes = ["/sign-in", "/sign-up"];

export default async function middleware(request) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = pathname.startsWith("/dashboard");

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const isAuthenticated = Boolean(session);

  if (isProtectedRoute && !isAuthenticated) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthenticated && authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in", "/sign-up"],
};
