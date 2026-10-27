/** All cash is integer micro-billions: one unit = 1,000 currency units. */
export const SCALE = 1_000_000;
export type Account = { currency: string; units: number };
export type Entry = {
  id: number;
  month: number;
  from: string;
  to: string;
  currency: string;
  units: number;
  memo: string;
  group: string;
};
export type Book = {
  accounts: Record<string, Account>;
  opening: Record<string, number>;
  entries: Entry[];
  nextId: number;
};
export type Transfer = { from: string; to: string; bn: number; memo: string };
export const amount = (book: Book, key: string) =>
  (book.accounts[key]?.units ?? 0) / SCALE;
export function openAccount(
  book: Book,
  key: string,
  currency: string,
  bn: number,
) {
  if (book.accounts[key] || !Number.isFinite(bn) || bn < 0)
    throw Error("Invalid opening account");
  const units = Math.round(bn * SCALE);
  book.accounts[key] = { currency, units };
  book.opening[currency] = (book.opening[currency] || 0) + units;
}
export function settle(
  book: Book,
  transfers: Transfer[],
  month: number,
  group: string,
) {
  const balances = new Map<string, number>();
  const rows: Omit<Entry, "id">[] = [];
  for (const t of transfers) {
    const a = book.accounts[t.from],
      b = book.accounts[t.to],
      units = Math.round(t.bn * SCALE);
    if (
      !a ||
      !b ||
      a.currency !== b.currency ||
      !Number.isSafeInteger(units) ||
      units < 0
    )
      return false;
    const source = balances.get(t.from) ?? a.units;
    if (source < units) return false;
    if (t.from !== t.to) {
      balances.set(t.from, source - units);
      balances.set(t.to, (balances.get(t.to) ?? b.units) + units);
    }
    rows.push({
      month,
      from: t.from,
      to: t.to,
      currency: a.currency,
      units,
      memo: t.memo,
      group,
    });
  }
  for (const [key, value] of balances) book.accounts[key].units = value;
  for (const row of rows)
    if (row.units) book.entries.unshift({ ...row, id: book.nextId++ });
  book.entries = book.entries.slice(0, 500);
  return true;
}
export function audit(book: Book) {
  const totals: Record<string, number> = {};
  for (const a of Object.values(book.accounts)) {
    if (!Number.isSafeInteger(a.units) || a.units < 0) return false;
    totals[a.currency] = (totals[a.currency] || 0) + a.units;
  }
  return Object.keys({ ...book.opening, ...totals }).every(
    (c) => totals[c] === book.opening[c],
  );
}
