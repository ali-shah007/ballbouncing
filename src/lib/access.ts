import { createHash, createHmac, timingSafeEqual } from "node:crypto";
export type AccessConfig = { user: string; password: string; secret: string };
export function accessConfig(): AccessConfig | null {
  const user = process.env.STUDIO_LOGIN_USER;
  const password = process.env.STUDIO_LOGIN_PASSWORD;
  const secret = process.env.STUDIO_SESSION_SECRET;
  return user &&
    password &&
    password.length >= 12 &&
    secret &&
    secret.length >= 32
    ? { user, password, secret }
    : null;
}
function equal(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}
export function credentials(c: AccessConfig, user: string, password: string) {
  const u = equal(c.user, user);
  const p = equal(c.password, password);
  return u && p;
}
function signature(c: AccessConfig, payload: string) {
  return createHmac("sha256", c.secret)
    .update(
      payload +
        ":" +
        c.user +
        ":" +
        createHash("sha256").update(c.password).digest("hex"),
    )
    .digest("base64url");
}
export function session(c: AccessConfig, now = Date.now()) {
  const payload = String(now + 86400000);
  return payload + "." + signature(c, payload);
}
export function validSession(c: AccessConfig, token: string, now = Date.now()) {
  const [exp, sig, ...extra] = token.split(".");
  const n = Number(exp);
  return (
    extra.length === 0 &&
    /^\d+$/.test(exp || "") &&
    n > now &&
    n <= now + 86400000 &&
    equal(sig || "", signature(c, exp))
  );
}
export function safeNext(value: string | null) {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u0020\u007f]/.test(value) &&
    !value.startsWith("/login") &&
    !value.startsWith("/logout")
    ? value
    : "/shorts-lab";
}
