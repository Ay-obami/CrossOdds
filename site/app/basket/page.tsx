import SiteNav from "../components/SiteNav";
import SiteFoot from "../components/SiteFoot";
import BasketBuilder from "../components/BasketBuilder";

export default function BasketPage(){
  return <><SiteNav active="basket"/><main className="wrap page-pad product-page">
    <div className="eyebrow-plain">Basket builder</div>
    <h1 className="page-title">What are two connected outcomes worth together?</h1>
    <p className="page-intro">Choose two live DreamDEX assets, a shared Event Contract window, and an UP/DOWN outcome for each. CrossOdds shows the naive joint probability, the correlation-aware estimate, and why they differ.</p>
    <BasketBuilder/>
    <div className="method-note compact-method"><h3>Designed to avoid false precision</h3><p>CrossOdds correlates log returns, scores live data quality, shrinks noisy relationships toward independence, and withholds the adjustment entirely when the evidence is too weak.</p><a className="inline-link" href="/docs">Read the methodology →</a></div>
  </main><SiteFoot/></>;
}
