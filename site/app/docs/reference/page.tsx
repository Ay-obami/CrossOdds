import SiteNav from "../../components/SiteNav";
import SiteFoot from "../../components/SiteFoot";
const tools=[
  ["list_assets","no input","Lists assets with live DreamDEX markets."],
  ["get_sentiment","asset","Liquidity-weighted 0–100 implied probability across live windows."],
  ["get_divergence","asset","Compares shortest and longest live-window implied probabilities."],
  ["get_market_snapshot","asset","Returns window-level price, depth, spread, and expiry context."],
  ["get_correlation","assetA, assetB","Pearson correlation of aligned log returns plus interval, sample and confidence metadata."],
  ["price_basket","assetA, directionA, assetB, directionB","Independent versus Gaussian-copula joint probability for a two-leg basket."],
];
export default function Reference(){return <><SiteNav active="reference"/><main className="wrap page-pad docs"><div className="eyebrow-plain">MCP reference</div><h1 className="page-title">Six tools, one signal engine</h1><p className="page-intro">The original four Readout tools remain backward compatible; correlation and basket pricing extend the same MCP server.</p>{tools.map(([name,input,desc])=><div className="tool-card" key={name}><div className="tool-head"><span className="tool-name">{name}</span><span className="tool-tag">{input}</span></div><p>{desc}</p></div>)}<h2>HTTP API</h2><div className="code-block">GET /health<br/>GET /api/assets<br/>GET /api/sentiment/BTC<br/>GET /api/divergence/BTC<br/>GET /api/market/BTC<br/>GET /api/correlation?assetA=BTC&amp;assetB=ETH<br/>POST /api/basket/price</div></main><SiteFoot/></>}
