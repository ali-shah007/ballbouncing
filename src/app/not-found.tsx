import Link from "next/link";
export default function NotFound() {
  return (
    <main className="article">
      <div className="eyebrow">A LITTLE OFF COURSE</div>
      <h1>This orbit doesn’t exist.</h1>
      <p>Let’s find a new little universe.</p>
      <Link href="/" className="primary">
        Back to the studio →
      </Link>
    </main>
  );
}
