import { it, expect } from "vitest";
import { session, validSession, credentials, safeNext } from "./access";
const c = {
  user: "owner",
  password: "test-only-password-long",
  secret: "test-only-session-secret-over-32-characters",
};
it("rejects forged, expired and rotated sessions", () => {
  const now = 100000;
  const token = session(c, now);
  expect(validSession(c, token, now)).toBe(true);
  expect(validSession(c, token + "x", now)).toBe(false);
  expect(validSession(c, token, now + 86400001)).toBe(false);
  expect(
    validSession({ ...c, password: "different-password" }, token, now),
  ).toBe(false);
  expect(validSession(c, "anything", now)).toBe(false);
});
it("requires both credentials and keeps login return URLs local", () => {
  expect(credentials(c, c.user, c.password)).toBe(true);
  expect(credentials(c, c.user, "wrong")).toBe(false);
  for (const next of [
    "//evil.test",
    "/\t/evil.test",
    "https://evil.test",
    "/\\evil.test",
    "/login",
  ]) {
    expect(safeNext(next)).toBe("/shorts-lab");
  }
  expect(safeNext("/nation-state")).toBe("/nation-state");
});
