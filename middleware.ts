import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token");
  const url = req.nextUrl.clone();

  // Routes that require authentication
  const protectedRoutes = [
    "/dashboard",
    "/billing",
    "/branches",
    "/sales-person",
    "/targets",
    "/my-targets",
    "/advance-booking",
    "/daybook",
    "/inventory-transfer-dashboard",
    "/inventory-transfer-form",
    "/invoice-form",
    "/qr-upload"
  ];

  // Routes that require admin role (protected at client-side)
  const adminOnlyRoutes = [
    "/dashboard",
    "/daybook",
    "/targets",
    "/branches",
    "/sales-person"
  ];

  const isProtectedRoute = protectedRoutes.some((path) => url.pathname.startsWith(path));

  // Redirect to login if not authenticated
  if (!token && isProtectedRoute) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
