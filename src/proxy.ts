import { NextRequest, NextResponse } from "next/server";
import {
  accessConfig,
  credentials,
  session,
  validSession,
  safeNext,
} from "./lib/access";
const attempts = new Map<string, { count: number; until: number }>();
const cookie = "orbit_session";
function privateResponse(r: NextResponse) {
  r.headers.set("Cache-Control", "private, no-store, max-age=0");
  r.headers.set("X-Robots-Tag", "noindex, nofollow");
  return r;
}
function login(message = "", status = 200, next = "/shorts-lab") {
  const escaped = next
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
  return privateResponse(
    new NextResponse(
      `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in · Orbit Studio</title><style>*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#0a101c;color:#eef4ff;font:16px system-ui}main{width:min(440px,92vw);padding:36px;background:#151f31;border:1px solid #30415b;border-radius:24px}h1{font-size:36px;margin:14px 0}p{color:#a9bbd6;line-height:1.6}label{display:block;margin:22px 0 8px}input,button{width:100%;padding:14px;border-radius:10px;font:inherit}input{background:#0a101c;border:1px solid #4a607f;color:white}button{margin-top:24px;background:#b8f481;border:0;font-weight:700;cursor:pointer}.error{color:#ffbaa5}</style><main><small>ORBIT STUDIO / PRIVATE WORKSPACE</small><h1>Welcome back.</h1><p>Sign in to create, simulate and record your next episode.</p>${message ? `<p class="error" role="alert">${message}</p>` : ""}<form method="post" action="/login"><input type="hidden" name="next" value="${escaped}"><label for="user">Username</label><input id="user" name="username" autocomplete="username" required maxlength="128"><label for="pass">Password</label><input id="pass" name="password" type="password" autocomplete="current-password" required maxlength="256"><button>Sign in</button></form></main></html>`,
      {
        status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
          "X-Content-Type-Options": "nosniff",
        },
      },
    ),
  );
}
export async function proxy(req: NextRequest) {
  const base = new URL(req.url);
  base.host = req.headers.get("host") || base.host;
  if (req.headers.get("x-forwarded-proto") === "https")
    base.protocol = "https:";
  const c = accessConfig();
  const path = req.nextUrl.pathname;
  if (!c)
    return login(
      "Private workspace setup required. Configure STUDIO_LOGIN_USER, STUDIO_LOGIN_PASSWORD (12+ characters) and STUDIO_SESSION_SECRET (32+ characters) on the server.",
      503,
    );
  if (req.method === "POST" && (path === "/login" || path === "/logout")) {
    if (req.headers.get("origin") !== base.origin)
      return new NextResponse("Invalid origin", { status: 403 });
    if (Number(req.headers.get("content-length") || 0) > 4096)
      return new NextResponse("Request too large", { status: 413 });
    if (path === "/logout") {
      const r = NextResponse.redirect(new URL("/login", base), 303);
      r.cookies.delete(cookie);
      return privateResponse(r);
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
    const now = Date.now();
    for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
    const attempt = attempts.get(ip) || { count: 0, until: now + 900000 };
    if (attempt.count >= 10) {
      const r = login("Too many attempts. Try again in 15 minutes.", 429);
      r.headers.set(
        "Retry-After",
        String(Math.ceil((attempt.until - now) / 1000)),
      );
      return r;
    }
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return login("Invalid sign-in request.", 400);
    }
    const next = safeNext(String(form.get("next") || ""));
    if (
      !credentials(
        c,
        String(form.get("username") || ""),
        String(form.get("password") || ""),
      )
    ) {
      attempt.count++;
      if (attempts.size < 10000) attempts.set(ip, attempt);
      return login("Incorrect username or password.", 401, next);
    }
    attempts.delete(ip);
    const r = NextResponse.redirect(new URL(next, base), 303);
    r.cookies.set(cookie, session(c), {
      httpOnly: true,
      secure: base.protocol === "https:",
      sameSite: "strict",
      path: "/",
      maxAge: 86400,
    });
    return privateResponse(r);
  }
  const valid = validSession(c, req.cookies.get(cookie)?.value || "");
  if (path === "/login")
    return valid
      ? privateResponse(NextResponse.redirect(new URL("/shorts-lab", base)))
      : login("", 200, safeNext(req.nextUrl.searchParams.get("next")));
  if (!valid) {
    const url = new URL("/login", base);
    url.searchParams.set("next", path + req.nextUrl.search);
    return privateResponse(NextResponse.redirect(url));
  }
  return privateResponse(NextResponse.next());
}
export const config = {
  matcher: ["/((?!_next/static|_next/webpack-hmr|favicon.ico|icon.svg).*)"],
};
