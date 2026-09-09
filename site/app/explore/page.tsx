import SiteNav from "../components/SiteNav";
import SiteFoot from "../components/SiteFoot";
import MarketExplorer from "../components/MarketExplorer";

export default function Explore(){return <><SiteNav active="explore"/><main className="wrap page-pad"><div className="eyebrow-plain">Market explorer</div><h1 className="page-title">Inspect the DreamDEX markets behind each basket.</h1><p className="page-intro">When a CrossOdds API URL is configured this page loads live market windows and implied probabilities. If the API is unavailable, it switches to a clearly labeled recorded fallback.</p><MarketExplorer/></main><SiteFoot/></>}
