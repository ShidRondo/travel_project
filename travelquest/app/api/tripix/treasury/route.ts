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
  sourceReferenceId?: string;
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

type WalletTransactionRow = {
  id: string;
  tx_type: string;
  amount: number | string;
  direction: "credit" | "debit";
  title: string | null;
  description: string | null;
  reference_id: string | null;
  created_at: string | null;
};

type WalletTransactionInsertClient = {
  from: (table: "wallet_transactions") => {
    insert: (values: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => PromiseLike<{ data: unknown }>;
      };
    };
  };
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
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
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

function hasValidTreasuryKey(request: Request) {
  const expectedKey = process.env.TRIPIX_TREASURY_API_KEY;
  const providedKey = request.headers.get("x-travelquest-treasury-key");

  return Boolean(expectedKey && providedKey === expectedKey);
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
  if (hasValidTreasuryKey(request)) {
    return handleAdminReward(body);
  }

  return handleAuthenticatedReward(request, body);
}

async function handleAdminReward(body: TreasuryRequestBody) {
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
  await creditWalletBalance(admin, userId, amount);

  const transaction = await insertRewardTransaction(admin, {
    userId,
    txType: body.txType || "CHECKIN_REWARD",
    amount,
    title: body.title || "TRIPIX reward",
    description:
      body.description ||
      `Reward sent from TravelQuest Treasury to ${destinationWallet}.`,
    referenceId: transfer.signature,
  });

  return NextResponse.json({
    ok: true,
    action: "reward",
    signature: transfer.signature,
    transfer,
    transaction,
  });
}

async function handleAuthenticatedReward(
  request: Request,
  body: TreasuryRequestBody
) {
  const requestedAmount = readAmount(body.amount);
  const supabase = getSupabaseForRequest(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (body.userId && body.userId !== user.id) {
    return NextResponse.json(
      { error: "Authenticated rewards can only target the signed-in user." },
      { status: 403 }
    );
  }

  const admin = getSupabaseAdmin();
  const txType = body.txType || "CHECKIN_REWARD";
  const sourceReferenceId = body.sourceReferenceId;

  if (!sourceReferenceId) {
    return NextResponse.json(
      { error: "Reward source reference is required." },
      { status: 400 }
    );
  }

  const { data: existingReward } = await admin
    .from("wallet_transactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("tx_type", txType)
    .eq("reference_id", sourceReferenceId)
    .maybeSingle();

  if (existingReward) {
    return NextResponse.json(
      { error: "This reward has already been sent." },
      { status: 409 }
    );
  }

  const resolvedAmount = await resolveAuthenticatedRewardAmount(admin, {
    userId: user.id,
    txType,
    sourceReferenceId,
    requestedAmount,
  });

  if (resolvedAmount instanceof NextResponse) {
    return resolvedAmount;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, wallet_address")
    .eq("id", user.id)
    .maybeSingle();

  const profileRow = profile as ProfileRow | null;
  const destinationWallet = body.destinationWallet || profileRow?.wallet_address;

  if (!destinationWallet || destinationWallet !== profileRow?.wallet_address) {
    return NextResponse.json(
      { error: "Connect and save your destination wallet first." },
      { status: 400 }
    );
  }

  const transfer = await transferTripixFromTreasury({
    destinationWallet,
    amount: resolvedAmount,
  });
  await creditWalletBalance(admin, user.id, resolvedAmount);
  const transaction = await insertRewardTransaction(supabase, {
    userId: user.id,
    txType,
    amount: resolvedAmount,
    title: body.title || "TRIPIX reward",
    description:
      body.description ||
      `Reward sent from TravelQuest Treasury to ${destinationWallet}.`,
    referenceId: sourceReferenceId,
  });

  return NextResponse.json({
    ok: true,
    action: "reward",
    signature: transfer.signature,
    transfer,
    transaction,
  });
}

async function resolveAuthenticatedRewardAmount(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  {
    userId,
    txType,
    sourceReferenceId,
    requestedAmount,
  }: {
    userId: string;
    txType: NonNullable<TreasuryRequestBody["txType"]>;
    sourceReferenceId: string;
    requestedAmount: number;
  }
) {
  if (txType === "CHECKIN_REWARD") {
    const { data: checkin } = await supabase
      .from("checkins")
      .select("reward_amount, verified, rewarded")
      .eq("id", sourceReferenceId)
      .eq("user_id", userId)
      .maybeSingle();
    const row = checkin as
      | { reward_amount: number | string | null; verified: boolean | null; rewarded: boolean | null }
      | null;

    if (!row?.verified || !row.rewarded) {
      return NextResponse.json(
        { error: "Verified check-in reward source was not found." },
        { status: 400 }
      );
    }

    return Number(row.reward_amount || 0);
  }

  if (txType === "HIKE_REWARD") {
    const { data: hikeDestination } = await supabase
      .from("hike_session_destinations")
      .select("hike_session_id, total_added")
      .eq("id", sourceReferenceId)
      .maybeSingle();
    const destinationRow = hikeDestination as
      | { hike_session_id: string; total_added: number | string | null }
      | null;

    if (!destinationRow) {
      return NextResponse.json(
        { error: "Hike reward source was not found." },
        { status: 400 }
      );
    }

    const { data: hikeSession } = await supabase
      .from("hike_sessions")
      .select("user_id")
      .eq("id", destinationRow.hike_session_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!hikeSession) {
      return NextResponse.json(
        { error: "Hike reward source does not belong to this user." },
        { status: 403 }
      );
    }

    return Number(destinationRow.total_added || 0);
  }

  if (txType === "EVENT_REWARD") {
    const { data: participant } = await supabase
      .from("event_participants")
      .select("completed, reward_claimed")
      .eq("post_id", sourceReferenceId)
      .eq("user_id", userId)
      .maybeSingle();
    const participantRow = participant as
      | { completed: boolean | null; reward_claimed: boolean | null }
      | null;

    if (!participantRow?.completed || !participantRow.reward_claimed) {
      return NextResponse.json(
        { error: "Completed event reward source was not found." },
        { status: 400 }
      );
    }

    const { data: post } = await supabase
      .from("posts")
      .select("reward_per_finisher, stake_amount, event_capacity")
      .eq("id", sourceReferenceId)
      .maybeSingle();
    const postRow = post as
      | {
          reward_per_finisher: number | string | null;
          stake_amount: number | string | null;
          event_capacity: number | null;
        }
      | null;
    const rewardPerFinisher =
      Number(postRow?.reward_per_finisher || 0) ||
      Math.floor(
        (Number(postRow?.stake_amount || 0) -
          Math.round(Number(postRow?.stake_amount || 0) * 0.1)) /
          Math.max(Number(postRow?.event_capacity || 1), 1)
      );

    if (requestedAmount > rewardPerFinisher) {
      return NextResponse.json(
        { error: "Requested event reward exceeds the event payout." },
        { status: 400 }
      );
    }

    return requestedAmount;
  }

  return NextResponse.json(
    { error: "Unsupported authenticated reward type." },
    { status: 400 }
  );
}

async function creditWalletBalance(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  amount: number
) {
  const { data: wallet } = await supabase
    .from("wallets")
    .select("available_balance")
    .eq("user_id", userId)
    .maybeSingle();
  const walletRow = wallet as WalletRow | null;
  const nextBalance = Number(walletRow?.available_balance || 0) + amount;

  await supabase.from("wallets").upsert(
    {
      user_id: userId,
      available_balance: nextBalance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

async function insertRewardTransaction(
  supabase: WalletTransactionInsertClient,
  {
    userId,
    txType,
    amount,
    title,
    description,
    referenceId,
  }: {
    userId: string;
    txType: NonNullable<TreasuryRequestBody["txType"]>;
    amount: number;
    title: string;
    description: string;
    referenceId: string;
  }
) {
  const { data } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: userId,
      tx_type: txType,
      amount,
      direction: "credit",
      title,
      description,
      reference_id: referenceId,
    })
    .select("id, tx_type, amount, direction, title, description, reference_id, created_at")
    .single();

  return data as WalletTransactionRow | null;
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
