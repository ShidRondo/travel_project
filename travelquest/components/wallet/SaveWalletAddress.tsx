"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { supabase } from "@/lib/supabase/client";

export default function SaveWalletAddress({ userId }: { userId: string }) {
  const { publicKey } = useWallet();

  useEffect(() => {
    const saveWallet = async () => {
      if (!publicKey || !userId) return;

      await supabase
        .from("profiles")
        .update({
          wallet_address: publicKey.toBase58(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    };

    void saveWallet();
  }, [publicKey, userId]);

  return null;
}
