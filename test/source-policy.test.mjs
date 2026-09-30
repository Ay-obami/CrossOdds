import test from 'node:test';
import assert from 'node:assert/strict';
import { priceBasket } from '../src/signals/basket.mjs';
import { priceBasket as demoBasket } from '../src/api/demo-service.mjs';
test('unknown indexer freshness withholds correlation adjustment',async()=>{
 const quote=await priceBasket({legs:[{asset:'BTC'},{asset:'ETH'}]}, {
 getAssetSentiment:async()=>({probability:0.6}),
 calculateAssetCorrelation:async()=>({status:'ok',correlation:0.8,qualityScore:1,confidence:'high',freshness:{status:'unknown'}})
 });
 assert.equal(quote.status,'independence_only');assert.equal(quote.adjustedProbability,null);
});
test('offline demo supports explicit shared 15m window and labels synthetic data',async()=>{
 const quote=await demoBasket({legs:[{asset:'BTC',intervalMin:15},{asset:'ETH',intervalMin:15}]});
 assert.equal(quote.status,'ok');assert.equal(quote.dataMode,'synthetic_demo');assert.equal(quote.live,false);
});
test('unknown order book freshness withholds all basket pricing',async()=>{
 const quote=await priceBasket({legs:[{asset:'BTC'},{asset:'ETH'}]}, {
 getAssetSentiment:async()=>({probability:0.6,freshness:{status:'unknown'}}),
 calculateAssetCorrelation:async()=>({status:'ok',correlation:0.8,qualityScore:1,confidence:'high'})
 });
 assert.equal(quote.status,'insufficient_data');assert.equal(quote.independentProbability,undefined);
});
