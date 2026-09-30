import test from 'node:test';
import assert from 'node:assert/strict';
import { readBook } from '../src/markets/orderbook.mjs';
const now = 1_800_000_000_000;
function client(stamp = now / 1000) {
 const calls=[];
 return {calls, getBlock:async()=>({number:42n,timestamp:BigInt(stamp)}), readContract:async(o)=>{
  calls.push(o); const [bid,,cursor]=o.args;
  return [[{price:bid?400000n:600000n,quantityRemaining:1000000n,expireTimestampNs:BigInt(now)*1000000n+1000000000n}], cursor===0n, cursor===0n?1n:2n];
 }};
}
test('book drains both sides at one block and uses SDK quantityRemaining',async()=>{
 const rpc=client();const book=await readBook('0xpool',{client:rpc,now:()=>now});
 assert.equal(rpc.calls.length,4);assert.ok(rpc.calls.every(c=>c.blockNumber===42n));
 assert.equal(book.depth,4);assert.equal(book.freshness.status,'fresh');assert.equal(book.freshness.blockNumber,'42');
});
test('stale chain head fails closed',async()=>{
 await assert.rejects(readBook('0xpool',{client:client(now/1000-120),now:()=>now}),/stale/);
});
test('nonadvancing pagination fails instead of returning partial depth',async()=>{
 const rpc=client();rpc.readContract=async()=>[[],true,0n];
 await assert.rejects(readBook('0xpool',{client:rpc,now:()=>now}),/cursor/);
});
test('expired resting orders cannot affect the quote',async()=>{
 const rpc=client();rpc.readContract=async()=>[[{price:900000n,quantityRemaining:1000000n,expireTimestampNs:1n}],false,0n];
 const book=await readBook('0xpool',{client:rpc,now:()=>now});assert.equal(book.impliedProbability,null);assert.equal(book.depth,null);
});
test('pagination cap fails closed',async()=>{
 const rpc=client();rpc.readContract=async(o)=>[[],true,o.args[2]+1n];
 await assert.rejects(readBook('0xpool',{client:rpc,now:()=>now}),/exceeded/);
});
test('both sides filter expiry at one final snapshot time after all pages',async()=>{
 let clock=now;
 const rpc=client();
 rpc.readContract=async(o)=>{
  const bid=o.args[0];
  if(!bid) { await Promise.resolve(); await Promise.resolve(); clock=now+2000; }
  return [[{price:bid?400000n:600000n,quantityRemaining:1000000n,expireTimestampNs:BigInt(now+(bid?1000:10000))*1000000n}],false,0n];
 };
 const book=await readBook('0xpool',{client:rpc,now:()=>clock});
 assert.equal(book.bestBid,null);assert.equal(book.impliedProbability,0.6);
 assert.equal(book.freshness.retrievedAt,now+2000);
 assert.equal(book.validUntil,now+10000);
});
