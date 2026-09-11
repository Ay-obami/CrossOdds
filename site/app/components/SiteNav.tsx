"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Active = "home" | "explore" | "basket" | "docs" | "reference";

export default function SiteNav({ active }: { active: Active }) {
  const [apiLive, setApiLive] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_CROSSODDS_API_URL || process.env.NEXT_PUBLIC_READOUT_API_URL;
    if (!base) { setApiLive(false); return; }
    const controller = new AbortController();
    fetch(`${base.replace(/\/$/, "")}/health`, { signal: controller.signal })
      .then((response) => setApiLive(response.ok))
      .catch(() => { if (!controller.signal.aborted) setApiLive(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return <nav className="sitenav">
    <div className="wrap row">
      <div className="brand-cluster">
        <Link href="/" className="wordmark" onClick={closeMenu}><span className="chip" />CrossOdds</Link>
        <span className={`network-pill ${apiLive ? "live" : ""}`}><i />{apiLive === null ? "Checking Somnia" : apiLive ? "Live on Somnia" : "Somnia"}</span>
      </div>

      <div className="navlinks">
        <Link href="/explore" className={active === "explore" ? "active" : ""}>Explore</Link>
        <Link href="/basket" className={active === "basket" ? "active" : ""}>Basket Builder</Link>
        <Link href="/docs" className={active === "docs" || active === "reference" ? "active" : ""}>Docs</Link>
        <a className="gh-btn" href="https://github.com/Ay-obami/CrossOdds" target="_blank" rel="noopener noreferrer" aria-label="CrossOdds on GitHub">GitHub ↗</a>
      </div>

      <button
        type="button"
        className="mobile-nav-toggle"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >{menuOpen ? "×" : "☰"}</button>
    </div>

    <div className={`mobile-nav-panel ${menuOpen ? "open" : ""}`}>
      <Link href="/explore" onClick={closeMenu} className={active === "explore" ? "active" : ""}>Explore live markets</Link>
      <Link href="/basket" onClick={closeMenu} className={active === "basket" ? "active" : ""}>Basket Builder</Link>
      <Link href="/docs" onClick={closeMenu} className={active === "docs" || active === "reference" ? "active" : ""}>Docs & methodology</Link>
      <a className="mobile-github" href="https://github.com/Ay-obami/CrossOdds" target="_blank" rel="noopener noreferrer">View GitHub ↗</a>
    </div>
  </nav>;
}
