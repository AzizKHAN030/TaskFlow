import { NextRequest, NextResponse } from "next/server";

function hasAuthCookie(req: NextRequest) {
  return (
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token") ||
    req.cookies.has("next-auth.session-token") ||
    req.cookies.has("__Secure-next-auth.session-token")
  );
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isLogin = path.startsWith("/login");
  const isAuthApi = path.startsWith("/api/auth");
  const isPublicAsset =
    path.startsWith("/_next") || path.startsWith("/favicon.ico") || path.startsWith("/images");

  if (isAuthApi || isPublicAsset) {
    return NextResponse.next();
  }

  const signedIn = hasAuthCookie(req);

  if (!signedIn && !isLogin) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", path + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (signedIn && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
