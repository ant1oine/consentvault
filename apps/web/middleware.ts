import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Public routes (always accessible)
  const publicPaths = [
    "/", // homepage
    "/login", // login page
    "/privacy",
    "/terms",
    "/contact",
    "/_next",
    "/favicon.ico",
    "/assets",
  ];

  // Allow static files and public pages
  // Check exact match for homepage, or prefix match for other public paths
  if (
    pathname === "/" ||
    publicPaths.filter((path) => path !== "/").some((path) => pathname.startsWith(path))
  ) {
    return NextResponse.next();
  }

  // 🔒 Protected routes - AuthGuard component handles client-side protection
  // Note: Middleware runs server-side and can't access localStorage,
  // so we rely on AuthGuard for actual authentication checks
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

