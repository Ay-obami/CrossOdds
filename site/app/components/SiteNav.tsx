import Link from "next/link";

type Active = "home" | "explore" | "basket" | "docs" | "reference";
export default function SiteNav({ active }: { active: Active }) {
  return (
    <nav className="sitenav">
      <div className="wrap row">
        <Link href="/" className="wordmark"><span className="chip" />CrossOdds</Link>
        <div className="navlinks">
          <Link href="/explore" className={active === "explore" ? "active" : ""}>Explore</Link>
          <Link href="/basket" className={active === "basket" ? "active" : ""}>Basket</Link>
          <Link href="/docs" className={active === "docs" ? "active" : ""}>Docs</Link>
          <a className="gh-btn" href="https://github.com/Ay-obami/CrossOdds" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </div>
    </nav>
  );
}
