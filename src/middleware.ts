import { NextRequest, NextResponse } from "next/server";
/**
 * Defense in depth. The service must also be network-isolated behind Traefik.
 * Traefik strips client-supplied Remote-* headers before Authelia sets them.
 */
export function middleware(request: NextRequest) {
  const localBypass = process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";
  if (localBypass) return NextResponse.next();
  const login = request.headers.get("remote-user");
  const allowed = process.env.ALLOWED_USER;
  if (!allowed || login !== allowed) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
