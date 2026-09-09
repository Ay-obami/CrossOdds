"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Active = "home" | "explore" | "basket" | "docs" | "reference";

export default function SiteNav({ active }: { active: Active }) {
  const [apiLive, setApiLive] = useState<boolean | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_CROSSODDS_API_URL || process.env.NEXT_PUBLIC_READOUT_API_URL;
    if (!base) { setApiLive(false); return; }
    const controller = new AbortController();
    fetch(`${base.replace(/\/$/, "")}/health`, { signal: controller.signal })
      .then((response) => setApiLive(response.ok))
      .catch(() => { if (!controller.signal.aborted) setApiLive(false); });
    return () => controller.abort();
  }, []);

  return <nav className="sitenav">
    <div className="wrap row">
      <div className="brand-cluster">
        <Link href="/" className="wordmark"><span className="chip" />CrossOdds</Link>
        <span className={`network-pill ${apiLive ? "live" : ""}`}><i />{apiLive === null ? "Checking Somnia" : apiLive ? "Live on Somnia" : "Somnia"}</span>
      </div>
      <div className="navlinks">
        <Link href="/explore" className={active === "explore" ? "active" : ""}>Explore</Link>
        <Link href="/basket" className={active === "basket" ? "active" : ""}>Basket Builder</Link>
        <Link href="/docs" className={active === "docs" || active === "reference" ? "active" : ""}>Docs</Link>
        <a className="gh-btn" href="https://github.com/Ay-obami/CrossOdds" target="_blank" rel="noopener noreferrer" aria-label="CrossOdds on GitHub">GitHub ↗</a>
      </div>
    </div>
  </nav>;
}
