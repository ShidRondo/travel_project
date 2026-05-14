import "server-only";

import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  burnChecked,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
  transferChecked,
} from "@solana/spl-token";

type TreasuryTransferResult = {
  signature: string;
  mint: string;
  sourceTokenAccount: string;
  destinationTokenAccount: string;
  amount: string;
  decimals: number;
};

type TreasuryBurnResult = {
  signature: string;
  mint: string;
  sourceTokenAccount: string;
  amount: string;
  decimals: number;
};

function getSolanaRpcUrl() {
  const configuredRpc = process.env.SOLANA_RPC_URL;
  if (configuredRpc) return configuredRpc;

  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
  if (network === "mainnet-beta" || network === "testnet" || network === "devnet") {
    return clusterApiUrl(network);
  }

  return clusterApiUrl("devnet");
}

function parseTreasurySecretKey() {
  const rawSecret = process.env.TRIPIX_TREASURY_SECRET_KEY;
  if (!rawSecret) {
    throw new Error("TRIPIX_TREASURY_SECRET_KEY is not configured.");
  }

  const trimmedSecret = rawSecret.trim();

  if (trimmedSecret.startsWith("[")) {
    return Uint8Array.from(JSON.parse(trimmedSecret) as number[]);
  }

  if (trimmedSecret.includes(",")) {
    return Uint8Array.from(
      trimmedSecret.split(",").map((part) => Number(part.trim()))
    );
  }

  return Uint8Array.from(Buffer.from(trimmedSecret, "base64"));
}

function getTripixMintPublicKey() {
  const mintAddress = process.env.NEXT_PUBLIC_TRIPIX_MINT_ADDRESS;
  if (!mintAddress) {
    throw new Error("NEXT_PUBLIC_TRIPIX_MINT_ADDRESS is not configured.");
  }

  return new PublicKey(mintAddress);
}

function parseTokenAmount(amount: number | string, decimals: number) {
  const amountText = String(amount).trim();

  if (!/^\d+(\.\d+)?$/.test(amountText)) {
    throw new Error("Token amount must be a positive decimal value.");
  }

  const [wholePart, fractionalPart = ""] = amountText.split(".");
  if (fractionalPart.length > decimals) {
    throw new Error(`Token amount supports at most ${decimals} decimal places.`);
  }

  const paddedFractionalPart = fractionalPart.padEnd(decimals, "0");
  return BigInt(`${wholePart}${paddedFractionalPart}`);
}

export function getTreasuryPublicKey() {
  return Keypair.fromSecretKey(parseTreasurySecretKey()).publicKey;
}

export function getTreasuryConnection() {
  return new Connection(getSolanaRpcUrl(), "confirmed");
}

export async function getTreasuryTripixSnapshot() {
  const connection = getTreasuryConnection();
  const treasury = getTreasuryPublicKey();
  const mint = getTripixMintPublicKey();
  const mintInfo = await getMint(connection, mint);
  const tokenAccount = await getAssociatedTokenAddress(mint, treasury);

  try {
    const account = await getAccount(connection, tokenAccount);
    const divisor = 10 ** mintInfo.decimals;

    return {
      treasury: treasury.toBase58(),
      mint: mint.toBase58(),
      tokenAccount: tokenAccount.toBase58(),
      decimals: mintInfo.decimals,
      amount: Number(account.amount) / divisor,
      rawAmount: account.amount.toString(),
    };
  } catch {
    return {
      treasury: treasury.toBase58(),
      mint: mint.toBase58(),
      tokenAccount: tokenAccount.toBase58(),
      decimals: mintInfo.decimals,
      amount: 0,
      rawAmount: "0",
    };
  }
}

export async function transferTripixFromTreasury({
  destinationWallet,
  amount,
}: {
  destinationWallet: string;
  amount: number | string;
}): Promise<TreasuryTransferResult> {
  const connection = getTreasuryConnection();
  const treasury = Keypair.fromSecretKey(parseTreasurySecretKey());
  const mint = getTripixMintPublicKey();
  const destination = new PublicKey(destinationWallet);
  const mintInfo = await getMint(connection, mint);
  const rawAmount = parseTokenAmount(amount, mintInfo.decimals);

  if (rawAmount <= BigInt(0)) {
    throw new Error("Token amount must be greater than zero.");
  }

  const sourceAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    treasury,
    mint,
    treasury.publicKey
  );
  const destinationAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    treasury,
    mint,
    destination
  );

  const signature = await transferChecked(
    connection,
    treasury,
    sourceAccount.address,
    mint,
    destinationAccount.address,
    treasury.publicKey,
    rawAmount,
    mintInfo.decimals
  );

  return {
    signature,
    mint: mint.toBase58(),
    sourceTokenAccount: sourceAccount.address.toBase58(),
    destinationTokenAccount: destinationAccount.address.toBase58(),
    amount: String(amount),
    decimals: mintInfo.decimals,
  };
}

export async function burnTripixFromTreasury({
  amount,
}: {
  amount: number | string;
}): Promise<TreasuryBurnResult> {
  const connection = getTreasuryConnection();
  const treasury = Keypair.fromSecretKey(parseTreasurySecretKey());
  const mint = getTripixMintPublicKey();
  const mintInfo = await getMint(connection, mint);
  const rawAmount = parseTokenAmount(amount, mintInfo.decimals);

  if (rawAmount <= BigInt(0)) {
    throw new Error("Token amount must be greater than zero.");
  }

  const sourceAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    treasury,
    mint,
    treasury.publicKey
  );

  const signature = await burnChecked(
    connection,
    treasury,
    sourceAccount.address,
    mint,
    treasury,
    rawAmount,
    mintInfo.decimals
  );

  return {
    signature,
    mint: mint.toBase58(),
    sourceTokenAccount: sourceAccount.address.toBase58(),
    amount: String(amount),
    decimals: mintInfo.decimals,
  };
}
