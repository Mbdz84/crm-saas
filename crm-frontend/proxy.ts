import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};

export function proxy(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  const url = req.nextUrl.clone();
  const isLoginPage = url.pathname.startsWith("/login");
  const isDashboard = url.pathname.startsWith("/dashboard");

  // Not logged in → redirect dashboard → login
  if (!token && isDashboard) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged in → redirect login → dashboard
  if (token && isLoginPage) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}