import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const shouldLog =
    process.env.NODE_ENV === "production" || process.env.NOX_HTTP_LOG === "1";

  if (shouldLog) {
    const ts = new Date().toISOString();
    const method = request.method;
    const path = request.nextUrl.pathname;
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for") ??
      "unknown";
    const ua = (request.headers.get("user-agent") ?? "").slice(0, 100);

    // structured JSON → stdout → Docker captures to log file
    console.log(JSON.stringify({ ts, method, path, ip, ua }));
  }

  return NextResponse.next();
}

export const config = {
  // skip Next.js internals and static assets
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
