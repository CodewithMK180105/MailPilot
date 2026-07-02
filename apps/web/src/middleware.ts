import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isAuthenticated = !!session;

  // Public routes that don't require authentication
  const isPublicRoute =
    nextUrl.pathname === "/" ||
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register");

  const isAuthPage =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register");

  // Redirect authenticated users away from login/register pages only
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/campaigns", nextUrl));
  }

  // Redirect unauthenticated users from protected pages → login
  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
