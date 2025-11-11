import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("access_token")?.value;

  // ✅ Public routes (always accessible)
  const publicPaths = [
    "/", // homepage
    "/login",
    "/create-org", // Allow access to create-org (will check auth in component)
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

  // 🔒 Protect everything else
  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // ✅ Allow access if token exists (validation happens in components)
  // Note: We don't validate the token here to avoid blocking on every request
  // Components will handle 401 responses and redirect appropriately
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

