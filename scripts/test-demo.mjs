import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const port = 18787;
const child = spawn(process.execPath, ['src/api/http.mjs'], { env: {...process.env, DEMO_MODE:'true', PORT:String(port), HOST:'127.0.0.1'}, stdio:['ignore','pipe','inherit'] });
try {
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('demo startup timeout')),10000);child.stdout.once('data',()=>{clearTimeout(timeout);resolve();});child.once('error',reject);});
 const base=`http://127.0.0.1:${port}`;
 const assets=await (await fetch(`${base}/api/assets`)).json();
 assert.equal(assets.live,false);assert.equal(assets.dataMode,'synthetic_demo');
 const market=await (await fetch(`${base}/api/market/BTC`)).json();assert.equal(market.windows[0].intervalMin,15);
 for (const direction of ['UP','DOWN']) {
 const response=await fetch(`${base}/api/basket/price`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({legs:[{asset:'BTC',direction,intervalMin:15},{asset:'ETH',direction:'UP',intervalMin:15}]})});
 assert.equal(response.status,200);const quote=await response.json();assert.equal(quote.status,'ok');assert.equal(quote.live,false);assert.ok(Number.isFinite(quote.adjustedProbability));
 }
 console.log('Offline demo HTTP smoke passed: assets, market, both basket directions; all synthetic tags verified.');
} finally { child.kill(); }
