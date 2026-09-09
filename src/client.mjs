// Shared setup: builds the SDK exchange object + a plain viem client from .env.
// Adapted from the DreamDEX hackathon starter template's client.mjs — this
// server only ever READS (market discovery, order books), it never trades,
// but the SDK still requires a key to construct the exchange object.
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { createPublicClient, http } from "viem";
import { somniaTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "dotenv";

config({ path: new URL("../.env", import.meta.url) });

const { PRIVATE_KEY, RPC_URL, WS_RPC_URL } = process.env;

if (!PRIVATE_KEY || PRIVATE_KEY === "0x...") {
  throw new Error(
    "Set PRIVATE_KEY in .env (any Shannon testnet key works — this server " +
      "only reads market data, it never signs a trade)."
  );
}

const INDEXER_URL = process.env.INDEXER_URL || "https://dev.smk.somnia.host/v1/graphql";

export const me = privateKeyToAccount(PRIVATE_KEY).address;
export const COLLATERAL = SOMNIA_TESTNET_ADDRESSES.testUsdc;

export const pub = createPublicClient({
  chain: somniaTestnet,
  transport: http(RPC_URL || undefined),
});

export const ex = new SomniaMarkets({
  chain: somniaTestnet,
  addresses: SOMNIA_TESTNET_ADDRESSES,
  privateKey: PRIVATE_KEY,
  wsRpcUrl: WS_RPC_URL || "wss://api.infra.testnet.somnia.network/ws",
  indexerUrl: INDEXER_URL,
});

export const ONE = 1_000_000n;
