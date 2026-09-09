import SiteNav from "./components/SiteNav";
import SiteFoot from "./components/SiteFoot";
import BasketBuilder from "./components/BasketBuilder";

export default function Home() {
  return <><SiteNav active="home" /><main>
    <section className="hero wrap">
      <div className="eyebrow-plain">DreamDEX relationship intelligence</div>
      <h1>Trade relationships,<br/>not isolated predictions.</h1>
      <p className="hero-copy">CrossOdds detects how DreamDEX Event Contracts move together, then prices two-market baskets with correlation instead of naive probability multiplication.</p>
      <div className="hero-actions"><a className="btn btn-blue" href="/basket">Build a basket</a><a className="btn btn-ghost" href="/explore">Explore markets</a></div>
      <div className="proof-strip"><div><b>Live</b><span>Event Contract assets discovered from DreamDEX</span></div><div><b>6</b><span>candle intervals exposed by indexer</span></div><div><b>Returns</b><span>correlated instead of raw price levels</span></div></div>
    </section>
    <section className="wrap product-section"><div className="section-head"><div><div className="eyebrow-plain">Flagship interaction</div><h2 className="section-title">Build a relationship-aware market pair</h2></div><p>Choose from the Event Contract assets DreamDEX currently exposes, then compare the naive joint probability with a confidence-controlled correlation estimate.</p></div><BasketBuilder /></section>
    <section className="wrap product-section"><div className="eyebrow-plain">Why this is different</div><h2 className="section-title">The estimate shows its work.</h2><div className="three-grid"><article><b>01</b><h3>Align</h3><p>5m, 15m, and 1h DreamDEX candles are evaluated and the best usable synchronized or asynchronous series is selected.</p></article><article><b>02</b><h3>Correlate returns</h3><p>CrossOdds computes correlation on log returns, not price levels that can create spurious trend correlation.</p></article><article><b>03</b><h3>Price the basket</h3><p>A Gaussian copula combines DreamDEX-implied marginal probabilities with a quality-shrunk observed relationship.</p></article></div></section>
    <section className="wrap agent-callout"><div><div className="eyebrow-plain">Same engine, machine-readable</div><h2>AI agents get the exact same correlation and basket tools.</h2><p>The consumer app and MCP server share one signal engine, so CrossOdds is useful to both traders and autonomous agents.</p></div><div className="code-block">get_correlation({`{ assetA: "BTC", assetB: "ETH" }`})<br/>price_basket({`{ assetA: "BTC", directionA: "UP", assetB: "ETH", directionB: "UP" }`})</div></section>
  </main><SiteFoot /></>;
}
