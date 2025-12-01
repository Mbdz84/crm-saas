import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token");

  // Public routes
  if (req.nextUrl.pathname.startsWith("/login")) {
    if (token) {
      // 🔥 FIX: redirect logged-in users to a REAL page
      return NextResponse.redirect(new URL("/dashboard/jobs", req.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login"
  ],
};