import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Known locality subdomains. Requests to <locality>.localagendawatch.com
// are 308-redirected to https://www.localagendawatch.com/<locality>/<rest>.
const LOCALITIES = new Set(["nampa"]);
const APEX_ORIGIN = "https://www.localagendawatch.com";

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const parts = host.split(".");
  if (parts.length < 3) return;

  const [subdomain, ...rest] = parts;
  if (rest.join(".") !== "localagendawatch.com") return;
  if (!LOCALITIES.has(subdomain)) return;

  const { pathname, search } = request.nextUrl;
  const prefix = `/${subdomain}`;

  // If the visitor already typed /locality or /locality/..., strip it before
  // re-prefixing so we never end up with /nampa/nampa/....
  let suffix: string;
  if (pathname === "/" || pathname === prefix) {
    suffix = "";
  } else if (pathname.startsWith(`${prefix}/`)) {
    suffix = pathname.slice(prefix.length);
  } else {
    suffix = pathname;
  }

  const target = new URL(`${prefix}${suffix}${search}`, APEX_ORIGIN);
  return NextResponse.redirect(target, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
