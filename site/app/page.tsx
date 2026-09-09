import SiteNav from "./components/SiteNav";
import SiteFoot from "./components/SiteFoot";
import BasketBuilder from "./components/BasketBuilder";

export default function Home() {
  return <><SiteNav active="home"/><main>
    <section className="hero wrap hero-product">
      <div className="hero-badge"><span/>Powered by DreamDEX Event Contracts on Somnia</div>
      <h1>Price connected outcomes,<br/>not isolated events.</h1>
      <p className="hero-copy">CrossOdds turns live DreamDEX markets into correlation-aware prediction baskets, showing how much a relationship changes the probability of two outcomes happening together.</p>
      <div className="hero-actions"><a className="btn btn-blue" href="/basket">Build a basket</a><a className="btn btn-ghost" href="/explore">Explore live markets</a></div>
      <div className="proof-strip product-proof">
        <div><b>Live discovery</b><span>Assets and Event Contract windows come directly from DreamDEX.</span></div>
        <div><b>Risk controlled</b><span>Noisy correlation is shrunk toward independence before pricing.</span></div>
        <div><b>Explainable</b><span>Every quote exposes confidence, samples, estimator and snapshot context.</span></div>
      </div>
    </section>

    <section className="wrap product-section flagship-section">
      <div className="section-head"><div><div className="eyebrow-plain">Flagship interaction</div><h2 className="section-title">Build one market idea from two live outcomes.</h2></div><p>Select assets, a matched Event Contract window, and UP/DOWN directions. CrossOdds compares naive independence with a relationship-aware joint probability.</p></div>
      <BasketBuilder/>
    </section>

    <section className="wrap product-section">
      <div className="eyebrow-plain">Why CrossOdds is different</div>
      <h2 className="section-title">The number comes with an explanation.</h2>
      <div className="three-grid product-principles">
        <article><b>01</b><h3>Match the market</h3><p>Basket legs use the same DreamDEX event horizon, so the comparison is like-for-like rather than mixing unrelated windows.</p></article>
        <article><b>02</b><h3>Measure the relationship</h3><p>CrossOdds correlates log returns, using aligned Pearson when possible and an asynchronous estimator when live observations are sparse.</p></article>
        <article><b>03</b><h3>Price with restraint</h3><p>Observed correlation is quality-scored and shrunk before a Gaussian copula adjusts the joint probability.</p></article>
      </div>
    </section>

    <section className="wrap agent-callout product-agent-callout">
      <div><div className="eyebrow-plain">Human UI + agent interface</div><h2>The same market intelligence is available to AI agents.</h2><p>The browser experience and MCP server share one engine, so traders and autonomous agents see the same correlation, confidence and basket logic.</p><a className="inline-link" href="/docs/reference">View MCP reference →</a></div>
      <div className="code-block">get_correlation({`{ assetA: "BTC", assetB: "ETH" }`})<br/><br/>price_basket({`{ assetA: "BTC", directionA: "UP", assetB: "ETH", directionB: "UP" }`})</div>
    </section>
  </main><SiteFoot/></>;
}
