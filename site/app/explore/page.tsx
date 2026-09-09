import SiteNav from "../components/SiteNav";
import SiteFoot from "../components/SiteFoot";
import MarketExplorer from "../components/MarketExplorer";

export default function Explore(){
  return <><SiteNav active="explore"/><main className="wrap page-pad product-page">
    <div className="eyebrow-plain">Market explorer</div>
    <h1 className="page-title">See the live markets behind every CrossOdds basket.</h1>
    <p className="page-intro">Inspect DreamDEX Event Contract probabilities by asset and window. Compare UP versus DOWN at a glance, then expand a market only when you need spread, depth, weighting or pool details.</p>
    <MarketExplorer/>
  </main><SiteFoot/></>;
}
