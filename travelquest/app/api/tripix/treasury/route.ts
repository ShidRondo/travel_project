import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  burnTripixFromTreasury,
  getTreasuryTripixSnapshot,
  transferTripixFromTreasury,
} from "@/lib/solana/treasury";

export const runtime = "nodejs";

type TreasuryAction = "withdraw" | "reward" | "burn";

type TreasuryRequestBody = {
  action?: TreasuryAction;
  amount?: number | string;
  destinationWallet?: string;
  userId?: string;
  title?: string;
  description?: string;
  txType?:
    | "WITHDRAWAL"
    | "CHECKIN_REWARD"
    | "HIKE_REWARD"
    | "EVENT_REWARD"
    | "EVENT_BURN";
};

type WalletRow = {
  available_balance: number | string | null;
  locked_balance?: number | string | null;
  pending_balance?: number | string | null;
};

type ProfileRow = {
  id: string;
  wallet_address: string | null;
};

function getSupabaseForRequest(request: Request) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: request.headers.get("authorization") || "",
        },
      },
    }
  );
}

function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function readAmount(amount: number | string | undefined) {
  const parsedAmount =
    typeof amount === "number" ? amount : Number(String(amount || "").trim());

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  return parsedAmount;
}

function assertTreasuryKey(request: Request) {
  const expectedKey = process.env.TRIPIX_TREASURY_API_KEY;
  if (!expectedKey) {
    throw new Error("TRIPIX_TREASURY_API_KEY is not configured.");
  }

  const providedKey = request.headers.get("x-travelquest-treasury-key");
  if (providedKey !== expectedKey) {
    throw new Error("Treasury key is invalid.");
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Treasury request failed.";
}

export async function GET() {
  try {
    const snapshot = await getTreasuryTripixSnapshot();
    return NextResponse.json({ treasury: snapshot });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TreasuryRequestBody;

    if (body.action === "withdraw") {
      return handleWithdrawal(request, body);
    }

    if (body.action === "reward") {
      return handleReward(request, body);
    }

    if (body.action === "burn") {
      return handleBurn(request, body);
    }

    return NextResponse.json(
      { error: "Unsupported treasury action." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}

async function handleWithdrawal(request: Request, body: TreasuryRequestBody) {
  const amount = readAmount(body.amount);
  const supabase = getSupabaseForRequest(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [{ data: wallet }, { data: profile }] = await Promise.all([
    supabase
      .from("wallets")
      .select("available_balance, locked_balance, pending_balance")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, wallet_address")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const walletRow = wallet as WalletRow | null;
  const profileRow = profile as ProfileRow | null;
  const availableBalance = Number(walletRow?.available_balance || 0);
  const destinationWallet = body.destinationWallet || profileRow?.wallet_address;

  if (!destinationWallet) {
    return NextResponse.json(
      { error: "Connect and save a destination wallet first." },
      { status: 400 }
    );
  }

  if (availableBalance < amount) {
    return NextResponse.json(
      { error: "Insufficient in-app TRIPIX balance." },
      { status: 400 }
    );
  }

  const transfer = await transferTripixFromTreasury({
    destinationWallet,
    amount,
  });
  const nextBalance = availableBalance - amount;

  const { error: walletError } = await supabase
    .from("wallets")
    .update({
      available_balance: nextBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (walletError) {
    return NextResponse.json(
      {
        error:
          "TRIPIX was sent on-chain, but the in-app wallet balance update failed.",
        signature: transfer.signature,
      },
      { status: 500 }
    );
  }

  await supabase.from("wallet_transactions").insert({
    user_id: user.id,
    tx_type: "WITHDRAWAL",
    amount,
    direction: "debit",
    title: body.title || "TRIPIX withdrawal",
    description:
      body.description ||
      `Sent from TravelQuest Treasury to ${destinationWallet}.`,
    reference_id: transfer.signature,
  });

  return NextResponse.json({
    ok: true,
    action: "withdraw",
    signature: transfer.signature,
    wallet: {
      availableBalance: nextBalance,
    },
    transfer,
  });
}

async function handleReward(request: Request, body: TreasuryRequestBody) {
  assertTreasuryKey(request);

  const amount = readAmount(body.amount);
  const admin = getSupabaseAdmin();
  const userId = body.userId;

  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, wallet_address")
    .eq("id", userId)
    .maybeSingle();

  const profileRow = profile as ProfileRow | null;
  const destinationWallet = body.destinationWallet || profileRow?.wallet_address;

  if (!destinationWallet) {
    return NextResponse.json(
      { error: "Reward destination wallet is not available." },
      { status: 400 }
    );
  }

  const transfer = await transferTripixFromTreasury({
    destinationWallet,
    amount,
  });

  await admin.from("wallet_transactions").insert({
    user_id: userId,
    tx_type: body.txType || "CHECKIN_REWARD",
    amount,
    direction: "credit",
    title: body.title || "TRIPIX reward",
    description:
      body.description ||
      `Reward sent from TravelQuest Treasury to ${destinationWallet}.`,
    reference_id: transfer.signature,
  });

  return NextResponse.json({
    ok: true,
    action: "reward",
    signature: transfer.signature,
    transfer,
  });
}

async function handleBurn(request: Request, body: TreasuryRequestBody) {
  assertTreasuryKey(request);

  const amount = readAmount(body.amount);
  const burn = await burnTripixFromTreasury({ amount });

  if (body.userId) {
    const admin = getSupabaseAdmin();
    await admin.from("wallet_transactions").insert({
      user_id: body.userId,
      tx_type: body.txType || "EVENT_BURN",
      amount,
      direction: "debit",
      title: body.title || "TRIPIX treasury burn",
      description:
        body.description || "Burned from the TravelQuest Treasury token account.",
      reference_id: burn.signature,
    });
  }

  return NextResponse.json({
    ok: true,
    action: "burn",
    signature: burn.signature,
    burn,
  });
}
