"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { CheckCircle2, ExternalLink, Wallet } from "lucide-react";

const phantomWalletName = "Phantom" as WalletName<"Phantom">;

function isMobileUserAgent(userAgent: string) {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
}

function hasPhantomProvider() {
  const maybeWindow = window as typeof window & {
    phantom?: { solana?: { isPhantom?: boolean } };
    solana?: { isPhantom?: boolean };
  };

  return Boolean(
    maybeWindow.phantom?.solana?.isPhantom || maybeWindow.solana?.isPhantom
  );
}

export default function ConnectWalletButton() {
  const { connected, connecting, publicKey, wallet, select, connect, disconnect } =
    useWallet();
  const connectRequestedRef = useRef(false);
  const phantomBrowseUrl = useSyncExternalStore(
    () => () => undefined,
    () => {
      const mobileNeedsPhantomBrowser =
        isMobileUserAgent(window.navigator.userAgent) && !hasPhantomProvider();

      if (!mobileNeedsPhantomBrowser) return "";

      return `https://phantom.app/ul/browse/${encodeURIComponent(
        window.location.href
      )}?ref=${encodeURIComponent(window.location.origin)}`;
    },
    () => ""
  );
  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "";
  const buttonClass =
    "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70";

  const handleClick = async () => {
    if (phantomBrowseUrl) {
      window.location.href = phantomBrowseUrl;
      return;
    }

    if (connected) {
      await disconnect();
      return;
    }

    if (wallet?.adapter.name !== phantomWalletName) {
      connectRequestedRef.current = true;
      select(phantomWalletName);
      return;
    }

    select(phantomWalletName);
    await connect();
  };

  useEffect(() => {
    if (
      !connectRequestedRef.current ||
      connected ||
      connecting ||
      wallet?.adapter.name !== phantomWalletName
    ) {
      return;
    }

    connectRequestedRef.current = false;
    void connect();
  }, [connect, connected, connecting, wallet]);

  return (
    <button
      type="button"
      className={`${buttonClass} ${
        connected
          ? "border border-emerald-400/30 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/20"
          : "bg-cyan-500 text-zinc-950 hover:bg-cyan-400"
      }`}
      disabled={connecting}
      onClick={() => {
        void handleClick();
      }}
    >
      {connected ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : phantomBrowseUrl ? (
        <ExternalLink className="h-4 w-4" />
      ) : (
        <Wallet className="h-4 w-4" />
      )}
      {connected
        ? `Connected ${shortAddress}`
        : connecting
        ? "Connecting..."
        : phantomBrowseUrl
        ? "Open Phantom"
        : "Connect Phantom"}
    </button>
  );
}
