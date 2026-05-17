"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion } from "framer-motion";
import { useConnection } from "@solana/wallet-adapter-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  Award,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Compass,
  Flame,
  Flag,
  Heart,
  Home,
  Image as ImageIcon,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  PlayCircle,
  Route,
  Search,
  Share2,
  Ticket,
  Trash2,
  Trophy,
  Upload,
  User,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";
import ConnectWalletButton from "@/components/wallet/ConnectWalletButton";

const MapPreview = dynamic(() => import("@/components/ui/MapPreview"), {
  ssr: false,
});
const EventRoutePicker = dynamic(
  () => import("@/components/ui/EventRoutePicker"),
  { ssr: false }
);

type DifficultyLevel = "Easy" | "Moderate" | "Hard" | "Expert";
type CategoryType = "Hiking" | "Falls" | "Beach" | "Island";
type TabKey =
  | "feed"
  | "discover"
  | "checkin"
  | "hiking"
  | "wallet"
  | "utility"
  | "achievements"
  | "profile";

type MapPoint = {
  lat: number;
  lng: number;
  name?: string;
};

type LiveGpsFix = {
  point: MapPoint;
  accuracy: number | null;
  updatedAt: string;
};

type AuthUser = {
  displayName: string;
  passwordHash: string;
  walletAddress: string;
  publicKey: string;
  avatarUrl: string;
  bio: string;
  contactNumber: string;
  location: string;
};

type SessionUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
  } | null;
};

type TravelQuestMVPProps = {
  sessionUser: SessionUser;
  userProfile?: UserProfile | null;
  onLogout?: () => void;
};

type UserProfile = {
    display_name?: string | null;
    full_name?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    avatar_storage_path?: string | null;
    avatar_updated_at?: string | null;
    phone_country?: string | null;
    phone_country_code?: string | null;
    phone_local_number?: string | null;
    country?: string | null;
    region?: string | null;
    municipality?: string | null;
    barangay?: string | null;
    zip_code?: string | null;
    wallet_address?: string | null;
};

type ProofMetadata = {
  id: string;
  destination: string;
  gps: MapPoint;
  photoName: string;
  photoHash: string;
  metadataHash: string;
  solanaSignature: string;
  network: "Solana Devnet";
  timestamp: string;
};

type CheckinDestinationJoin = {
  name: string | null;
};

type CheckinRow = {
  id: string;
  destination_id?: string | null;
  destinations?: CheckinDestinationJoin | CheckinDestinationJoin[] | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_name: string | null;
  photo_name: string | null;
  photo_url: string | null;
  photo_hash: string | null;
  metadata_hash: string | null;
  solana_signature: string | null;
  network: string | null;
  created_at: string | null;
};

type AchievementRow = {
  id: string;
  name: string;
  category: string;
  tier: "Beginner" | "Advanced" | "Expert";
  target: number;
  description: string;
  grants_authority: string | null;
};

type UserAchievementRow = {
  achievement_id: string;
  progress: number;
  unlocked: boolean;
};

type ProfileStats = {
  postsCount: number;
  placesCount: number;
  badgesCount: number;
};

type AccountSecurity = {
  passwordSha256: string;
  solanaPublicKey: string;
  network: string;
};

type HostingAuthority = {
  category: CategoryType;
  requiredBadge: string;
  authorized: boolean;
};

type DestinationCard = {
  id: string;
  name: string;
  category: CategoryType;
  location: string;
  difficulty: DifficultyLevel;
  points: number;
  requiresQR: boolean;
  description: string;
  hero: string;
  imageUrl: string;
  startLat: number;
  startLng: number;
  destLat: number;
  destLng: number;
};

type DestinationRow = {
  id: string;
  name: string;
  category: string;
  location: string | null;
  difficulty: string | null;
  reward_points: number | string | null;
  requires_qr: boolean | null;
  description: string | null;
  hero: string | null;
  image_url: string | null;
  start_lat: number | null;
  start_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
};

type GeofenceStatus = {
  available: boolean;
  inside: boolean;
  distanceMeters: number | null;
  effectiveRadiusMeters: number;
};

type TrailDestination = {
  id: string;
  name: string;
  type: "Checkpoint" | "Target";
  difficulty: DifficultyLevel;
  reward: number;
  lat: number | null;
  lng: number | null;
};

type TrailRow = {
  id: string;
  code: string | null;
  name: string;
  area: string | null;
  next_trail_id: string | null;
};

type TrailheadRow = {
  id: string;
  trail_id: string;
  name: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
};

type TrailDestinationRow = {
  id: string;
  trail_id: string;
  name: string;
  destination_type: "Checkpoint" | "Target";
  difficulty: DifficultyLevel;
  reward: number | string;
  sort_order: number | null;
  lat: number | null;
  lng: number | null;
};

type Trail = {
  id: string;
  name: string;
  area: string;
  trailhead: {
    id: string;
    name: string;
    location: string;
    lat: number | null;
    lng: number | null;
  };
  nextTrailId: string | null;
  destinations: TrailDestination[];
};

type AchievementItem = {
  id: string;
  name: string;
  category: string;
  tier: "Beginner" | "Advanced" | "Expert";
  progress: number;
  target: number;
  unlocked: boolean;
  description: string;
  grantsAuthority?: CategoryType;
};

type RewardBreakdown = {
  destination: string;
  difficulty: DifficultyLevel;
  baseReward: number;
  targetBonus: number;
  multiDestinationBonus: number;
  totalAdded: number;
};

type HikeSession = {
  id: string | null;
  active: boolean;
  trailheadVerified: boolean;
  currentTrailheadMatched: boolean;
  targetReached: boolean;
  status: string;
  reachedDestinationIds: string[];
  currentTrailId: string | null;
  selectedTargetId: string | null;
  totalEarned: number;
  lastRewardBreakdown: RewardBreakdown | null;
  multiDestinationBonusAwarded: boolean;
  nextTrailReady: boolean;
};

type EventProgress = {
  joined: boolean;
  verifiedStart: boolean;
  completed: boolean;
  failed: boolean;
  rewardClaimed: boolean;
};

type EventParticipantRow = {
  post_id: string;
  joined: boolean | null;
  verified_start: boolean | null;
  completed: boolean | null;
  failed: boolean | null;
  reward_claimed: boolean | null;
};

type FeedPost = {
  id: string;
  userId?: string;
  author: string;
  avatar: string;
  avatarUrl?: string;
  destination: string;
  caption: string;
  achievement: string;
  likes: number;
  likedByUser?: boolean;
  comments: number;
  image: string;
  postType?: "standard" | "event";
  eventTitle?: string;
  eventCategory?: CategoryType;
  eventDifficulty?: DifficultyLevel;
  joinCost?: number;
  joinedCount?: number;
  completedCount?: number;
  failedCount?: number;
  eventCapacity?: number;
  initialPoint?: MapPoint;
  destinationPoint?: MapPoint;
  eventDate?: string;
  expirationDate?: string;
  startTime?: string;
  endTime?: string;
  eventDescription?: string;
  eventImage?: string;
  creatorAuthorityName?: string;
  requiredAuthorityName?: string;
  stakeAmount?: number;
  rewardPool?: number;
  remainingRewardPool?: number;
  burnAmount?: number;
  routeDistanceKm?: number;
  distanceRewardBonus?: number;
  rewardPerFinisher?: number;
  participant?: EventProgress;
};

type FeedPostRow = {
  id: string;
  user_id: string;
  post_type: "standard" | "event";
  author_name: string | null;
  author_avatar_url: string | null;
  destination: string | null;
  caption: string;
  achievement: string | null;
  image_url: string | null;
  likes_count: number | null;
  comments_count: number | null;
  event_title: string | null;
  event_category: string | null;
  event_difficulty: string | null;
  join_cost: number | string | null;
  joined_count: number | null;
  completed_count: number | null;
  failed_count: number | null;
  event_capacity: number | null;
  initial_lat: number | null;
  initial_lng: number | null;
  initial_name: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  destination_name: string | null;
  event_date: string | null;
  expiration_date: string | null;
  start_time: string | null;
  end_time: string | null;
  event_description: string | null;
  event_image_url: string | null;
  creator_authority_name: string | null;
  required_authority_name: string | null;
  stake_amount: number | string | null;
  reward_pool: number | string | null;
  remaining_reward_pool: number | string | null;
  burn_amount: number | string | null;
  route_distance_km: number | string | null;
  distance_reward_bonus: number | string | null;
  reward_per_finisher: number | string | null;
};

type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  author_name?: string | null;
  author_avatar_url?: string | null;
  created_at: string | null;
};

type BurnReason =
  | "CREATE_EVENT"
  | "JOIN_EVENT"
  | "UNLOCK_BADGE"
  | "ACTIVATE_BOOST"
  | "EVENT_BURN"
  | "WITHDRAWAL"
  | "CHECKIN_REWARD"
  | "HIKE_REWARD"
  | "EVENT_REWARD";

type BurnHistoryItem = {
  id: string;
  title: string;
  reason: BurnReason;
  amount: number;
  direction: "credit" | "debit";
  status: "Completed";
  time: string;
};

type WalletTransactionRow = {
  id: string;
  tx_type: BurnReason;
  amount: number | string;
  direction: "credit" | "debit";
  title: string | null;
  description: string | null;
  reference_id: string | null;
  created_at: string | null;
};

type WalletRow = {
  available_balance: number | string | null;
  locked_balance: number | string | null;
  pending_balance: number | string | null;
};

type TreasuryRewardResponse = {
  ok?: boolean;
  error?: string;
  signature?: string;
  transaction?: WalletTransactionRow | null;
};

type TreasurySnapshotResponse = {
  treasury?: {
    treasury: string;
    mint: string;
    tokenAccount: string;
    decimals: number;
  };
  error?: string;
};

type CheckInState = {
  gps: boolean;
  photo: boolean;
  verified: boolean;
  gpsPoint: MapPoint | null;
  photoName: string;
  photoHash: string;
  metadataHash: string;
  solanaSignature: string;
};

type UtilityAction = {
  id: string;
  title: string;
  description: string;
  burnCost: number;
  type: "CREATE_EVENT" | "JOIN_EVENT" | "UNLOCK_BADGE" | "ACTIVATE_BOOST";
  icon: LucideIcon;
};

type NotificationTone = "info" | "warning" | "error" | "success";

type AppNotification = {
  id: number;
  title: string;
  message: string;
  tone: NotificationTone;
};

type ConfirmationDialog = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "danger" | "success" | "info";
  onConfirm: () => void | Promise<void>;
};

type RequiredEventField =
  | "title"
  | "date"
  | "expirationDate"
  | "startTime"
  | "endTime"
  | "capacity"
  | "stakeAmount"
  | "description"
  | "startPoint"
  | "destinationPoint"
  | "distance";

const requiredEventFieldLabels: Record<RequiredEventField, string> = {
  title: "Event Name",
  date: "Start Date",
  expirationDate: "Expiration Date",
  startTime: "Start Time",
  endTime: "Expiration Time",
  capacity: "Max Finishers",
  stakeAmount: "Stake to Lock",
  description: "Description",
  startPoint: "Initial Location",
  destinationPoint: "Destination Location",
  distance: "Route Distance",
};

const fallbackTrails: Trail[] = [
  {
    id: "fallback-paseo-ridge-network",
    name: "Paseo Ridge Network",
    area: "Cebu Highlands",
    trailhead: {
      id: "fallback-paseo-trailhead",
      name: "Paseo Trailhead",
      location: "Paseo Arcenas, Banawa, Cebu City",
      lat: 10.30979,
      lng: 123.87455,
    },
    nextTrailId: "fallback-pahamutan-extension-trail",
    destinations: [
      {
        id: "fallback-starbuk-viewpoint",
        name: "Starbuk Viewpoint",
        type: "Checkpoint",
        difficulty: "Moderate",
        reward: 20,
        lat: 10.2936,
        lng: 123.8735,
      },
      {
        id: "fallback-pahamutan-peak",
        name: "Pahamutan Peak",
        type: "Target",
        difficulty: "Hard",
        reward: 30,
        lat: 10.2978,
        lng: 123.8782,
      },
    ],
  },
  {
    id: "fallback-pahamutan-extension-trail",
    name: "Pahamutan Extension Trail",
    area: "Cebu Highlands",
    trailhead: {
      id: "fallback-pahamutan-junction-trailhead",
      name: "Pahamutan Junction Trailhead",
      location: "Connected next trail start",
      lat: 10.2978,
      lng: 123.8782,
    },
    nextTrailId: null,
    destinations: [
      {
        id: "fallback-cedar-camp-stop",
        name: "Cedar Camp Stop",
        type: "Checkpoint",
        difficulty: "Moderate",
        reward: 20,
        lat: 10.3005,
        lng: 123.881,
      },
      {
        id: "fallback-eagle-crest-summit",
        name: "Eagle Crest Summit",
        type: "Target",
        difficulty: "Expert",
        reward: 40,
        lat: 10.304,
        lng: 123.884,
      },
    ],
  },
];

const currentLocationDemoName = "Current Location Discovery";
const currentLocationClaimCode = "current_location_discovery";
const currentLocationReward = 10;
const currentLocationImageUrl =
  "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1200&q=80";

function isCituDemoDestination(destination?: Pick<DestinationCard, "name"> | null) {
  return destination?.name.toLowerCase().includes("cit-u") || false;
}

function createEmptyCheckInState(): CheckInState {
  return {
    gps: false,
    photo: false,
    verified: false,
    gpsPoint: null,
    photoName: "",
    photoHash: "",
    metadataHash: "",
    solanaSignature: "",
  };
}

function getDifficultyClass(level: DifficultyLevel): string {
  switch (level) {
    case "Easy":
      return "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40";
    case "Moderate":
      return "bg-amber-500/20 text-amber-200 border border-amber-400/40";
    case "Hard":
      return "bg-rose-500/20 text-rose-200 border border-rose-400/40";
    case "Expert":
      return "bg-violet-500/20 text-violet-200 border border-violet-400/40";
  }
}

function getTierClass(tier: "Beginner" | "Advanced" | "Expert"): string {
  switch (tier) {
    case "Beginner":
      return "bg-sky-500/20 text-sky-200 border border-sky-400/40";
    case "Advanced":
      return "bg-orange-500/20 text-orange-200 border border-orange-400/40";
    case "Expert":
      return "bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/40";
  }
}

function getActionStateClass(state: "idle" | "active" | "done") {
  switch (state) {
    case "active":
      return "border-sky-500/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/20";
    case "done":
      return "border-emerald-500/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/20";
    case "idle":
      return "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700";
  }
}

function getActionIconClass(state: "idle" | "active" | "done") {
  switch (state) {
    case "active":
      return "text-sky-300";
    case "done":
      return "text-emerald-300";
    case "idle":
      return "text-zinc-100";
  }
}

function getJoinedEventStatus(
  activity: FeedPost,
  eventStarted: boolean,
  eventExpired: boolean
) {
  if (activity.participant?.failed) {
    return {
      label: "Failed Task",
      helper: "Marked failed",
      badgeClass: "border border-rose-500/40 bg-rose-500/15 text-rose-100",
      railClass: "bg-rose-500",
      cardClass: "border-rose-500/40 bg-rose-950/30",
    };
  }

  if (activity.participant?.completed) {
    return {
      label: "Completed",
      helper: "Reward claimed",
      badgeClass:
        "border border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
      railClass: "bg-emerald-500",
      cardClass: "border-emerald-500/35 bg-emerald-950/20",
    };
  }

  if (eventExpired) {
    return {
      label: "Expired",
      helper: "Window closed",
      badgeClass: "border border-zinc-600 bg-zinc-700 text-zinc-200",
      railClass: "bg-zinc-500",
      cardClass: "border-zinc-700 bg-zinc-800",
    };
  }

  if (!eventStarted) {
    return {
      label: "Scheduled",
      helper: "Waiting to start",
      badgeClass: "border border-amber-500/40 bg-amber-500/15 text-amber-100",
      railClass: "bg-amber-400",
      cardClass: "border-amber-500/35 bg-amber-950/20",
    };
  }

  if (activity.participant?.verifiedStart) {
    return {
      label: "Ongoing",
      helper: "Start verified",
      badgeClass: "border border-sky-500/40 bg-sky-500/15 text-sky-100",
      railClass: "bg-sky-400",
      cardClass: "border-sky-500/35 bg-sky-950/20",
    };
  }

  return {
    label: "Pending Start",
    helper: "Verify start",
    badgeClass: "border border-violet-500/40 bg-violet-500/15 text-violet-100",
    railClass: "bg-violet-400",
    cardClass: "border-violet-500/35 bg-violet-950/20",
  };
}

function formatPoint(point?: MapPoint | null) {
  if (!point) return "Choose a point";
  return point.name?.trim() || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

function formatDistance(distanceKm?: number | null) {
  if (!distanceKm) return "Choose a route";
  return `${distanceKm.toFixed(distanceKm >= 10 ? 1 : 2)} km`;
}

const GEOFENCE_RADIUS_METERS = 180;
const GPS_ACCURACY_MARGIN_METERS = 60;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function isUsablePoint(point?: MapPoint | null) {
  return Boolean(
    point &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      (point.lat !== 0 || point.lng !== 0)
  );
}

function getDistanceMeters(from?: MapPoint | null, to?: MapPoint | null) {
  if (!isUsablePoint(from) || !isUsablePoint(to)) return null;

  const earthRadiusMeters = 6371000;
  const latDistance = toRadians((to as MapPoint).lat - (from as MapPoint).lat);
  const lngDistance = toRadians((to as MapPoint).lng - (from as MapPoint).lng);
  const fromLat = toRadians((from as MapPoint).lat);
  const toLat = toRadians((to as MapPoint).lat);
  const a =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos(fromLat) *
      Math.cos(toLat) *
      Math.sin(lngDistance / 2) *
      Math.sin(lngDistance / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getGeofenceStatus(
  currentPoint?: MapPoint | null,
  targetPoint?: MapPoint | null,
  accuracyMeters?: number | null
): GeofenceStatus {
  const effectiveRadiusMeters =
    GEOFENCE_RADIUS_METERS +
    Math.min(Math.max(accuracyMeters || 0, 0), GPS_ACCURACY_MARGIN_METERS);
  const distanceMeters = getDistanceMeters(currentPoint, targetPoint);

  return {
    available: distanceMeters !== null,
    inside: distanceMeters !== null && distanceMeters <= effectiveRadiusMeters,
    distanceMeters,
    effectiveRadiusMeters,
  };
}

function formatMeters(distanceMeters?: number | null) {
  if (distanceMeters === null || distanceMeters === undefined) {
    return "Waiting for GPS";
  }

  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 1 : 2)} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

async function sha256Hex(input: string | ArrayBuffer) {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  const data = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(data).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function shortenHash(hash: string, size = 8) {
  if (!hash) return "Pending";
  return `${hash.slice(0, size)}...${hash.slice(-size)}`;
}

function parseTokenUnits(amount: number | string, decimals: number) {
  const amountText = String(amount).trim();

  if (!/^\d+(\.\d+)?$/.test(amountText)) {
    throw new Error("Token amount must be a positive decimal value.");
  }

  const [wholePart, fractionalPart = ""] = amountText.split(".");

  if (fractionalPart.length > decimals) {
    throw new Error(`TRIPIX supports at most ${decimals} decimal places.`);
  }

  return BigInt(`${wholePart}${fractionalPart.padEnd(decimals, "0")}`);
}

function getClientErrorMessage(error: unknown, fallback: string) {
  const errorText =
    error instanceof Error
      ? error.message
      : error && typeof error === "object"
      ? JSON.stringify(error)
      : String(error || "");

  if (errorText.includes("no record of a prior credit")) {
    return "Your connected wallet needs devnet SOL for transaction fees. Add devnet SOL, then try again.";
  }

  if (error instanceof Error && error.message && error.message !== "Unexpected error") {
    return error.message;
  }

  if (error && typeof error === "object") {
    const wrappedError = "error" in error ? (error as { error?: unknown }).error : null;

    if (wrappedError instanceof Error && wrappedError.message) {
      return wrappedError.message;
    }

    if (wrappedError && typeof wrappedError === "object" && "message" in wrappedError) {
      const message = String((wrappedError as { message?: unknown }).message || "");
      if (message) return message;
    }

    if ("message" in error) {
      const message = String((error as { message?: unknown }).message || "");
      if (message && message !== "Unexpected error") return message;
    }
  }

  return fallback;
}

function isPublicImageUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

async function uploadProofPhoto(file: File, userId: string, prefix: string) {
  const rawExtension = file.name.split(".").pop() || "jpg";
  const extension = rawExtension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const photoPath = `checkins/${userId}/${prefix}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from("checkin-photos")
    .upload(photoPath, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("checkin-photos").getPublicUrl(photoPath);
  return data.publicUrl;
}

function createAuthUserFromSession(
  sessionUser: SessionUser,
  userProfile?: UserProfile | null
): AuthUser {
  const displayName =
    userProfile?.display_name?.trim() ||
    userProfile?.full_name?.trim() ||
    sessionUser.user_metadata?.full_name?.trim() ||
    sessionUser.user_metadata?.name?.trim() ||
    sessionUser.email?.split("@")[0] ||
    "Traveler";
  const seed = (sessionUser.id || sessionUser.email || displayName)
    .replace(/[^a-zA-Z0-9]/g, "")
    .padEnd(42, "0")
    .slice(0, 42);
  const publicKey = userProfile?.wallet_address || `TQ${seed}`;

  return {
    displayName,
    passwordHash: `supabase:${sessionUser.id}`,
    walletAddress: publicKey,
    publicKey,
    avatarUrl: userProfile?.avatar_url || "",
    bio: userProfile?.bio || "",
    contactNumber: [userProfile?.phone_country_code, userProfile?.phone_local_number]
      .filter(Boolean)
      .join(" "),
    location: [
      userProfile?.barangay,
      userProfile?.municipality,
      userProfile?.region,
      userProfile?.country,
      userProfile?.zip_code,
    ]
      .filter(Boolean)
      .join(", "),
  };
}

async function cropAvatarFile(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const size = 640;
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sourceX = (bitmap.width - sourceSize) / 2;
  const sourceY = (bitmap.height - sourceSize) / 2;

  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("Your browser could not crop this image.");
  }

  context.clearRect(0, 0, size, size);
  context.save();
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  context.closePath();
  context.clip();
  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    size,
    size
  );
  context.restore();
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Your browser could not save the cropped image."));
      },
      "image/png"
    );
  });

  return new File([blob], `avatar-${Date.now()}.png`, {
    type: "image/png",
  });
}

function ProfileAvatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = {
    sm: "h-11 w-11 text-sm",
    md: "h-14 w-14 text-lg",
    lg: "h-28 w-28 text-3xl",
  }[size];
  const [failedUrl, setFailedUrl] = useState("");
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
  const canRenderImage =
    !!avatarUrl &&
    failedUrl !== avatarUrl &&
    (/^https?:\/\//.test(avatarUrl) ||
      avatarUrl.startsWith("data:") ||
      avatarUrl.startsWith("blob:"));

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 font-semibold leading-none text-white ${sizeClass}`}
    >
      {canRenderImage ? (
        <Image
          src={avatarUrl}
          alt={`${name} profile photo`}
          fill
          unoptimized
          sizes={size === "lg" ? "112px" : size === "md" ? "56px" : "44px"}
          onError={() => setFailedUrl(avatarUrl)}
          className="object-cover"
        />
      ) : (
        <span className="block max-w-full truncate px-1 text-center">
          {initials}
        </span>
      )}
    </div>
  );
}

function ScreenTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 space-y-1">
      <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
        {title}
      </h2>
      <p className="max-w-2xl text-sm leading-6 text-zinc-300">{subtitle}</p>
    </div>
  );
}

function StatPill({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
}) {
  return (
    <div className="min-h-[140px] min-w-0 rounded-3xl border border-zinc-700 bg-zinc-800 px-6 py-6 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
        <Icon className="h-5 w-5 shrink-0 text-zinc-100" />
        <span className="truncate leading-none">{label}</span>
      </div>
      <div className="mt-6 text-4xl font-bold leading-none text-white">{value}</div>
    </div>
  );
}

function CompactStatPill({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
}) {
  return (
    <div className="min-w-0 min-h-[112px] rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-zinc-300">
        <Icon className="h-4 w-4 shrink-0 text-zinc-100" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-3 break-words text-xl font-semibold leading-tight text-white sm:text-2xl">
        {value}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-200">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 pr-10 text-sm text-white outline-none"
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-100" />
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3">
      <p className="text-xs font-medium uppercase text-zinc-400">{label}</p>
      <div className="mt-1 break-words text-sm font-semibold leading-6 text-white">
        {value}
      </div>
    </div>
  );
}

function AppNotificationToast({
  notification,
  onClose,
}: {
  notification: AppNotification;
  onClose: () => void;
}) {
  const toneClass: Record<NotificationTone, string> = {
    info: "border-sky-500/40 bg-sky-500/15 text-sky-100",
    warning: "border-amber-500/40 bg-amber-500/15 text-amber-100",
    error: "border-rose-500/40 bg-rose-500/15 text-rose-100",
    success: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
  };
  const iconClass: Record<NotificationTone, string> = {
    info: "text-sky-200",
    warning: "text-amber-200",
    error: "text-rose-200",
    success: "text-emerald-200",
  };
  const Icon = notification.tone === "success" ? CheckCircle2 : AlertCircle;

  return (
    <motion.div
      key={notification.id}
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      className={`w-full rounded-2xl border p-4 shadow-2xl backdrop-blur-md ${toneClass[notification.tone]}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-950/40">
          <Icon className={`h-5 w-5 ${iconClass[notification.tone]}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5 text-white">
            {notification.title}
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-100">
            {notification.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-zinc-200 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

function ConfirmationModal({
  dialog,
  onCancel,
}: {
  dialog: ConfirmationDialog;
  onCancel: () => void;
}) {
  const Icon = dialog.tone === "danger" ? Trash2 : CheckCircle2;
  const iconClass =
    dialog.tone === "danger"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : dialog.tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-sky-500/30 bg-sky-500/10 text-sky-200";
  const confirmClass =
    dialog.tone === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-500"
      : dialog.tone === "success"
      ? "bg-emerald-600 text-white hover:bg-emerald-500"
      : "bg-sky-600 text-white hover:bg-sky-500";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/75 px-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-[28px] border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${iconClass}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirmation-title" className="text-lg font-semibold text-white">
              {dialog.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              {dialog.message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="rounded-2xl border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className={`rounded-2xl ${confirmClass}`}
            onClick={() => void dialog.onConfirm()}
          >
            {dialog.confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function getRequiredAuthorityName(category: CategoryType) {
  switch (category) {
    case "Hiking":
      return "Hike Master";
    case "Falls":
      return "Waterfall Expertise";
    case "Beach":
      return "Beach Explorer";
    case "Island":
      return "Island Specialist";
  }
}

function readJoinedDestinationName(
  value?: CheckinDestinationJoin | CheckinDestinationJoin[] | null
) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0]?.name || undefined;
  return value.name || undefined;
}

function mapCheckinRow(
  row: CheckinRow,
  destinationLookup = new Map<string, string>()
): ProofMetadata {
  return {
    id: row.id,
    destination:
      (row.destination_id && destinationLookup.get(row.destination_id)) ||
      readJoinedDestinationName(row.destinations) ||
      "Saved check-in",
    gps: {
      lat: row.gps_lat || 0,
      lng: row.gps_lng || 0,
      name: row.gps_name || undefined,
    },
    photoName: row.photo_name || "Photo proof",
    photoHash: row.photo_hash || "",
    metadataHash: row.metadata_hash || "",
    solanaSignature: row.solana_signature || "",
    network: row.network === "Solana Devnet" ? "Solana Devnet" : "Solana Devnet",
    timestamp: row.created_at || "",
  };
}

function mapAchievementRows(
  achievementRows: AchievementRow[],
  userRows: UserAchievementRow[] = []
) {
  const progressByAchievement = new Map(
    userRows.map((row) => [row.achievement_id, row])
  );

  return achievementRows.map((achievement) => {
    const userAchievement = progressByAchievement.get(achievement.id);

    return {
      id: achievement.id,
      name: achievement.name,
      category: achievement.category,
      tier: achievement.tier,
      progress: userAchievement?.progress || 0,
      target: achievement.target,
      unlocked: userAchievement?.unlocked || false,
      description: achievement.description,
      grantsAuthority: achievement.grants_authority as CategoryType | undefined,
    };
  });
}

function mapWalletTransactionRow(row: WalletTransactionRow): BurnHistoryItem {
  return {
    id: row.id,
    title: row.title || row.tx_type,
    reason: row.tx_type,
    amount: readNumber(row.amount) || 0,
    direction: row.direction,
    status: "Completed",
    time: row.created_at ? new Date(row.created_at).toLocaleString() : "Just now",
  };
}

function getHikingDistanceRate(difficulty: DifficultyLevel) {
  const rates: Record<DifficultyLevel, number> = {
    Easy: 0.01,
    Moderate: 0.015,
    Hard: 0.02,
    Expert: 0.025,
  };

  return rates[difficulty];
}

function settleEventReward(
  stakeAmount: number,
  participantCapacity: number,
  completedCount: number,
  category: CategoryType,
  difficulty: DifficultyLevel,
  routeDistanceKm?: number | null
) {
  const burnAmount = Math.round(stakeAmount * 0.1);
  const rewardPool = stakeAmount - burnAmount;
  const distanceShare =
    category === "Hiking" && routeDistanceKm
      ? Math.min(routeDistanceKm * getHikingDistanceRate(difficulty), 1)
      : 0;
  const distanceRewardBonus =
    category === "Hiking" ? Math.min(Math.round(rewardPool * distanceShare), rewardPool) : 0;
  const rewardPerFinisher =
    participantCapacity > 0 ? Math.floor(rewardPool / participantCapacity) : 0;
  const paidOutBeforeThisCompletion = Math.min(
    Math.max(completedCount - 1, 0) * rewardPerFinisher,
    rewardPool
  );
  const rewardForLatestCompletion =
    completedCount > 0
      ? Math.min(rewardPerFinisher, rewardPool - paidOutBeforeThisCompletion)
      : 0;
  const totalPaidOut = Math.min(completedCount * rewardPerFinisher, rewardPool);
  const remainingRewardPool = rewardPool - totalPaidOut;

  return {
    burnAmount,
    distanceRewardBonus,
    rewardPool,
    remainingRewardPool,
    rewardPerFinisher,
    rewardForLatestCompletion,
  };
}

function parseEventDateTime(date?: string, time?: string) {
  if (!date || !time) return null;

  const dateTime = new Date(`${date}T${time}`);
  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
}

function getEventStartDateTime(post: FeedPost) {
  return parseEventDateTime(post.eventDate, post.startTime);
}

function getEventExpirationDateTime(post: FeedPost) {
  return parseEventDateTime(post.expirationDate || post.eventDate, post.endTime);
}

function readNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message || "";
  return (
    error.code === "PGRST204" ||
    message.includes("schema cache") ||
    message.includes("Could not find the") ||
    (message.includes("column ") && message.includes(" does not exist"))
  );
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message || "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("relation ") ||
    message.includes("Could not find the table") ||
    message.includes("schema cache")
  );
}

function isPostCommentAuthorColumnError(
  error: { code?: string; message?: string } | null
) {
  if (!error) return false;
  const message = error.message || "";
  return (
    message.includes("post_comments.author_") ||
    (message.includes("post_comments") &&
      (message.includes("author_name") ||
        message.includes("author_avatar_url")))
  );
}

function readPoint(
  lat: number | null,
  lng: number | null,
  name: string | null
): MapPoint | undefined {
  if (typeof lat !== "number" || typeof lng !== "number") return undefined;
  return {
    lat,
    lng,
    name: name || undefined,
  };
}

function mapFeedPostRow(row: FeedPostRow): FeedPost {
  const author = row.author_name || "Traveler";

  return {
    id: row.id,
    userId: row.user_id,
    author,
    avatar: author.slice(0, 2).toUpperCase(),
    avatarUrl: row.author_avatar_url || undefined,
    destination: row.destination || "TravelQuest",
    caption: row.caption,
    achievement: row.achievement || "Travel Update",
    likes: row.likes_count || 0,
    likedByUser: false,
    comments: row.comments_count || 0,
    image: row.image_url || "Travel story",
    postType: row.post_type,
    eventTitle: row.event_title || undefined,
    eventCategory: row.event_category as CategoryType | undefined,
    eventDifficulty: row.event_difficulty as DifficultyLevel | undefined,
    joinCost: readNumber(row.join_cost),
    joinedCount: row.joined_count || 0,
    completedCount: row.completed_count || 0,
    failedCount: row.failed_count || 0,
    eventCapacity: row.event_capacity || undefined,
    initialPoint: readPoint(row.initial_lat, row.initial_lng, row.initial_name),
    destinationPoint: readPoint(
      row.destination_lat,
      row.destination_lng,
      row.destination_name
    ),
    eventDate: row.event_date || undefined,
    expirationDate: row.expiration_date || undefined,
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
    eventDescription: row.event_description || undefined,
    eventImage: row.event_image_url || undefined,
    creatorAuthorityName: row.creator_authority_name || undefined,
    requiredAuthorityName: row.required_authority_name || undefined,
    stakeAmount: readNumber(row.stake_amount),
    rewardPool: readNumber(row.reward_pool),
    remainingRewardPool: readNumber(row.remaining_reward_pool),
    burnAmount: readNumber(row.burn_amount),
    routeDistanceKm: readNumber(row.route_distance_km),
    distanceRewardBonus: readNumber(row.distance_reward_bonus),
    rewardPerFinisher: readNumber(row.reward_per_finisher),
    participant:
      row.post_type === "event"
        ? {
            joined: false,
            verifiedStart: false,
            completed: false,
            failed: false,
            rewardClaimed: false,
          }
        : undefined,
  };
}

function mapEventParticipantRow(row?: EventParticipantRow): EventProgress {
  return {
    joined: Boolean(row?.joined),
    verifiedStart: Boolean(row?.verified_start),
    completed: Boolean(row?.completed),
    failed: Boolean(row?.failed),
    rewardClaimed: Boolean(row?.reward_claimed),
  };
}

async function loadPostEngagementCounts(postIds: string[], userId: string) {
  if (postIds.length === 0) {
    return {
      likeCounts: new Map<string, number>(),
      likedPostIds: new Set<string>(),
      commentCounts: new Map<string, number>(),
    };
  }

  const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
    supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
    supabase.from("post_comments").select("post_id").in("post_id", postIds),
  ]);
  const likeCounts = new Map<string, number>();
  const likedPostIds = new Set<string>();
  const commentCounts = new Map<string, number>();

  (likeRows || []).forEach((row) => {
    const postId = row.post_id as string;
    likeCounts.set(postId, (likeCounts.get(postId) || 0) + 1);
    if (row.user_id === userId) {
      likedPostIds.add(postId);
    }
  });
  (commentRows || []).forEach((row) => {
    const postId = row.post_id as string;
    commentCounts.set(postId, (commentCounts.get(postId) || 0) + 1);
  });

  return { likeCounts, likedPostIds, commentCounts };
}

function mapDestinationRow(row: DestinationRow): DestinationCard {
  return {
    id: row.id,
    name: row.name,
    category: row.category as CategoryType,
    location: row.location || "TravelQuest",
    difficulty: (row.difficulty || "Easy") as DifficultyLevel,
    points: readNumber(row.reward_points) || 0,
    requiresQR: Boolean(row.requires_qr),
    description: row.description || "",
    hero: row.hero || "Travel story",
    imageUrl: row.image_url || "",
    startLat: row.start_lat || 0,
    startLng: row.start_lng || 0,
    destLat: row.dest_lat || 0,
    destLng: row.dest_lng || 0,
  };
}

function mapTrailRows(
  trailRows: TrailRow[],
  trailheadRows: TrailheadRow[],
  destinationRows: TrailDestinationRow[]
): Trail[] {
  return trailRows.map((trail) => {
    const trailhead = trailheadRows.find((item) => item.trail_id === trail.id);

    return {
      id: trail.id,
      name: trail.name,
      area: trail.area || "TravelQuest Trails",
      trailhead: {
        id: trailhead?.id || `trailhead-${trail.id}`,
        name: trailhead?.name || `${trail.name} Trailhead`,
        location: trailhead?.location || "Registered initial hiking point",
        lat: readNumber(trailhead?.lat) || null,
        lng: readNumber(trailhead?.lng) || null,
      },
      nextTrailId: trail.next_trail_id,
      destinations: destinationRows
        .filter((destination) => destination.trail_id === trail.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((destination) => ({
          id: destination.id,
          name: destination.name,
          type: destination.destination_type,
          difficulty: destination.difficulty,
          reward: readNumber(destination.reward) || 0,
          lat: readNumber(destination.lat) || null,
          lng: readNumber(destination.lng) || null,
        })),
    };
  });
}

function createPostInsertPayload(
  post: FeedPost,
  sessionUser: SessionUser,
  authUser: AuthUser
) {
  return {
    user_id: sessionUser.id,
    post_type: post.postType || "standard",
    author_name: post.author === "You" ? authUser.displayName : post.author,
    author_avatar_url: post.avatarUrl || authUser.avatarUrl || null,
    destination: post.destination,
    caption: post.caption,
    achievement: post.achievement,
    image_url: post.postType === "event" ? null : post.image,
    likes_count: post.likes,
    comments_count: post.comments,
    event_title: post.eventTitle || null,
    event_category: post.eventCategory || null,
    event_difficulty: post.eventDifficulty || null,
    join_cost: post.joinCost ?? null,
    joined_count: post.joinedCount || 0,
    completed_count: post.completedCount || 0,
    failed_count: post.failedCount || 0,
    event_capacity: post.eventCapacity ?? null,
    initial_lat: post.initialPoint?.lat ?? null,
    initial_lng: post.initialPoint?.lng ?? null,
    initial_name: post.initialPoint?.name || null,
    destination_lat: post.destinationPoint?.lat ?? null,
    destination_lng: post.destinationPoint?.lng ?? null,
    destination_name: post.destinationPoint?.name || null,
    event_date: post.eventDate || null,
    expiration_date: post.expirationDate || null,
    start_time: post.startTime || null,
    end_time: post.endTime || null,
    event_description: post.eventDescription || null,
    event_image_url: post.eventImage || null,
    creator_authority_name: post.creatorAuthorityName || null,
    required_authority_name: post.requiredAuthorityName || null,
    stake_amount: post.stakeAmount ?? null,
    reward_pool: post.rewardPool ?? null,
    remaining_reward_pool: post.remainingRewardPool ?? null,
    burn_amount: post.burnAmount ?? null,
    route_distance_km: post.routeDistanceKm ?? null,
    distance_reward_bonus: post.distanceRewardBonus ?? null,
    reward_per_finisher: post.rewardPerFinisher ?? null,
  };
}

const utilityActions: UtilityAction[] = [
  {
    id: "u1",
    title: "Create Community Event",
    description:
      "Lock a TRIPIX stake, burn 10%, and distribute the reward pool to verified finishers.",
    burnCost: 100,
    type: "CREATE_EVENT",
    icon: Flame,
  },
  {
    id: "u2",
    title: "Join Featured Event",
    description:
      "Access authority-backed events with verification and completion rewards.",
    burnCost: 10,
    type: "JOIN_EVENT",
    icon: Ticket,
  },
  {
    id: "u3",
    title: "Unlock Souvenir Badge",
    description:
      "Burn TRIPIX to unlock a collectible destination badge or special proof item.",
    burnCost: 25,
    type: "UNLOCK_BADGE",
    icon: Award,
  },
  {
    id: "u4",
    title: "Activate Reward Boost",
    description: "Boost the next verified trip or hike reward.",
    burnCost: 15,
    type: "ACTIVATE_BOOST",
    icon: Zap,
  },
];

export default function TravelQuestMVP({
  sessionUser,
  userProfile,
  onLogout,
}: TravelQuestMVPProps) {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction, signTransaction } = useWallet();
  const tripixMint = process.env.NEXT_PUBLIC_TRIPIX_MINT_ADDRESS || "";
  const solanaNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
  const profileVideoRef = useRef<HTMLVideoElement | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(userProfile || null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileCameraStream, setProfileCameraStream] =
    useState<MediaStream | null>(null);
  const authUser = useMemo(
    () => createAuthUserFromSession(sessionUser, profile),
    [sessionUser, profile]
  );
  const [tab, setTab] = useState<TabKey>("feed");
  const [search, setSearch] = useState("");
  const [inAppTripixAmount, setInAppTripixAmount] = useState(0);
  const [onChainTripixAmount, setOnChainTripixAmount] = useState(0);
  const [onChainTripixLoading, setOnChainTripixLoading] = useState(false);
  const [onChainTripixError, setOnChainTripixError] = useState("");
  const refreshOnChainTripixBalance = useCallback(async () => {
    if (!publicKey) {
      setOnChainTripixAmount(0);
      setOnChainTripixError("");
      return;
    }

    if (!tripixMint) {
      setOnChainTripixAmount(0);
      setOnChainTripixError("TRIPIX mint is not configured.");
      return;
    }

    setOnChainTripixLoading(true);
    setOnChainTripixError("");

    try {
      const mintPublicKey = new PublicKey(tripixMint);
      const { value } = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: mintPublicKey }
      );
      const total = value.reduce((sum, account) => {
        const tokenAmount =
          account.account.data.parsed.info.tokenAmount.uiAmount || 0;
        return sum + tokenAmount;
      }, 0);

      setOnChainTripixAmount(total);
    } catch (error) {
      setOnChainTripixAmount(0);
      setOnChainTripixError(
        error instanceof Error
          ? error.message
          : "Could not read on-chain TRIPIX balance."
      );
    } finally {
      setOnChainTripixLoading(false);
    }
  }, [connection, publicKey, tripixMint]);
  const tokenBalance = connected ? onChainTripixAmount : inAppTripixAmount;
  const tokenBalanceDisplay = useMemo(
    () =>
      tokenBalance.toLocaleString(undefined, {
        maximumFractionDigits: 6,
      }),
    [tokenBalance]
  );
  const inAppTripixBalance = useMemo(
    () =>
      inAppTripixAmount.toLocaleString(undefined, {
        maximumFractionDigits: 6,
      }),
    [inAppTripixAmount]
  );
  const onChainTripixBalance = useMemo(
    () =>
      onChainTripixAmount.toLocaleString(undefined, {
        maximumFractionDigits: 6,
      }),
    [onChainTripixAmount]
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialog | null>(null);
  const [eventStartPreviewPostId, setEventStartPreviewPostId] = useState<
    string | null
  >(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileName, setProfileName] = useState(
    profile?.full_name ||
      sessionUser.user_metadata?.full_name ||
      sessionUser.email?.split("@")[0] ||
      ""
  );
  const [profileBio, setProfileBio] = useState(profile?.bio || "");
  const [profileLocalNumber, setProfileLocalNumber] = useState(
    profile?.phone_local_number || ""
  );
  const [destinations, setDestinations] = useState<DestinationCard[]>([]);
  const [selectedDestination, setSelectedDestination] =
    useState<DestinationCard | null>(null);
  const [currentLocationSaving, setCurrentLocationSaving] = useState(false);
  const [currentLocationClaimLoading, setCurrentLocationClaimLoading] =
    useState(true);
  const [currentLocationClaimed, setCurrentLocationClaimed] = useState(false);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [selectedTrailId, setSelectedTrailId] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [utilityView, setUtilityView] = useState<"actions" | "createEvent">(
    "actions"
  );
  const [eventImagePreview, setEventImagePreview] = useState("");
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);

  useEffect(() => {
    void refreshOnChainTripixBalance();
  }, [refreshOnChainTripixBalance]);

  useEffect(() => {
    const saveWalletAddress = async () => {
      if (!publicKey || !sessionUser?.id) return;

      const walletAddress = publicKey.toBase58();

      const { error } = await supabase
        .from("profiles")
        .update({
          wallet_address: walletAddress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionUser.id);

      if (error) {
        console.error("Failed to save wallet address:", error.message);
      }
    };

    void saveWalletAddress();
  }, [publicKey, sessionUser?.id]);

  useEffect(() => {
    return () => {
      if (eventImagePreview) {
        URL.revokeObjectURL(eventImagePreview);
      }
    };
  }, [eventImagePreview]);

  useEffect(() => {
    if (profileVideoRef.current) {
      profileVideoRef.current.srcObject = profileCameraStream;
    }

    return () => {
      profileCameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [profileCameraStream]);

  const [eventRoute, setEventRoute] = useState<{
    startPoint: MapPoint | null;
    destinationPoint: MapPoint | null;
    distanceKm: number | null;
  }>({
    startPoint: null,
    destinationPoint: null,
    distanceKm: null,
  });

  const [eventForm, setEventForm] = useState({
    title: "",
    category: "Hiking" as CategoryType,
    difficulty: "Moderate" as DifficultyLevel,
    date: "",
    expirationDate: "",
    startTime: "",
    endTime: "",
    capacity: "",
    description: "",
    stakeAmount: "",
  });
  const [eventFieldErrors, setEventFieldErrors] = useState<
    RequiredEventField[]
  >([]);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>(
    {}
  );

  const [checkInState, setCheckInState] = useState<CheckInState>(
    createEmptyCheckInState
  );
  const [checkInPhotoFile, setCheckInPhotoFile] = useState<File | null>(null);
  const [hikeProofPhotoFile, setHikeProofPhotoFile] = useState<File | null>(null);
  const [hikeProofPhotoName, setHikeProofPhotoName] = useState("");
  const [liveGps, setLiveGps] = useState<LiveGpsFix | null>(null);
  const [gpsTracking, setGpsTracking] = useState(false);
  const gpsWatchIdRef = useRef<number | null>(null);

  const [proofRecords, setProofRecords] = useState<ProofMetadata[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [profileStats, setProfileStats] = useState<ProfileStats>({
    postsCount: 0,
    placesCount: 0,
    badgesCount: 0,
  });
  const [accountSecurity, setAccountSecurity] = useState<AccountSecurity>({
    passwordSha256: "",
    solanaPublicKey: "",
    network: "Solana Devnet",
  });
  const [hostingAuthority, setHostingAuthority] = useState<HostingAuthority[]>(
    []
  );

  const [achievementFilter, setAchievementFilter] = useState("All");

  const [burnHistory, setBurnHistory] = useState<BurnHistoryItem[]>([]);

  const [hikeSession, setHikeSession] = useState<HikeSession>({
    id: null,
    active: false,
    trailheadVerified: false,
    currentTrailheadMatched: false,
    targetReached: false,
    status: "Not Started",
    reachedDestinationIds: [],
    currentTrailId: null,
    selectedTargetId: null,
    totalEarned: 0,
    lastRewardBreakdown: null,
    multiDestinationBonusAwarded: false,
    nextTrailReady: false,
  });

  const filteredDestinations = useMemo(() => {
    return destinations.filter((d) =>
      `${d.name} ${d.category} ${d.location}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [destinations, search]);

  const filteredAchievements = useMemo(() => {
    if (achievementFilter === "All") return achievements;
    if (achievementFilter === "Unlocked") {
      return achievements.filter((a) => a.unlocked);
    }
    if (achievementFilter === "Locked") {
      return achievements.filter((a) => !a.unlocked);
    }
    return achievements.filter((a) => a.category === achievementFilter);
  }, [achievementFilter, achievements]);

  const totalBurned = useMemo(
    () =>
      burnHistory.reduce(
        (sum, item) => (item.direction === "debit" ? sum + item.amount : sum),
        0
      ),
    [burnHistory]
  );

  const selectedTrail = useMemo(
    () => trails.find((trail) => trail.id === selectedTrailId) || trails[0] || null,
    [selectedTrailId, trails]
  );

  const selectedTarget = useMemo(
    () => {
      if (!selectedTrail) return null;
      return (
      selectedTrail.destinations.find(
        (destination) => destination.id === selectedTargetId
      ) ||
      selectedTrail.destinations[0] ||
      null
      );
    },
    [selectedTargetId, selectedTrail]
  );

  const selectedTrailheadPoint = useMemo<MapPoint | null>(() => {
    if (
      !selectedTrail ||
      selectedTrail.trailhead.lat === null ||
      selectedTrail.trailhead.lng === null
    ) {
      return null;
    }

    return {
      lat: selectedTrail.trailhead.lat,
      lng: selectedTrail.trailhead.lng,
      name: selectedTrail.trailhead.name,
    };
  }, [selectedTrail]);
  const selectedDestinationStartPoint = useMemo<MapPoint | null>(() => {
    if (!selectedDestination) return null;
    return {
      lat: selectedDestination.startLat,
      lng: selectedDestination.startLng,
      name: `${selectedDestination.name} initial location`,
    };
  }, [selectedDestination]);

  const selectedDestinationTargetPoint = useMemo<MapPoint | null>(() => {
    if (!selectedDestination) return null;
    return {
      lat: selectedDestination.destLat,
      lng: selectedDestination.destLng,
      name: selectedDestination.name,
    };
  }, [selectedDestination]);
  const selectedDestinationId = selectedDestination?.id || "";

  useEffect(() => {
    setCheckInState(createEmptyCheckInState());
    setCheckInPhotoFile(null);
  }, [selectedDestinationId]);

  const currentGpsPoint = liveGps?.point ?? null;
  const startGeofenceStatus = useMemo(
    () =>
      getGeofenceStatus(
        currentGpsPoint,
        selectedDestinationStartPoint,
        liveGps?.accuracy
      ),
    [currentGpsPoint, selectedDestinationStartPoint, liveGps?.accuracy]
  );
  const targetGeofenceStatus = useMemo(
    () =>
      getGeofenceStatus(
        currentGpsPoint,
        selectedDestinationTargetPoint,
        liveGps?.accuracy
      ),
    [currentGpsPoint, selectedDestinationTargetPoint, liveGps?.accuracy]
  );
  const trailheadGeofenceStatus = useMemo(
    () =>
      getGeofenceStatus(
        currentGpsPoint,
        selectedTrailheadPoint,
        liveGps?.accuracy
      ),
    [currentGpsPoint, selectedTrailheadPoint, liveGps?.accuracy]
  );
  const trailheadReadyToStart =
    hikeSession.currentTrailheadMatched || trailheadGeofenceStatus.inside;

  const nextTrail = useMemo(
    () =>
      selectedTrail
        ? trails.find((trail) => trail.id === selectedTrail.nextTrailId) || null
        : null,
    [selectedTrail, trails]
  );
  const nextTrailheadPoint = useMemo<MapPoint | null>(() => {
    if (
      !nextTrail ||
      nextTrail.trailhead.lat === null ||
      nextTrail.trailhead.lng === null
    ) {
      return null;
    }

    return {
      lat: nextTrail.trailhead.lat,
      lng: nextTrail.trailhead.lng,
      name: nextTrail.trailhead.name,
    };
  }, [nextTrail]);

  const joinedActivities = useMemo(() => {
    return feedPosts.filter(
      (post) => post.postType === "event" && post.participant?.joined
    );
  }, [feedPosts]);
  const eventStartPreviewPost = useMemo(
    () =>
      eventStartPreviewPostId
        ? feedPosts.find((post) => post.id === eventStartPreviewPostId) || null
        : null,
    [eventStartPreviewPostId, feedPosts]
  );
  const eventStartPreviewStatus = useMemo(
    () =>
      eventStartPreviewPost
        ? getGeofenceStatus(
            currentGpsPoint,
            eventStartPreviewPost.initialPoint,
            liveGps?.accuracy
          )
        : null,
    [currentGpsPoint, eventStartPreviewPost, liveGps?.accuracy]
  );

  const parsedCapacity = Number(eventForm.capacity || 0);
  const parsedStake = Number(eventForm.stakeAmount || 0);
  const hasValidStake = Number.isFinite(parsedStake) && parsedStake > 0;
  const stakeSettlement = useMemo(
    () =>
      settleEventReward(
        parsedStake || 0,
        parsedCapacity || 0,
        0,
        eventForm.category,
        eventForm.difficulty,
        eventRoute.distanceKm
      ),
    [
      eventForm.category,
      eventForm.difficulty,
      eventRoute.distanceKm,
      parsedCapacity,
      parsedStake,
    ]
  );
  const eventFieldErrorSet = useMemo(
    () => new Set<RequiredEventField>(eventFieldErrors),
    [eventFieldErrors]
  );
  const hasEventFieldError = useCallback(
    (field: RequiredEventField) => eventFieldErrorSet.has(field),
    [eventFieldErrorSet]
  );
  const clearEventFieldError = useCallback((field: RequiredEventField) => {
    setEventFieldErrors((prev) => prev.filter((item) => item !== field));
  }, []);
  const getEventInputClass = useCallback(
    (field: RequiredEventField, className = "") =>
      `${className} ${
        hasEventFieldError(field)
          ? "border-amber-400 bg-amber-500/10 text-white ring-2 ring-amber-400/30 focus-visible:border-amber-300 focus-visible:ring-amber-400/40"
          : ""
      }`,
    [hasEventFieldError]
  );
  const handleRouteDistanceChange = useCallback((distanceKm: number | null) => {
    setEventRoute((prev) => ({
      ...prev,
      distanceKm,
    }));

    if (distanceKm !== null) {
      clearEventFieldError("distance");
    }
  }, [clearEventFieldError]);

  const navItems: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
    { key: "feed", label: "Feed", icon: Home },
    { key: "discover", label: "Discover", icon: Search },
    { key: "checkin", label: "Check-In", icon: Camera },
    { key: "hiking", label: "Hike", icon: Route },
    { key: "wallet", label: "Balance", icon: Wallet },
    { key: "utility", label: "TRIPIX Utility", icon: Flame },
    { key: "achievements", label: "Achievements", icon: Award },
    { key: "profile", label: "Profile", icon: User },
  ];

  const isEventExpired = (post: FeedPost) => {
    const expirationDateTime = getEventExpirationDateTime(post);
    return expirationDateTime ? new Date() > expirationDateTime : false;
  };

  const hasEventStarted = (post: FeedPost) => {
    const startDateTime = getEventStartDateTime(post);
    return startDateTime ? new Date() >= startDateTime : false;
  };
  const canHostEvent = useCallback(
    (category: CategoryType) => {
      return (
        hostingAuthority.find((item) => item.category === category)?.authorized ||
        false
      );
    },
    [hostingAuthority]
  );

  const showNotification = useCallback(
    (title: string, message: string, tone: NotificationTone = "info") => {
      const nextNotification = {
        id: Date.now() + Math.random(),
        title,
        message,
        tone,
      };

      setNotifications((prev) => [...prev, nextNotification].slice(-4));

      window.setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((item) => item.id !== nextNotification.id)
        );
      }, 4200);
    },
    []
  );

  const loadWalletState = useCallback(async () => {
    const [walletResult, transactionResult] = await Promise.all([
      supabase
        .from("wallets")
        .select("available_balance, locked_balance, pending_balance")
        .eq("user_id", sessionUser.id)
        .maybeSingle(),
      supabase
        .from("wallet_transactions")
        .select("id, tx_type, amount, direction, title, description, reference_id, created_at")
        .eq("user_id", sessionUser.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const wallet = walletResult.data as WalletRow | null;
    setInAppTripixAmount(readNumber(wallet?.available_balance) || 0);

    setBurnHistory(
      ((transactionResult.data || []) as WalletTransactionRow[]).map(
        mapWalletTransactionRow
      )
    );
  }, [sessionUser.id]);

  const loadCurrentLocationClaim = useCallback(async () => {
    setCurrentLocationClaimLoading(true);
    const { data, error } = await supabase
      .from("user_reward_claims")
      .select("id")
      .eq("user_id", sessionUser.id)
      .eq("claim_code", currentLocationClaimCode)
      .maybeSingle();

    if (error) {
      if (!isMissingRelationError(error)) {
        showNotification(
          "Claim status unavailable",
          error.message,
          "warning"
        );
      }
      setCurrentLocationClaimed(false);
      setCurrentLocationClaimLoading(false);
      return;
    }

    setCurrentLocationClaimed(Boolean(data));
    setCurrentLocationClaimLoading(false);
  }, [sessionUser.id, showNotification]);

  const recordCurrentLocationClaim = useCallback(
    async (sourceReferenceId: string) => {
      const { error } = await supabase.from("user_reward_claims").insert({
        user_id: sessionUser.id,
        claim_code: currentLocationClaimCode,
        reward_amount: currentLocationReward,
        source_reference_id: sourceReferenceId,
      });

      if (!error || error.code === "23505") {
        setCurrentLocationClaimed(true);
        return true;
      }

      if (isMissingRelationError(error)) {
        showNotification(
          "Claim table missing",
          "Reward claims are being prepared. Please try again shortly.",
          "warning"
        );
        return false;
      }

      showNotification("Claim not saved", error.message, "error");
      return false;
    },
    [sessionUser.id, showNotification]
  );

  const recordWalletTransaction = useCallback(
    async ({
      txType,
      amount,
      direction,
      title,
      description,
      referenceId,
      affectsBalance = true,
    }: {
      txType: BurnReason;
      amount: number;
      direction: "credit" | "debit";
      title: string;
      description?: string;
      referenceId?: string;
      affectsBalance?: boolean;
    }) => {
      const { data } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: sessionUser.id,
          tx_type: txType,
          amount,
          direction,
          title,
          description:
            description ||
            (affectsBalance
              ? "Recorded in your activity history. Devnet TRIPIX balance is read from Solana."
              : null),
          reference_id: referenceId || null,
        })
        .select("id, tx_type, amount, direction, title, description, reference_id, created_at")
        .single();

      if (data) {
        setBurnHistory((prev) => [
          mapWalletTransactionRow(data as WalletTransactionRow),
          ...prev,
        ]);
      }
    },
    [sessionUser.id]
  );

  const sendTreasuryReward = useCallback(
    async ({
      txType,
      amount,
      title,
      description,
      destinationWallet,
      sourceReferenceId,
    }: {
      txType: "CHECKIN_REWARD" | "HIKE_REWARD" | "EVENT_REWARD";
      amount: number;
      title: string;
      description: string;
      destinationWallet?: string;
      sourceReferenceId: string;
    }) => {
      const { session, error: sessionError } = await supabase.auth
        .getSession()
        .then(({ data, error }) => ({ session: data.session, error }))
        .catch((error: Error) => ({ session: null, error }));

      if (sessionError || !session?.access_token) {
        if (sessionError) {
          await supabase.auth.signOut({ scope: "local" });
        }
        showNotification(
          "Reward not sent",
          "Sign in again so the system wallet can send TRIPIX to your wallet.",
          "error"
        );
        return null;
      }

      const response = await fetch("/api/tripix/treasury", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "reward",
          amount,
          userId: sessionUser.id,
          destinationWallet,
          sourceReferenceId,
          txType,
          title,
          description,
        }),
      });
      let payload: TreasuryRewardResponse = {};

      try {
        payload = (await response.clone().json()) as TreasuryRewardResponse;
      } catch {
        const text = await response.clone().text();
        payload = {
          error:
            text?.trim() ||
            response.statusText ||
            "The treasury endpoint did not return a readable response.",
        };
      }

      if (!response.ok || !payload.ok) {
        showNotification(
          "Reward not sent",
          payload.error || "The system wallet could not send TRIPIX.",
          "error"
        );
        return null;
      }

      if (payload.transaction) {
        setBurnHistory((prev) => [
          mapWalletTransactionRow(payload.transaction as WalletTransactionRow),
          ...prev,
        ]);
      }

      showNotification(
        "TRIPIX sent",
        `System wallet sent ${amount} TRIPIX to your connected wallet.`,
        "success"
      );
      await loadWalletState();
      await refreshOnChainTripixBalance();

      return payload;
    },
    [loadWalletState, refreshOnChainTripixBalance, sessionUser.id, showNotification]
  );

  const transferTripixToTreasury = useCallback(
    async (amount: number, title: string) => {
      if (!publicKey) {
        showNotification(
          "Wallet not connected",
          "Connect your wallet before locking TRIPIX.",
          "error"
        );
        return null;
      }

      if (!tripixMint) {
        showNotification(
          "TRIPIX mint missing",
          "Configure NEXT_PUBLIC_TRIPIX_MINT_ADDRESS before sending TRIPIX.",
          "error"
        );
        return null;
      }

      let snapshot: TreasurySnapshotResponse = {};

      try {
        const response = await fetch("/api/tripix/treasury");
        snapshot = (await response.json()) as TreasurySnapshotResponse;

        if (!response.ok || !snapshot.treasury) {
          throw new Error(snapshot.error || "Could not load the system wallet.");
        }

        const mint = new PublicKey(snapshot.treasury.mint);
        const configuredMint = new PublicKey(tripixMint);

        if (!mint.equals(configuredMint)) {
          throw new Error("The treasury mint does not match the configured TRIPIX mint.");
        }

        const treasury = new PublicKey(snapshot.treasury.treasury);
        const sourceAccount = await getAssociatedTokenAddress(mint, publicKey);
        const treasuryAccount = await getAssociatedTokenAddress(mint, treasury);
        const sourceAccountInfo = await connection.getAccountInfo(sourceAccount);

        if (!sourceAccountInfo) {
          throw new Error("Your connected wallet does not have a TRIPIX token account.");
        }

        const treasuryAccountInfo = await connection.getAccountInfo(treasuryAccount);
        const rawAmount = parseTokenUnits(amount, snapshot.treasury.decimals);
        const transaction = new Transaction();
        const parsedSourceAccount = await connection.getParsedAccountInfo(sourceAccount);
        const sourceData = parsedSourceAccount.value?.data;
        const sourceTokenAmount =
          sourceData && "parsed" in sourceData
            ? sourceData.parsed.info.tokenAmount.amount
            : null;

        if (sourceTokenAmount !== null && BigInt(sourceTokenAmount) < rawAmount) {
          throw new Error("Your connected wallet does not have enough on-chain TRIPIX.");
        }

        if (!treasuryAccountInfo) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey,
              treasuryAccount,
              treasury,
              mint
            )
          );
        }

        transaction.add(
          createTransferCheckedInstruction(
            sourceAccount,
            mint,
            treasuryAccount,
            publicKey,
            rawAmount,
            snapshot.treasury.decimals
          )
        );

        const latestBlockhash = await connection.getLatestBlockhash("confirmed");
        transaction.feePayer = publicKey;
        transaction.recentBlockhash = latestBlockhash.blockhash;

        showNotification(
          "Approve wallet transfer",
          `${title}: send ${amount} TRIPIX to the TravelQuest system wallet on ${solanaNetwork}.`,
          "info"
        );

        let signature: string;

        if (signTransaction) {
          const signedTransaction = await signTransaction(transaction);
          signature = await connection.sendRawTransaction(
            signedTransaction.serialize(),
            {
              preflightCommitment: "confirmed",
              skipPreflight: false,
            }
          );
        } else {
          signature = await sendTransaction(transaction, connection, {
            preflightCommitment: "confirmed",
            skipPreflight: false,
          });
        }

        await connection.confirmTransaction(
          {
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          },
          "confirmed"
        );
        await refreshOnChainTripixBalance();

        showNotification(
          "Stake locked",
          `Sent ${amount} TRIPIX to the system wallet.`,
          "success"
        );

        return signature;
      } catch (error) {
        showNotification(
          "System wallet transfer failed",
          getClientErrorMessage(
            error,
            "The connected wallet could not send TRIPIX. Check that this wallet has TRIPIX and enough devnet SOL for fees."
          ),
          "error"
        );
        return null;
      }
    },
    [
      connection,
      publicKey,
      refreshOnChainTripixBalance,
      sendTransaction,
      signTransaction,
      showNotification,
      solanaNetwork,
      tripixMint,
    ]
  );

  const burnEventStakeFromTreasury = useCallback(
    async ({
      amount,
      title,
      sourceReferenceId,
    }: {
      amount: number;
      title: string;
      sourceReferenceId: string;
    }) => {
      const { session, error: sessionError } = await supabase.auth
        .getSession()
        .then(({ data, error }) => ({ session: data.session, error }))
        .catch((error: Error) => ({ session: null, error }));

      if (sessionError || !session?.access_token) {
        if (sessionError) {
          await supabase.auth.signOut({ scope: "local" });
        }
        showNotification(
          "Burn not sent",
          "Sign in again so the system wallet can burn the event reserve.",
          "error"
        );
        return null;
      }

      const response = await fetch("/api/tripix/treasury", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "burn",
          amount,
          userId: sessionUser.id,
          sourceReferenceId,
          txType: "EVENT_BURN",
          title,
          description: "10% event stake burned from the TravelQuest Treasury.",
        }),
      });
      let payload: TreasuryRewardResponse = {};

      try {
        payload = (await response.clone().json()) as TreasuryRewardResponse;
      } catch {
        const text = await response.clone().text();
        payload = {
          error:
            text?.trim() ||
            response.statusText ||
            "The treasury endpoint did not return a readable response.",
        };
      }

      if (!response.ok || !payload.ok) {
        showNotification(
          "Burn not sent",
          payload.error || "The system wallet could not burn TRIPIX.",
          "error"
        );
        return null;
      }

      if (payload.transaction) {
        setBurnHistory((prev) => [
          mapWalletTransactionRow(payload.transaction as WalletTransactionRow),
          ...prev,
        ]);
      }

      showNotification(
        "TRIPIX burned",
        `System wallet burned ${amount} TRIPIX for this event.`,
        "success"
      );
      await loadWalletState();
      await refreshOnChainTripixBalance();

      return payload;
    },
    [loadWalletState, refreshOnChainTripixBalance, sessionUser.id, showNotification]
  );

  const loadProfileStats = useCallback(async () => {
    const { data, error } = await supabase
      .from("profile_stats")
      .select("posts_count, places_count, badges_count")
      .eq("user_id", sessionUser.id)
      .maybeSingle();

    if (error) return;

    setProfileStats({
      postsCount: data?.posts_count || 0,
      placesCount: data?.places_count || 0,
      badgesCount: data?.badges_count || 0,
    });
  }, [sessionUser.id]);

  const loadDestinations = useCallback(async () => {
    const { data, error } = await supabase
      .from("destinations")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      showNotification(
        "Destinations unavailable",
        error.message,
        "warning"
      );
      return;
    }

    if (data && data.length > 0) {
      const mappedDestinations = (data as DestinationRow[]).map(mapDestinationRow);
      setDestinations(mappedDestinations);
      setSelectedDestination((current) =>
        current && mappedDestinations.some((item) => item.id === current.id)
          ? current
          : mappedDestinations[0]
      );
      return;
    }

    setDestinations([]);
    setSelectedDestination(null);
  }, [showNotification]);

  const loadTrails = useCallback(async () => {
    const [{ data: trailRows, error: trailError }, { data: trailheadRows }, { data: destinationRows }] =
      await Promise.all([
        supabase
          .from("trails")
          .select("id, code, name, area, next_trail_id")
          .order("created_at", { ascending: true }),
        supabase.from("trailheads").select("id, trail_id, name, location, lat, lng"),
        supabase
          .from("trail_destinations")
          .select("id, trail_id, name, destination_type, difficulty, reward, sort_order, lat, lng")
          .order("sort_order", { ascending: true }),
      ]);

    if (trailError) {
      showNotification("Trails unavailable", trailError.message, "warning");
      return;
    }

    if (trailRows && trailRows.length > 0) {
      const mappedTrails = mapTrailRows(
        trailRows as TrailRow[],
        (trailheadRows || []) as TrailheadRow[],
        (destinationRows || []) as TrailDestinationRow[]
      );
      setTrails(mappedTrails);
      setSelectedTrailId((current) =>
        current && mappedTrails.some((item) => item.id === current)
          ? current
          : mappedTrails[0]?.id || ""
      );
      const firstTarget =
        mappedTrails[0]?.destinations.find((item) => item.type === "Target") ||
        mappedTrails[0]?.destinations[0];
      setSelectedTargetId((current) =>
        current && mappedTrails.some((trail) =>
          trail.destinations.some((destination) => destination.id === current)
        )
          ? current
          : firstTarget?.id || ""
      );
      return;
    }

    setTrails(fallbackTrails);
    setSelectedTrailId((current) =>
      current && fallbackTrails.some((item) => item.id === current)
        ? current
        : fallbackTrails[0]?.id || ""
    );
    const firstTarget =
      fallbackTrails[0]?.destinations.find((item) => item.type === "Target") ||
      fallbackTrails[0]?.destinations[0];
    setSelectedTargetId((current) =>
      current && fallbackTrails.some((trail) =>
        trail.destinations.some((destination) => destination.id === current)
      )
        ? current
        : firstTarget?.id || ""
    );
  }, [showNotification]);

  const loadAchievements = useCallback(async () => {
    const [{ data: achievementRows, error: achievementsError }, { data: userRows }] =
      await Promise.all([
        supabase
          .from("achievements")
          .select("id, name, category, tier, target, description, grants_authority")
          .order("created_at", { ascending: true }),
        supabase
          .from("user_achievements")
          .select("achievement_id, progress, unlocked")
          .eq("user_id", sessionUser.id),
      ]);

    if (achievementsError) {
      showNotification("Achievements unavailable", achievementsError.message, "warning");
      setAchievements([]);
      return;
    }

    if (!achievementRows || achievementRows.length === 0) {
      setAchievements([]);
      return;
    }

    setAchievements(
      mapAchievementRows(
        (achievementRows || []) as AchievementRow[],
        (userRows || []) as UserAchievementRow[]
      )
    );
  }, [sessionUser.id, showNotification]);

  const loadProofRecords = useCallback(async () => {
    const destinationLookup = new Map(
      destinations.map((destination) => [destination.id, destination.name])
    );
    const { data, error } = await supabase
      .from("checkins")
      .select(
        "id, destination_id, gps_lat, gps_lng, gps_name, photo_name, photo_url, photo_hash, metadata_hash, solana_signature, network, created_at, destinations(name)"
      )
      .eq("user_id", sessionUser.id)
      .order("created_at", { ascending: false });

    if (error) return;
    setProofRecords(
      ((data || []) as CheckinRow[]).map((row) =>
        mapCheckinRow(row, destinationLookup)
      )
    );
  }, [destinations, sessionUser.id]);

  const loadAccountSecurity = useCallback(async () => {
    const fallbackPasswordHash = await sha256Hex(authUser.passwordHash);
    const fallbackSecurity = {
      passwordSha256: fallbackPasswordHash,
      solanaPublicKey: authUser.publicKey,
      network: "Solana Devnet",
    };
    const { data, error } = await supabase
      .from("account_security")
      .select("password_sha256, solana_public_key, network")
      .eq("user_id", sessionUser.id)
      .maybeSingle();

    if (error || !data) {
      setAccountSecurity(fallbackSecurity);
      void supabase.from("account_security").upsert({
        user_id: sessionUser.id,
        password_sha256: fallbackPasswordHash,
        solana_public_key: authUser.publicKey,
        network: "Solana Devnet",
        updated_at: new Date().toISOString(),
      });
      return;
    }

    setAccountSecurity({
      passwordSha256: data.password_sha256 || fallbackPasswordHash,
      solanaPublicKey: data.solana_public_key || authUser.publicKey,
      network: data.network || "Solana Devnet",
    });
  }, [authUser.passwordHash, authUser.publicKey, sessionUser.id]);

  const loadHostingAuthority = useCallback(async () => {
    const { data, error } = await supabase
      .from("user_hosting_authority")
      .select("category, required_badge, authorized")
      .eq("user_id", sessionUser.id);

    if (error || !data || data.length === 0) {
      setHostingAuthority([]);
      return;
    }

    setHostingAuthority(
      data.map((row) => ({
        category: row.category as CategoryType,
        requiredBadge: row.required_badge,
        authorized: Boolean(row.authorized),
      }))
    );
  }, [sessionUser.id]);

  useEffect(() => {
    const loadFeedPosts = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        showNotification("Feed unavailable", error.message, "warning");
        return;
      }

      if (data && data.length > 0) {
        const mappedPosts = (data as FeedPostRow[]).map(mapFeedPostRow);
        const postIds = mappedPosts.map((post) => post.id).filter(isUuid);
        const { likeCounts, likedPostIds, commentCounts } =
          await loadPostEngagementCounts(postIds, sessionUser.id);
        const { data: participantRows, error: participantError } =
          postIds.length > 0
            ? await supabase
                .from("event_participants")
                .select(
                  "post_id, joined, verified_start, completed, failed, reward_claimed"
                )
                .eq("user_id", sessionUser.id)
                .in("post_id", postIds)
            : { data: [], error: null };
        const participantByPost = new Map(
          ((participantRows || []) as EventParticipantRow[]).map((row) => [
            row.post_id,
            row,
          ])
        );

        if (participantError && !isMissingColumnError(participantError)) {
          showNotification(
            "Event progress unavailable",
            participantError.message,
            "warning"
          );
        }

        setFeedPosts(
          mappedPosts.map((post) => ({
            ...post,
            likes: likeCounts.get(post.id) ?? post.likes,
            likedByUser: likedPostIds.has(post.id),
            comments: commentCounts.get(post.id) ?? post.comments,
            participant:
              post.postType === "event"
                ? mapEventParticipantRow(participantByPost.get(post.id))
                : undefined,
          }))
        );
        return;
      }

      setFeedPosts([]);
    };

    void loadFeedPosts();
  }, [sessionUser.id, showNotification]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAchievements();
      void loadDestinations();
      void loadTrails();
      void loadProofRecords();
      void loadProfileStats();
      void loadAccountSecurity();
      void loadWalletState();
      void loadHostingAuthority();
      void loadCurrentLocationClaim();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    loadAccountSecurity,
    loadAchievements,
    loadCurrentLocationClaim,
    loadDestinations,
    loadTrails,
    loadHostingAuthority,
    loadWalletState,
    loadProfileStats,
    loadProofRecords,
  ]);

  const saveFeedPost = useCallback(
    async (post: FeedPost) => {
      const { data, error } = await supabase
        .from("posts")
        .insert(createPostInsertPayload(post, sessionUser, authUser))
        .select("*")
        .single();

      if (error) {
        showNotification("Post not saved", error.message, "error");
        return null;
      }

      const savedPost = mapFeedPostRow(data as FeedPostRow);
      setFeedPosts((prev) => [savedPost, ...prev]);
      void loadProfileStats();
      return savedPost;
    },
    [authUser, loadProfileStats, sessionUser, showNotification]
  );

  const refreshAchievementProgress = useCallback(async () => {
    const { error } = await supabase.rpc("refresh_user_achievement_progress", {
      p_user_id: sessionUser.id,
    });

    if (error) {
      showNotification("Achievement progress not saved", error.message, "warning");
      return;
    }

    await loadAchievements();
    await loadHostingAuthority();
    await loadProfileStats();
  }, [
    loadAchievements,
    loadHostingAuthority,
    loadProfileStats,
    sessionUser.id,
    showNotification,
  ]);

  const handleLogout = () => {
    setCheckInState(createEmptyCheckInState());
    setCheckInPhotoFile(null);
    onLogout?.();
  };

  const handleProfileAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    showNotification("Uploading avatar", "Saving your new profile photo.", "info");

    let croppedFile: File;

    try {
      croppedFile = await cropAvatarFile(file);
    } catch (error) {
      setAvatarUploading(false);
      showNotification(
        "Photo not ready",
        error instanceof Error ? error.message : "Could not prepare this image.",
        "error"
      );
      return;
    }

    const filePath = `avatars/${sessionUser.id}-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(filePath, croppedFile, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      setAvatarUploading(false);
      showNotification("Photo upload failed", uploadError.message, "error");
      return;
    }

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(filePath);
    const nextAvatarUrl = data.publicUrl;

    console.log("Saved file path:", filePath);
    console.log("Generated public URL:", nextAvatarUrl);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        avatar_url: nextAvatarUrl,
        avatar_storage_path: filePath,
        avatar_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionUser.id);

    if (profileError) {
      setAvatarUploading(false);
      showNotification("Profile photo not saved", profileError.message, "error");
      return;
    }

    setProfile((prev) => ({
      ...(prev || {}),
      avatar_url: nextAvatarUrl,
      avatar_storage_path: filePath,
      avatar_updated_at: new Date().toISOString(),
    }));
    setFeedPosts((prev) =>
      prev.map((post) =>
        post.author === "You" ? { ...post, avatarUrl: nextAvatarUrl } : post
      )
    );
    setAvatarUploading(false);
    showNotification("Avatar updated", "Your dashboard avatar is now updated.", "success");
  };

  const handleProfileCameraStart = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showNotification(
        "Camera unavailable",
        "Camera is not available in this browser.",
        "warning"
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setProfileCameraStream(stream);
    } catch {
      showNotification(
        "Camera blocked",
        "Camera permission was blocked or no camera was found.",
        "error"
      );
    }
  };

  const handleProfileCameraCapture = async () => {
    const video = profileVideoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      showNotification(
        "Camera starting",
        "Camera is still starting. Try again in a moment.",
        "info"
      );
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      showNotification("Camera unavailable", "We could not capture a photo.", "error");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );

    if (!blob) {
      showNotification("Camera unavailable", "We could not capture a photo.", "error");
      return;
    }

    await handleProfileAvatarUpload(
      new File([blob], `camera-${Date.now()}.jpg`, {
        type: "image/jpeg",
      })
    );
    profileCameraStream?.getTracks().forEach((track) => track.stop());
    setProfileCameraStream(null);
  };

  const handleProfileDetailsSave = async () => {
    const nextName = profileName.trim();
    const nextLocalNumber = profileLocalNumber.trim();

    if (!nextName) {
      showNotification("Name required", "Enter a display name before saving.", "warning");
      return;
    }

    setProfileSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: nextName,
        full_name: nextName,
        bio: profileBio,
        phone_local_number: nextLocalNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionUser.id);

    if (error) {
      setProfileSaving(false);
      showNotification("Profile not saved", error.message, "error");
      return;
    }

    const previousName = authUser.displayName;

    setProfile((prev) => ({
      ...(prev || {}),
      display_name: nextName,
      full_name: nextName,
      bio: profileBio,
      phone_local_number: nextLocalNumber,
    }));
    setFeedPosts((prev) =>
      prev.map((post) =>
        post.author === previousName || post.author === "You"
          ? {
              ...post,
              author: post.author === previousName ? nextName : post.author,
              avatar: nextName.slice(0, 2).toUpperCase(),
            }
          : post
      )
    );
    setProfileSaving(false);
    setProfileEditing(false);
    showNotification("Profile updated", "Your profile details were saved.", "success");
  };

  const handleProfileSaveRequest = () => {
    if (!profileName.trim()) {
      showNotification("Name required", "Enter a display name before saving.", "warning");
      return;
    }

    setConfirmationDialog({
      title: "Save profile changes?",
      message:
        "Your display name, bio, and contact number will be updated on your TravelQuest profile.",
      confirmLabel: "Save Profile",
      tone: "success",
      onConfirm: async () => {
        setConfirmationDialog(null);
        await handleProfileDetailsSave();
      },
    });
  };

  const requireWalletConnected = useCallback(
    (action: string) => {
      if (connected) return true;

      showNotification(
        "Wallet required",
        `Connect Phantom before you ${action}.`,
        "warning"
      );
      return false;
    },
    [showNotification, connected]
  );

  const applyLiveGpsPosition = useCallback((position: GeolocationPosition) => {
    setLiveGps({
      point: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        name: "Current GPS location",
      },
      accuracy: Number.isFinite(position.coords.accuracy)
        ? position.coords.accuracy
        : null,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const stopLiveGpsTracking = useCallback(() => {
    if (gpsWatchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }
    setGpsTracking(false);
  }, []);

  const startLiveGpsTracking = useCallback(
    (showStartedNotification = true) => {
      if (!navigator.geolocation) {
        showNotification(
          "GPS unavailable",
          "This browser cannot provide live GPS tracking.",
          "error"
        );
        return false;
      }

      if (gpsWatchIdRef.current !== null) return true;

      setGpsTracking(true);
      gpsWatchIdRef.current = navigator.geolocation.watchPosition(
        applyLiveGpsPosition,
        () => {
          setGpsTracking(false);
          gpsWatchIdRef.current = null;
          showNotification(
            "GPS tracking blocked",
            "Allow location access so TravelQuest can verify your geofences.",
            "error"
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 3000,
          timeout: 12000,
        }
      );

      if (showStartedNotification) {
        showNotification(
          "Live GPS started",
          "Your current location will update for start and destination geofence checks.",
          "success"
        );
      }

      return true;
    },
    [applyLiveGpsPosition, showNotification]
  );

  const getFreshGpsFix = useCallback(async () => {
    if (!navigator.geolocation) {
      showNotification(
        "GPS unavailable",
        "This browser cannot provide GPS proof.",
        "error"
      );
      return null;
    }

    return new Promise<LiveGpsFix | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const fix = {
            point: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              name: "Live GPS capture",
            },
            accuracy: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : null,
            updatedAt: new Date().toISOString(),
          };

          setLiveGps(fix);
          resolve(fix);
        },
        () => {
          showNotification(
            "GPS unavailable",
            "Browser GPS was unavailable. Check location permissions and try again.",
            "error"
          );
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, [showNotification]);

  const ensureWithinGeofence = useCallback(
    async (targetPoint: MapPoint | null | undefined, label: string) => {
      if (!isUsablePoint(targetPoint)) {
        showNotification(
          "Geofence missing",
          `Set coordinates for the ${label} before this can be verified.`,
          "warning"
        );
        return null;
      }

      const fix = liveGps || (await getFreshGpsFix());
      if (!fix) return null;

      const status = getGeofenceStatus(fix.point, targetPoint, fix.accuracy);
      if (!status.inside) {
        showNotification(
          "Outside geofence",
          `You are ${formatMeters(
            status.distanceMeters
          )} from the ${label}. Move within ${formatMeters(
            status.effectiveRadiusMeters
          )} to verify.`,
          "warning"
        );
        return null;
      }

      return { fix, status };
    },
    [getFreshGpsFix, liveGps, showNotification]
  );

  useEffect(() => {
    if (tab === "checkin" && selectedDestination) {
      startLiveGpsTracking(false);
    }
  }, [selectedDestination, startLiveGpsTracking, tab]);

  useEffect(() => {
    if (tab === "hiking" && selectedTrailheadPoint) {
      startLiveGpsTracking(false);
    }
  }, [selectedTrailheadPoint, startLiveGpsTracking, tab]);

  useEffect(() => {
    if (tab === "utility" && utilityView === "createEvent" && eventForm.category === "Hiking") {
      startLiveGpsTracking(false);
    }
  }, [eventForm.category, startLiveGpsTracking, tab, utilityView]);

  useEffect(() => {
    return () => {
      stopLiveGpsTracking();
    };
  }, [stopLiveGpsTracking]);

  const handleDiscoverCurrentLocation = async () => {
    if (currentLocationClaimed) {
      showNotification(
        "Already claimed",
        "The current-location starter reward is limited to one claim per user.",
        "info"
      );
      return;
    }

    setCurrentLocationSaving(true);
    startLiveGpsTracking(false);
    const gpsFix = await getFreshGpsFix();

    if (!gpsFix) {
      setCurrentLocationSaving(false);
      return;
    }

    const currentPoint = gpsFix.point;
    const payload = {
      name: currentLocationDemoName,
      category: "Hiking",
      location: `${currentPoint.lat.toFixed(5)}, ${currentPoint.lng.toFixed(5)}`,
      difficulty: "Easy",
      reward_points: currentLocationReward,
      requires_qr: false,
      description:
        "Generated from your browser GPS for a quick check-in with camera proof.",
      hero: "Live location proof",
      image_url: currentLocationImageUrl,
      start_lat: currentPoint.lat,
      start_lng: currentPoint.lng,
      dest_lat: currentPoint.lat,
      dest_lng: currentPoint.lng,
      updated_at: new Date().toISOString(),
    };

    const { data: existingDestination } = await supabase
      .from("destinations")
      .select("id")
      .eq("name", currentLocationDemoName)
      .maybeSingle();

    const saveResult = existingDestination?.id
      ? await supabase
          .from("destinations")
          .update(payload)
          .eq("id", existingDestination.id)
          .select("*")
          .single()
      : await supabase
          .from("destinations")
          .insert(payload)
          .select("*")
          .single();

    setCurrentLocationSaving(false);

    if (saveResult.error || !saveResult.data) {
      showNotification(
        "Current location not saved",
        saveResult.error?.message ||
          "Current-location discovery is not available yet. Please try again later.",
        "error"
      );
      return;
    }

    const destination = mapDestinationRow(saveResult.data as DestinationRow);
    setDestinations((prev) => {
      const withoutCurrent = prev.filter(
        (item) => item.name !== currentLocationDemoName
      );
      return [destination, ...withoutCurrent];
    });
    setSelectedDestination(destination);
    setSearch("");
    setTab("checkin");
    showNotification(
      "Current location ready",
      `Created a ${currentLocationReward} TRIPIX discovery at your GPS position.`,
      "success"
    );
  };

  const handleVerifyGps = async () => {
    if (!selectedDestination) {
      showNotification(
        "No destination selected",
        "Choose a destination before capturing GPS.",
        "warning"
      );
      return;
    }

    startLiveGpsTracking(false);
    const geofenceResult = await ensureWithinGeofence(
      selectedDestinationTargetPoint,
      "target destination"
    );
    if (!geofenceResult) return;

    const point = {
      ...geofenceResult.fix.point,
      name: "Verified destination GPS capture",
    };

    setCheckInState((prev) => ({
      ...prev,
      gps: true,
      gpsPoint: point,
      verified: false,
      metadataHash: "",
      solanaSignature: "",
    }));
    showNotification(
      "GPS metadata captured",
      `${point.lat.toFixed(5)}, ${point.lng.toFixed(
        5
      )} is inside the target geofence.`,
      "success"
    );
  };

  const handlePhotoProofChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const photoHash = await sha256Hex(await file.arrayBuffer());

      setCheckInState((prev) => ({
        ...prev,
        photo: true,
        photoName: file.name,
        photoHash,
        verified: false,
        metadataHash: "",
        solanaSignature: "",
      }));
      setCheckInPhotoFile(file);
      showNotification(
        "Photo metadata captured",
        `SHA-256 photo hash ${shortenHash(photoHash)} is ready.`,
        "success"
      );
    } catch {
      showNotification(
        "Photo hash failed",
        "Try another image so proof metadata can be generated.",
        "error"
      );
    }
  };

  const handleHikePhotoProofChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setHikeProofPhotoFile(file);
    setHikeProofPhotoName(file.name);
    showNotification(
      "Hike photo ready",
      "This photo will be saved and used on the next successful hike post.",
      "success"
    );
  };

  const handleSimpleCheckIn = () => {
    if (!requireWalletConnected("claim TRIPIX rewards")) return;
    if (!selectedDestination) {
      showNotification(
        "No destination selected",
        "Choose a destination before checking in.",
        "warning"
      );
      return;
    }
    if (!isUuid(selectedDestination.id)) {
      showNotification(
        "Destination not persisted",
        "Only saved destinations can be checked in.",
        "warning"
      );
      void loadDestinations();
      return;
    }

    if (
      !authUser ||
      !checkInState.gps ||
      !checkInState.photo ||
      !checkInState.gpsPoint ||
      !checkInState.photoHash ||
      !checkInPhotoFile
    ) {
      return;
    }

    const gpsPoint = checkInState.gpsPoint;
    const photoHash = checkInState.photoHash;
    const photoName = checkInState.photoName;
    const photoFile = checkInPhotoFile;
    const isCurrentLocationClaim = selectedDestination.name === currentLocationDemoName;

    if (isCurrentLocationClaim && currentLocationClaimed) {
      showNotification(
        "Already claimed",
        "The current-location starter reward is limited to one claim per user.",
        "info"
      );
      return;
    }

    const validateProof = async () => {
      const geofenceResult = await ensureWithinGeofence(
        selectedDestinationTargetPoint,
        "target destination"
      );
      if (!geofenceResult) return;
      const verifiedGpsPoint = {
        ...geofenceResult.fix.point,
        name: gpsPoint.name || "Verified destination GPS capture",
      };

      const timestamp = new Date().toISOString();
      let photoUrl = "";

      try {
        photoUrl = await uploadProofPhoto(photoFile, sessionUser.id, "checkin");
      } catch {
        showNotification(
          "Photo storage failed",
          "The photo hash will still be used for proof, but the file could not be saved.",
          "warning"
        );
      }
      const metadataPayload = JSON.stringify({
        user: authUser.publicKey,
        destinationId: selectedDestination.id,
        destination: selectedDestination.name,
        gps: verifiedGpsPoint,
        geofence: {
          targetDistanceMeters: Math.round(
            geofenceResult.status.distanceMeters || 0
          ),
          radiusMeters: Math.round(geofenceResult.status.effectiveRadiusMeters),
          accuracyMeters: geofenceResult.fix.accuracy,
        },
        photoUrl,
        photoHash,
        timestamp,
      });
      const metadataHash = await sha256Hex(metadataPayload);
      const solanaSignature = await sha256Hex(
        `solana:devnet:${authUser.publicKey}:${metadataHash}`
      );
      const { data: checkinRow, error: checkinError } = await supabase
        .from("checkins")
        .insert({
          user_id: sessionUser.id,
          destination_id: selectedDestination.id,
          gps_verified: true,
          photo_verified: true,
          verified: true,
          gps_lat: verifiedGpsPoint.lat,
          gps_lng: verifiedGpsPoint.lng,
          gps_name: verifiedGpsPoint.name || null,
          photo_name: photoName,
          photo_url: photoUrl,
          photo_hash: photoHash,
          metadata_hash: metadataHash,
          solana_signature: solanaSignature,
          network: "Solana Devnet",
          reward_amount: selectedDestination.points,
          rewarded: true,
          status: "verified",
        })
        .select(
          "id, destination_id, gps_lat, gps_lng, gps_name, photo_name, photo_url, photo_hash, metadata_hash, solana_signature, network, created_at"
        )
        .single();

      if (checkinError || !checkinRow) {
        showNotification(
          "Check-in not saved",
          checkinError?.message || "Could not create this check-in.",
          "error"
        );
        return;
      }

      const savedProof = mapCheckinRow(
        {
          ...(checkinRow as CheckinRow),
          destinations: { name: selectedDestination.name },
          created_at: (checkinRow as CheckinRow).created_at || timestamp,
        },
        new Map([[selectedDestination.id, selectedDestination.name]])
      );
      const visitPayload = {
        user_id: sessionUser.id,
        destination_name: selectedDestination.name,
        category: selectedDestination.category,
        location: selectedDestination.location,
        verified: true,
      };
      const { error: visitError } = await supabase
        .from("user_destination_visits")
        .insert({
          ...visitPayload,
          destination_id: selectedDestination.id,
          checkin_id: checkinRow.id,
        });

      if (visitError && isMissingColumnError(visitError)) {
        await supabase.from("user_destination_visits").insert(visitPayload);
      }

      setProofRecords((prev) => [savedProof, ...prev]);
      setCheckInState((prev) => ({
        ...prev,
        gpsPoint: verifiedGpsPoint,
        verified: true,
        metadataHash,
        solanaSignature,
      }));
      setCheckInPhotoFile(null);
      const rewardPayload = await sendTreasuryReward({
        txType: "CHECKIN_REWARD",
        amount: selectedDestination.points,
        title: `Reward: ${selectedDestination.name}`,
        description: `Verified check-in reward for ${selectedDestination.name}.`,
        destinationWallet: publicKey?.toBase58(),
        sourceReferenceId: checkinRow.id,
      });

      if (rewardPayload && isCurrentLocationClaim) {
        await recordCurrentLocationClaim(checkinRow.id);
      }

      const savedPost = await saveFeedPost({
        id: "pending-check-in",
        author: authUser.displayName,
        avatar: authUser.displayName.slice(0, 2).toUpperCase(),
        avatarUrl: authUser.avatarUrl,
        destination: selectedDestination.name,
        caption: `Verified visit completed at ${selectedDestination.name}. Proof ${shortenHash(
          metadataHash
        )} anchored on Solana Devnet.`,
        achievement: `${selectedDestination.category} Progress +1`,
        likes: 0,
        comments: 0,
        image: photoUrl || selectedDestination.imageUrl || "Travel story",
        postType: "standard",
      });
      if (savedPost && isUuid(savedPost.id)) {
        void supabase
          .from("checkins")
          .update({
            created_post_id: savedPost.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", checkinRow.id);
      }
      await refreshAchievementProgress();

      if (isCituDemoDestination(selectedDestination)) {
        showNotification(
          "Authority progress updated",
          "CIT-U completion added progress toward each database-backed hosting authority.",
          "success"
        );
      }

      void loadProfileStats();

      showNotification(
        "Proof validated",
        `GPS and photo metadata were hashed with SHA-256 and anchored to Solana Devnet.`,
        "success"
      );
    };

    void validateProof();
  };

  const handleBurnAction = (action: UtilityAction) => {
    if (!requireWalletConnected("use TRIPIX utility actions")) return;
    if (tokenBalance < action.burnCost) return;

    void recordWalletTransaction({
      txType: action.type,
      amount: action.burnCost,
      direction: "debit",
      title: action.title,
      description: action.description,
    });
  };

  const applyCurrentLocationToEventStart = useCallback(
    async (showErrors = true) => {
      const fix = liveGps || (await getFreshGpsFix());
      if (!fix) return false;

      const point = {
        ...fix.point,
        name: "Current location start",
      };

      setEventRoute((prev) => {
        const pointMoved =
          prev.startPoint?.lat !== point.lat || prev.startPoint?.lng !== point.lng;

        return {
          ...prev,
          startPoint: point,
          distanceKm: pointMoved ? null : prev.distanceKm,
        };
      });
      clearEventFieldError("startPoint");

      if (showErrors) {
        showNotification(
          "Start location set",
          "Your current GPS location is now the event initial location.",
          "success"
        );
      }

      return true;
    },
    [clearEventFieldError, getFreshGpsFix, liveGps, showNotification]
  );

  const handleUtilityAction = async (action: UtilityAction) => {
    if (!requireWalletConnected("use TRIPIX utility actions")) return;
    if (action.type === "CREATE_EVENT") {
      setUtilityView("createEvent");
      startLiveGpsTracking(false);
      void applyCurrentLocationToEventStart();
      return;
    }

    handleBurnAction(action);
  };

  const saveEventParticipantProgress = async (
    postId: string,
    progress: Partial<{
      joined: boolean;
      verified_start: boolean;
      completed: boolean;
      failed: boolean;
      reward_claimed: boolean;
    }>
  ) => {
    if (!isUuid(postId)) return false;

    const { error } = await supabase.from("event_participants").upsert(
      {
        post_id: postId,
        user_id: sessionUser.id,
        ...progress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "post_id,user_id" }
    );

    if (error) {
      showNotification(
        "Event progress not saved",
        isMissingColumnError(error)
          ? "Apply the event participants migration before joining events."
          : error.message,
        "error"
      );
      return false;
    }

    return true;
  };

  const handleJoinEvent = async (postId: string, joinCost: number) => {
    if (!requireWalletConnected("join this event")) return;
    const eventPost = feedPosts.find((post) => post.id === postId);

    if (eventPost && isEventExpired(eventPost)) {
      showNotification(
        "Event expired",
        "This event has already expired.",
        "error"
      );
      return;
    }

    if (tokenBalance < joinCost) {
      showNotification(
        "Not enough TRIPIX",
        "You need more TRIPIX to join this event.",
        "error"
      );
      return;
    }

    const saved = await saveEventParticipantProgress(postId, {
      joined: true,
      verified_start: false,
      completed: false,
      failed: false,
      reward_claimed: false,
    });

    if (!saved) return;

    void recordWalletTransaction({
      txType: "JOIN_EVENT",
      amount: joinCost,
      direction: "debit",
      title: "Joined Premium Event",
      description: eventPost?.eventTitle || "Joined a premium event.",
      referenceId: postId,
    });

    setFeedPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              joinedCount: (post.joinedCount || 0) + 1,
              participant: {
                joined: true,
                verifiedStart: false,
                completed: false,
                failed: false,
                rewardClaimed: false,
              },
            }
          : post
      )
    );
    if (isUuid(postId)) {
      void supabase
        .from("posts")
        .update({
          joined_count: (eventPost?.joinedCount || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);
    }
  };

  const handleOpenEventStartPreview = async (postId: string) => {
    if (!requireWalletConnected("verify event progress")) return;
    const eventPost = feedPosts.find((post) => post.id === postId);

    if (eventPost && !hasEventStarted(eventPost)) {
      showNotification(
        "Event starts later",
        "This event has not started yet.",
        "warning"
      );
      return;
    }

    if (eventPost && isEventExpired(eventPost)) {
      showNotification(
        "Event expired",
        "This event has already expired.",
        "error"
      );
      return;
    }

    if (!eventPost) return;
    startLiveGpsTracking(false);
    void getFreshGpsFix();
    setEventStartPreviewPostId(postId);
  };

  const handleVerifyEventStart = async (postId: string) => {
    if (!requireWalletConnected("verify event progress")) return;
    const eventPost = feedPosts.find((post) => post.id === postId);

    if (eventPost && !hasEventStarted(eventPost)) {
      showNotification(
        "Event starts later",
        "This event has not started yet.",
        "warning"
      );
      return;
    }

    if (eventPost && isEventExpired(eventPost)) {
      showNotification(
        "Event expired",
        "This event has already expired.",
        "error"
      );
      return;
    }

    if (!eventPost) return;
    startLiveGpsTracking(false);
    const geofenceResult = await ensureWithinGeofence(
      eventPost.initialPoint,
      "initial location"
    );
    if (!geofenceResult) return;

    const saved = await saveEventParticipantProgress(postId, {
      joined: true,
      verified_start: true,
    });

    if (!saved) return;

    setFeedPosts((prev) =>
      prev.map((post) =>
        post.id === postId && post.participant
          ? {
              ...post,
              participant: {
                ...post.participant,
                verifiedStart: true,
              },
            }
          : post
      )
    );
    showNotification(
      "Initial location verified",
      `You are inside the start geofence at ${formatPoint(eventPost.initialPoint)}.`,
      "success"
    );
    setEventStartPreviewPostId(null);
  };

  const handleCompleteEvent = async (postId: string) => {
    if (!requireWalletConnected("complete this event and claim rewards")) return;
    const eventPost = feedPosts.find((post) => post.id === postId);

    if (eventPost && !hasEventStarted(eventPost)) {
      showNotification(
        "Event starts later",
        "This event has not started yet.",
        "warning"
      );
      return;
    }

    if (eventPost && isEventExpired(eventPost)) {
      showNotification(
        "Event expired",
        "This event has already expired.",
        "error"
      );
      return;
    }

    if (!eventPost) return;
    startLiveGpsTracking(false);
    const geofenceResult = await ensureWithinGeofence(
      eventPost.destinationPoint,
      "target destination"
    );
    if (!geofenceResult) return;

    const saved = await saveEventParticipantProgress(postId, {
      joined: true,
      verified_start: true,
      completed: true,
      failed: false,
      reward_claimed: true,
    });

    if (!saved) return;

    let nextCompletedCount = 0;
    let nextSettlement: ReturnType<typeof settleEventReward> | null = null;

    setFeedPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId || !post.participant || post.participant.completed) {
          return post;
        }

        nextCompletedCount = (post.completedCount || 0) + 1;
        const settlement = settleEventReward(
          post.stakeAmount || 0,
          post.eventCapacity || post.joinedCount || 1,
          nextCompletedCount,
          post.eventCategory || "Hiking",
          post.eventDifficulty || "Moderate",
          post.routeDistanceKm
        );
        nextSettlement = settlement;

        void sendTreasuryReward({
          txType: "EVENT_REWARD",
          amount: settlement.rewardForLatestCompletion,
          title: `Event reward: ${post.eventTitle || post.destination}`,
          description: "Reward for verified event completion.",
          destinationWallet: publicKey?.toBase58(),
          sourceReferenceId: post.id,
        });

        return {
          ...post,
          completedCount: nextCompletedCount,
          burnAmount: settlement.burnAmount,
          distanceRewardBonus: settlement.distanceRewardBonus,
          rewardPool: settlement.rewardPool,
          remainingRewardPool: settlement.remainingRewardPool,
          rewardPerFinisher: settlement.rewardPerFinisher,
          participant: {
            ...post.participant,
            completed: true,
            rewardClaimed: true,
          },
        };
      })
    );

    window.setTimeout(() => {
      if (!nextSettlement || !isUuid(postId)) return;
      void supabase
        .from("posts")
        .update({
          completed_count: nextCompletedCount,
          burn_amount: nextSettlement.burnAmount,
          distance_reward_bonus: nextSettlement.distanceRewardBonus,
          reward_pool: nextSettlement.rewardPool,
          remaining_reward_pool: nextSettlement.remainingRewardPool,
          reward_per_finisher: nextSettlement.rewardPerFinisher,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);
    }, 0);
    void refreshAchievementProgress();
  };

  const handleFailEvent = async (postId: string) => {
    if (!requireWalletConnected("update event progress")) return;
    const eventPost = feedPosts.find((post) => post.id === postId);

    if (eventPost && !hasEventStarted(eventPost)) {
      showNotification(
        "Event starts later",
        "This event has not started yet.",
        "warning"
      );
      return;
    }

    if (eventPost && isEventExpired(eventPost)) {
      showNotification(
        "Event expired",
        "This event has already expired.",
        "error"
      );
      return;
    }

    const saved = await saveEventParticipantProgress(postId, {
      joined: true,
      failed: true,
    });

    if (!saved) return;

    setFeedPosts((prev) =>
      prev.map((post) =>
        post.id === postId && post.participant
          ? {
              ...post,
              failedCount: (post.failedCount || 0) + 1,
              participant: {
                ...post.participant,
                failed: true,
              },
            }
          : post
      )
    );
    if (isUuid(postId)) {
      void supabase
        .from("posts")
        .update({
          failed_count: (eventPost?.failedCount || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);
    }
  };

  const handleLikePost = async (postId: string) => {
    const post = feedPosts.find((item) => item.id === postId);
    if (!post) return;

    if (!isUuid(postId)) {
      showNotification(
        "Post unavailable",
        "Only saved feed posts can record likes.",
        "info"
      );
      return;
    }

    if (post.likedByUser) {
      const { error: unlikeError } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", sessionUser.id);

      if (unlikeError) {
        showNotification("Like not removed", unlikeError.message, "error");
        return;
      }

      const nextLikes = Math.max(post.likes - 1, 0);

      setFeedPosts((prev) =>
        prev.map((item) =>
          item.id === postId
            ? { ...item, likedByUser: false, likes: nextLikes }
            : item
        )
      );
      void supabase
        .from("posts")
        .update({
          likes_count: nextLikes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);
      return;
    }

    const { error: likeError } = await supabase.from("post_likes").upsert(
      {
        post_id: postId,
        user_id: sessionUser.id,
      },
      { onConflict: "post_id,user_id", ignoreDuplicates: true }
    );

    if (likeError) {
      showNotification("Like not saved", likeError.message, "error");
      return;
    }

    const { count, error: countError } = await supabase
      .from("post_likes")
      .select("post_id", { count: "exact", head: true })
      .eq("post_id", postId);

    if (countError) {
      showNotification("Like saved", "Refresh the feed to see the latest count.", "info");
      return;
    }

    const nextLikes = count ?? post.likes + 1;

    setFeedPosts((prev) =>
      prev.map((item) =>
        item.id === postId
          ? { ...item, likedByUser: true, likes: nextLikes }
          : item
      )
    );
    void supabase
      .from("posts")
      .update({
        likes_count: nextLikes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);
  };

  const deletePost = async (postId: string) => {
    const post = feedPosts.find((item) => item.id === postId);
    if (!post) return;

    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      showNotification("Post not deleted", error.message, "error");
      return;
    }

    setFeedPosts((prev) => prev.filter((item) => item.id !== postId));
    setCommentsByPost((prev) => {
      const next = { ...prev };
      delete next[postId];
      return next;
    });
    showNotification("Post deleted", "Your feed post was removed.", "success");
    void loadProfileStats();
  };

  const handleDeletePost = (postId: string) => {
    const post = feedPosts.find((item) => item.id === postId);
    if (!post) return;

    if (post.userId !== sessionUser.id) {
      showNotification(
        "Delete unavailable",
        "You can only delete posts that you created.",
        "warning"
      );
      return;
    }

    setConfirmationDialog({
      title: "Delete this post?",
      message:
        "This removes the post from the feed, including its likes and comments.",
      confirmLabel: "Delete Post",
      tone: "danger",
      onConfirm: async () => {
        setConfirmationDialog(null);
        await deletePost(postId);
      },
    });
  };

  const handleCommentSubmit = async (postId: string) => {
    const content = (commentDrafts[postId] || "").trim();
    const post = feedPosts.find((item) => item.id === postId);
    if (!post || !content) return;

    if (!isUuid(postId)) {
      showNotification(
        "Post unavailable",
        "Only saved feed posts can record comments.",
        "info"
      );
      return;
    }

    let { data, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        user_id: sessionUser.id,
        content,
        author_name: authUser.displayName,
        author_avatar_url: authUser.avatarUrl || null,
      })
      .select("id, post_id, user_id, content, author_name, author_avatar_url, created_at")
      .single();

    if (error && isPostCommentAuthorColumnError(error)) {
      const retryResult = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: sessionUser.id,
          content,
        })
        .select("id, post_id, user_id, content, created_at")
        .single();

      data = retryResult.data
        ? {
            ...(retryResult.data as PostComment),
            author_name: authUser.displayName,
            author_avatar_url: authUser.avatarUrl || null,
          }
        : retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      showNotification("Comment not saved", error.message, "error");
      return;
    }

    const { count } = await supabase
      .from("post_comments")
      .select("post_id", { count: "exact", head: true })
      .eq("post_id", postId);
    const nextComments = count ?? post.comments + 1;

    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [data as PostComment, ...(prev[postId] || [])].slice(0, 3),
    }));
    setFeedPosts((prev) =>
      prev.map((item) =>
        item.id === postId ? { ...item, comments: nextComments } : item
      )
    );
    void supabase
      .from("posts")
      .update({
        comments_count: nextComments,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);
  };

  const handleLoadComments = async (postId: string) => {
    if (!isUuid(postId)) return;
    if (commentsByPost[postId]) return;

    const commentResult = await supabase
      .from("post_comments")
      .select("id, post_id, user_id, content, author_name, author_avatar_url, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(3);
    let data: PostComment[] | null = commentResult.data as PostComment[] | null;
    let error = commentResult.error;

    if (error && isPostCommentAuthorColumnError(error)) {
      const retryResult = await supabase
        .from("post_comments")
        .select("id, post_id, user_id, content, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(3);

      data = retryResult.data as PostComment[] | null;
      error = retryResult.error;
    }

    if (error) {
      showNotification("Comments unavailable", error.message, "warning");
      return;
    }

    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: (data || []) as PostComment[],
    }));
  };

  const handleCreateEventSubmit = async () => {
    if (!requireWalletConnected("create an event")) return;
    const missingFields: RequiredEventField[] = [];

    if (!eventForm.title.trim()) missingFields.push("title");
    if (!eventForm.date.trim()) missingFields.push("date");
    if (!eventForm.expirationDate.trim()) missingFields.push("expirationDate");
    if (!eventForm.startTime.trim()) missingFields.push("startTime");
    if (!eventForm.endTime.trim()) missingFields.push("endTime");
    if (!eventForm.capacity.trim()) missingFields.push("capacity");
    if (!eventForm.description.trim()) missingFields.push("description");
    if (!eventForm.stakeAmount.trim()) missingFields.push("stakeAmount");
    if (eventRoute.startPoint === null) missingFields.push("startPoint");
    if (eventRoute.destinationPoint === null) {
      missingFields.push("destinationPoint");
    }
    if (eventRoute.distanceKm === null) missingFields.push("distance");

    if (missingFields.length > 0) {
      setEventFieldErrors(missingFields);
      showNotification(
        "Missing event details",
        `Please complete: ${missingFields
          .map((field) => requiredEventFieldLabels[field])
          .join(", ")}.`,
        "warning"
      );
      return;
    }

    setEventFieldErrors([]);

    const startDateTime = parseEventDateTime(eventForm.date, eventForm.startTime);
    const expirationDateTime = parseEventDateTime(
      eventForm.expirationDate,
      eventForm.endTime
    );

    if (!startDateTime || !expirationDateTime) {
      showNotification(
        "Invalid schedule",
        "Choose valid start and expiration date/time values.",
        "warning"
      );
      return;
    }

    if (startDateTime <= new Date()) {
      showNotification(
        "Invalid start time",
        "Event start must be in the future.",
        "warning"
      );
      return;
    }

    if (expirationDateTime <= startDateTime) {
      showNotification(
        "Invalid expiration",
        "Event expiration must be after the start date and time.",
        "warning"
      );
      return;
    }

    if (!canHostEvent(eventForm.category)) {
      showNotification(
        "Authority required",
        `You need ${getRequiredAuthorityName(
          eventForm.category
        )} to create a ${eventForm.category.toLowerCase()} event.`,
        "warning"
      );
      return;
    }

    if (!hasValidStake) {
      showNotification(
        "Invalid stake",
        "Choose a valid TRIPIX stake amount for this event.",
        "warning"
      );
      return;
    }

    if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0) {
      showNotification(
        "Invalid capacity",
        "Choose a valid participant capacity.",
        "warning"
      );
      return;
    }

    if (tokenBalance < parsedStake) {
      showNotification(
        "Not enough TRIPIX",
        "You do not have enough TRIPIX for the required event stake.",
        "error"
      );
      return;
    }

    const routeDistanceKm = eventRoute.distanceKm;

    if (routeDistanceKm === null) {
      showNotification(
        "Route still calculating",
        "Please wait for the event distance to finish calculating.",
        "info"
      );
      return;
    }

    const creatorAuthorityName = getRequiredAuthorityName(eventForm.category);
    const settlement = settleEventReward(
      parsedStake,
      parsedCapacity,
      0,
      eventForm.category,
      eventForm.difficulty,
      routeDistanceKm
    );
    let eventImageUrl = "";

    if (eventImageFile) {
      const extension = eventImageFile.name.split(".").pop() || "jpg";
      const filePath = `events/${sessionUser.id}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, eventImageFile, {
          contentType: eventImageFile.type || "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        showNotification("Event image not saved", uploadError.message, "error");
        return;
      }

      const { data } = supabase.storage
        .from("event-images")
        .getPublicUrl(filePath);
      eventImageUrl = data.publicUrl;
    }

    const savedPost = await saveFeedPost({
      id: "pending-event",
      author: "You",
      avatar: authUser.displayName.slice(0, 2).toUpperCase(),
      avatarUrl: authUser.avatarUrl,
      destination: `${eventForm.category} Event`,
      caption:
        eventForm.category === "Hiking"
          ? "New hiking event posted. Distance affects the reward weighting, but payouts stay inside the applied stake pool."
          : "New authority-based event posted. 10% of the locked stake is burned and 90% is distributed to verified finishers.",
      achievement: "Event Posted",
      likes: 0,
      comments: 0,
      image: "Community event",
      postType: "event",
      eventTitle: eventForm.title,
      eventCategory: eventForm.category,
      eventDifficulty: eventForm.difficulty,
      joinCost: 10,
      joinedCount: 1,
      completedCount: 0,
      failedCount: 0,
      eventCapacity: parsedCapacity,
      initialPoint: eventRoute.startPoint ?? undefined,
      destinationPoint: eventRoute.destinationPoint ?? undefined,
      eventDate: eventForm.date,
      expirationDate: eventForm.expirationDate,
      startTime: eventForm.startTime,
      endTime: eventForm.endTime,
      eventDescription: eventForm.description,
      eventImage: eventImageUrl || undefined,
      creatorAuthorityName,
      requiredAuthorityName: creatorAuthorityName,
      stakeAmount: parsedStake,
      routeDistanceKm,
      distanceRewardBonus: settlement.distanceRewardBonus,
      rewardPool: settlement.rewardPool,
      remainingRewardPool: settlement.remainingRewardPool,
      burnAmount: settlement.burnAmount,
      rewardPerFinisher: settlement.rewardPerFinisher,
      participant: {
        joined: false,
        verifiedStart: false,
        completed: false,
        failed: false,
        rewardClaimed: false,
      },
    });

    if (!savedPost) return;

    const stakeTransferSignature = await transferTripixToTreasury(
      parsedStake,
      `Create Event: ${eventForm.title}`
    );

    if (!stakeTransferSignature) {
      await supabase.from("posts").delete().eq("id", savedPost.id);
      setFeedPosts((prev) => prev.filter((post) => post.id !== savedPost.id));
      showNotification(
        "Event not posted",
        "The event was removed because the TRIPIX stake was not locked.",
        "warning"
      );
      return;
    }

    await recordWalletTransaction({
      txType: "CREATE_EVENT",
      amount: parsedStake,
      direction: "debit",
      title: `Created Event: ${eventForm.title}`,
      description: `Locked event stake in the system wallet. Signature: ${shortenHash(
        stakeTransferSignature
      )}`,
      referenceId: savedPost.id,
    });

    const burnPayload = await burnEventStakeFromTreasury({
      amount: settlement.burnAmount,
      title: `Event Burn: ${eventForm.title}`,
      sourceReferenceId: savedPost.id,
    });

    if (!burnPayload) return;

    setEventForm({
      title: "",
      category: "Hiking",
      difficulty: "Moderate",
      date: "",
      expirationDate: "",
      startTime: "",
      endTime: "",
      capacity: "",
      description: "",
      stakeAmount: "",
    });

    setEventRoute({
      startPoint: null,
      destinationPoint: null,
      distanceKm: null,
    });

    setEventImagePreview("");
    setEventImageFile(null);
    setUtilityView("actions");
    setTab("feed");
  };

  const handleSelectTrail = (trailId: string) => {
    const trail = trails.find((item) => item.id === trailId);
    if (!trail) return;
    setSelectedTrailId(trail.id);
    const target =
      trail.destinations.find((item) => item.type === "Target") ||
      trail.destinations[0];
    setSelectedTargetId(target.id);
    setHikeSession({
      id: null,
      active: false,
      trailheadVerified: false,
      currentTrailheadMatched: false,
      targetReached: false,
      status: "Not Started",
      reachedDestinationIds: [],
      currentTrailId: null,
      selectedTargetId: null,
      totalEarned: 0,
      lastRewardBreakdown: null,
      multiDestinationBonusAwarded: false,
      nextTrailReady: false,
    });
  };

  const verifyTrailheadAtCurrentLocation = async (showSuccess = true) => {
    if (!selectedTrail) {
      showNotification(
        "No trail selected",
        "Add and select a trail before starting a hike.",
        "warning"
      );
      return null;
    }
    startLiveGpsTracking(false);
    const geofenceResult = await ensureWithinGeofence(
      selectedTrailheadPoint,
      "trailhead initial location"
    );
    if (!geofenceResult) return null;

    let hikeSessionId = hikeSession.id;
    const timestamp = new Date().toISOString();

    if (!hikeSessionId && isUuid(selectedTrail.id)) {
      const { data } = await supabase
        .from("hike_sessions")
        .insert({
          user_id: sessionUser.id,
          trail_id: selectedTrail.id,
          selected_target_id: isUuid(selectedTargetId) ? selectedTargetId : null,
          active: false,
          trailhead_verified: true,
          current_trailhead_matched: true,
          status: "Not Started",
        })
        .select("id")
        .single();
      hikeSessionId = data?.id || null;
    } else if (hikeSessionId) {
      void supabase
        .from("hike_sessions")
        .update({
          trailhead_verified: true,
          current_trailhead_matched: true,
          updated_at: timestamp,
        })
        .eq("id", hikeSessionId);
    }

    if (hikeSessionId && isUuid(selectedTrail.trailhead.id)) {
      void supabase.from("hike_trailhead_verifications").insert({
        hike_session_id: hikeSessionId,
        trailhead_id: selectedTrail.trailhead.id,
        verified: true,
        gps_lat: geofenceResult.fix.point.lat,
        gps_lng: geofenceResult.fix.point.lng,
      });
    }

    setHikeSession((prev) => ({
      ...prev,
      id: hikeSessionId,
      currentTrailheadMatched: true,
      trailheadVerified: true,
    }));

    if (showSuccess) {
      showNotification(
        "Trailhead verified",
        `You are inside the ${selectedTrail.trailhead.name} geofence.`,
        "success"
      );
    }

    return hikeSessionId || "verified";
  };

  const handleVerifyTrailhead = async () => {
    if (!requireWalletConnected("start a hiking session")) return;
    await verifyTrailheadAtCurrentLocation();
  };

  const handleStartHike = async () => {
    if (!requireWalletConnected("start a hiking session")) return;
    if (!selectedTrail) {
      showNotification(
        "No trail selected",
        "Add and select a trail before starting a hike.",
        "warning"
      );
      return;
    }
    let hikeSessionId = hikeSession.id;

    if (!hikeSession.currentTrailheadMatched) {
      const verifiedSessionId = await verifyTrailheadAtCurrentLocation(false);
      if (!verifiedSessionId) return;
      hikeSessionId =
        verifiedSessionId === "verified" ? hikeSessionId : verifiedSessionId;
    }

    if (isUuid(selectedTrail.id)) {
      if (hikeSessionId) {
        await supabase
          .from("hike_sessions")
          .update({
            active: true,
            trailhead_verified: true,
            current_trailhead_matched: true,
            status: "Active",
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", hikeSessionId);
      } else {
        const { data } = await supabase
          .from("hike_sessions")
          .insert({
            user_id: sessionUser.id,
            trail_id: selectedTrail.id,
            selected_target_id: isUuid(selectedTargetId) ? selectedTargetId : null,
            active: true,
            trailhead_verified: true,
            current_trailhead_matched: true,
            status: "Active",
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        hikeSessionId = data?.id || null;
      }
    }

    setHikeSession({
      id: hikeSessionId,
      active: true,
      trailheadVerified: true,
      currentTrailheadMatched: true,
      targetReached: false,
      status: "Active",
      reachedDestinationIds: [],
      currentTrailId: selectedTrail.id,
      selectedTargetId,
      totalEarned: 0,
      lastRewardBreakdown: null,
      multiDestinationBonusAwarded: false,
      nextTrailReady: false,
    });
  };

  const handleReachDestination = async (destinationId: string) => {
    if (!requireWalletConnected("claim hiking rewards")) return;
    if (!selectedTrail) return;
    if (!hikeSession.active) return;
    if (hikeSession.reachedDestinationIds.includes(destinationId)) return;
    if (!hikeProofPhotoFile) {
      showNotification(
        "Hike photo required",
        "Add a photo proof before marking this destination reached.",
        "warning"
      );
      return;
    }

    const destination = selectedTrail.destinations.find(
      (item) => item.id === destinationId
    );
    if (!destination) return;

    const updatedReached = [...hikeSession.reachedDestinationIds, destinationId];
    const isTarget = destinationId === hikeSession.selectedTargetId;
    const targetBonus = isTarget ? 10 : 0;
    const multiDestinationBonus =
      updatedReached.length >= 2 && !hikeSession.multiDestinationBonusAwarded
        ? 5
        : 0;
    const totalAdded = destination.reward + targetBonus + multiDestinationBonus;
    const destinationPoint =
      destination.lat !== null && destination.lng !== null
        ? {
            lat: destination.lat,
            lng: destination.lng,
            name: destination.name,
          }
        : null;

    const geofenceResult = await ensureWithinGeofence(
      destinationPoint,
      destination.name
    );
    if (!geofenceResult) return;

    const nextTrailGeofenceStatus =
      isTarget && nextTrailheadPoint
        ? getGeofenceStatus(
            geofenceResult.fix.point,
            nextTrailheadPoint,
            geofenceResult.fix.accuracy
          )
        : null;
    const canProceedToNextTrail = Boolean(
      isTarget && nextTrail && nextTrailGeofenceStatus?.inside
    );

    let sessionDestinationId: string | null = null;
    let hikePhotoUrl = "";

    try {
      hikePhotoUrl = await uploadProofPhoto(
        hikeProofPhotoFile,
        sessionUser.id,
        "hike"
      );
    } catch {
      showNotification(
        "Hike photo not saved",
        "The reward can continue, but the feed post will use a text fallback.",
        "warning"
      );
    }

    if (hikeSession.id && isUuid(destinationId)) {
      const { data } = await supabase
        .from("hike_session_destinations")
        .insert({
          hike_session_id: hikeSession.id,
          trail_destination_id: destinationId,
          base_reward: destination.reward,
          target_bonus: targetBonus,
          multi_destination_bonus: multiDestinationBonus,
          total_added: totalAdded,
        })
        .select("id")
        .single();
      sessionDestinationId = data?.id || null;

      void sendTreasuryReward({
        txType: "HIKE_REWARD",
        amount: totalAdded,
        title: `Hike reward: ${destination.name}`,
        description: `Reached ${destination.name} on ${selectedTrail.name}.`,
        destinationWallet: publicKey?.toBase58(),
        sourceReferenceId: data?.id || hikeSession.id,
      });

      void supabase
        .from("hike_sessions")
        .update({
          target_reached: hikeSession.targetReached || isTarget,
          status: isTarget ? "Target Reached" : hikeSession.status,
          total_earned: hikeSession.totalEarned + totalAdded,
          multi_destination_bonus_awarded:
            hikeSession.multiDestinationBonusAwarded || multiDestinationBonus > 0,
          next_trail_ready: canProceedToNextTrail,
          updated_at: new Date().toISOString(),
        })
        .eq("id", hikeSession.id);
    }

    setHikeSession((prev) => ({
      ...prev,
      reachedDestinationIds: updatedReached,
      totalEarned: prev.totalEarned + totalAdded,
      targetReached: prev.targetReached || isTarget,
      status: isTarget ? "Target Reached" : prev.status,
      multiDestinationBonusAwarded:
        prev.multiDestinationBonusAwarded || multiDestinationBonus > 0,
      nextTrailReady: canProceedToNextTrail,
      lastRewardBreakdown: {
        destination: destination.name,
        difficulty: destination.difficulty,
        baseReward: destination.reward,
        targetBonus,
        multiDestinationBonus,
        totalAdded,
      },
    }));

    const savedPost = await saveFeedPost({
      id: "pending-hike",
      author: "You",
      avatar: authUser.displayName.slice(0, 2).toUpperCase(),
      avatarUrl: authUser.avatarUrl,
      destination: destination.name,
      caption: `Reached ${destination.name} on ${selectedTrail.name}.`,
      achievement: isTarget ? "Target Completed" : "Checkpoint Reached",
      likes: 0,
      comments: 0,
      image: hikePhotoUrl || destination.name,
      postType: "standard",
    });
    if (hikePhotoUrl) {
      setHikeProofPhotoFile(null);
      setHikeProofPhotoName("");
    }
    if (savedPost && sessionDestinationId) {
      void supabase
        .from("hike_session_destinations")
        .update({ created_post_id: savedPost.id })
        .eq("id", sessionDestinationId);
    }
    void refreshAchievementProgress();

    if (isTarget && nextTrail && !canProceedToNextTrail) {
      showNotification(
        "Next trail locked",
        `${nextTrail.name} opens when your GPS is inside its initial geofence.`,
        "info"
      );
    }
  };

  const handleProceedNextTrail = () => {
    if (!requireWalletConnected("continue the hiking session")) return;
    if (!nextTrail || !hikeSession.nextTrailReady) return;

    const target =
      nextTrail.destinations.find((item) => item.type === "Target") ||
      nextTrail.destinations[0];

    setSelectedTrailId(nextTrail.id);
    setSelectedTargetId(target.id);

    setHikeSession({
      id: null,
      active: true,
      trailheadVerified: true,
      currentTrailheadMatched: true,
      targetReached: false,
      status: "Active",
      reachedDestinationIds: [],
      currentTrailId: nextTrail.id,
      selectedTargetId: target.id,
      totalEarned: 0,
      lastRewardBreakdown: null,
      multiDestinationBonusAwarded: false,
      nextTrailReady: false,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {notifications.length > 0 ? (
        <div className="fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
          {notifications.map((notification) => (
            <AppNotificationToast
              key={notification.id}
              notification={notification}
              onClose={() =>
                setNotifications((prev) =>
                  prev.filter((item) => item.id !== notification.id)
                )
              }
            />
          ))}
        </div>
      ) : null}
      {confirmationDialog ? (
        <ConfirmationModal
          dialog={confirmationDialog}
          onCancel={() => setConfirmationDialog(null)}
        />
      ) : null}
      {eventStartPreviewPost ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Verify Start Location
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-300">
                  Move your green GPS pin inside the start geofence before
                  starting this hike event.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEventStartPreviewPostId(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                aria-label="Close start verification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {eventStartPreviewPost.initialPoint ? (
              <div className="mt-4 space-y-4">
                <MapPreview
                  startLat={eventStartPreviewPost.initialPoint.lat}
                  startLng={eventStartPreviewPost.initialPoint.lng}
                  destLat={eventStartPreviewPost.initialPoint.lat}
                  destLng={eventStartPreviewPost.initialPoint.lng}
                  title={
                    eventStartPreviewPost.eventTitle ||
                    eventStartPreviewPost.destination
                  }
                  subtitle={formatPoint(eventStartPreviewPost.initialPoint)}
                  height={340}
                  geofenceLat={eventStartPreviewPost.initialPoint.lat}
                  geofenceLng={eventStartPreviewPost.initialPoint.lng}
                  geofenceRadiusMeters={
                    eventStartPreviewStatus?.effectiveRadiusMeters || 180
                  }
                  geofenceLabel="Event start geofence"
                  currentLat={currentGpsPoint?.lat}
                  currentLng={currentGpsPoint?.lng}
                />

                <div className="grid gap-3 sm:grid-cols-3">
                  <InfoTile
                    label="Your GPS"
                    value={
                      currentGpsPoint
                        ? `${currentGpsPoint.lat.toFixed(
                            5
                          )}, ${currentGpsPoint.lng.toFixed(5)}`
                        : "Waiting for GPS"
                    }
                  />
                  <InfoTile
                    label="Start Target"
                    value={`${eventStartPreviewPost.initialPoint.lat.toFixed(
                      5
                    )}, ${eventStartPreviewPost.initialPoint.lng.toFixed(5)}`}
                  />
                  <InfoTile
                    label="Geofence"
                    value={
                      eventStartPreviewStatus?.available
                        ? `${
                            eventStartPreviewStatus.inside
                              ? "Inside"
                              : "Outside"
                          } · ${formatMeters(
                            eventStartPreviewStatus.distanceMeters
                          )}`
                        : "Waiting for GPS"
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                This event does not have a start location saved.
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="rounded-2xl border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                onClick={() => setEventStartPreviewPostId(null)}
              >
                Cancel
              </Button>
              <Button
                className={`rounded-2xl font-medium ${
                  eventStartPreviewStatus?.inside
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : "bg-zinc-700 text-zinc-300"
                }`}
                disabled={!eventStartPreviewStatus?.inside}
                onClick={() =>
                  void handleVerifyEventStart(eventStartPreviewPost.id)
                }
              >
                <Flag className="mr-2 h-4 w-4" />
                {eventStartPreviewStatus?.inside
                  ? "Confirm Start"
                  : "Move Inside Geofence"}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-7xl gap-6 p-4 md:p-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
              <div className="mb-6 space-y-2">
                <div className="text-2xl font-bold tracking-tight text-white">
                  TravelQuest
                </div>
                <p className="text-sm leading-6 text-zinc-300">
                  Verified travel quests, community events, TRIPIX rewards, and
                  wallet-linked progress in one place.
                </p>
              </div>

              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.key;

                  return (
                    <Button
                      key={item.key}
                      variant="ghost"
                      className={`w-full justify-start rounded-2xl border transition-all ${
                        active
                          ? "border-sky-500/40 bg-sky-500/15 text-white shadow-sm hover:bg-sky-500/15"
                          : "border-transparent bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      }`}
                      onClick={() => setTab(item.key)}
                    >
                      <Icon
                        className={`mr-3 h-4 w-4 ${
                          active ? "text-sky-300" : "text-zinc-100"
                        }`}
                      />
                      {item.label}
                    </Button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <ProfileAvatar
                    name={authUser.displayName}
                    avatarUrl={authUser.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {authUser.displayName}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {authUser.location || "TravelQuest traveler"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Devnet TRIPIX
                  </span>
                  <Wallet className="h-4 w-4 text-zinc-100" />
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {tokenBalanceDisplay} TRIPIX
                </div>
                <p className="mt-1 break-all text-xs leading-5 text-zinc-400">
                  {authUser.publicKey}
                </p>
                <div className="mt-3">
                  <ConnectWalletButton />
                </div>
                <Button
                  className="mt-2 w-full rounded-2xl border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                  variant="outline"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="rounded-[24px] border border-zinc-800 bg-zinc-900 p-4 shadow-sm lg:hidden">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <ProfileAvatar
                    name={authUser.displayName}
                    avatarUrl={authUser.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {authUser.displayName}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Devnet TRIPIX
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {tokenBalanceDisplay} TRIPIX
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <ConnectWalletButton />
                  <Button
                    className="rounded-2xl border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                    variant="outline"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </Button>
                </div>
              </div>
            </div>

            <section className="overflow-hidden rounded-[30px] border border-zinc-800 bg-zinc-900 shadow-sm">
              <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 px-6 py-8 text-white md:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl space-y-3">
                    <Badge className="rounded-full border border-zinc-600 bg-zinc-800/80 px-3 py-1 text-white hover:bg-zinc-800/80">
                      Devnet Token Balance + Stake Pools
                    </Badge>
                    <div className="space-y-2">
                      <h1 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
                        Wallet required. Devnet TRIPIX powers every trip.
                      </h1>
                      <p className="max-w-2xl text-sm leading-7 text-zinc-200 md:text-base">
                        TravelQuest reads TRIPIX directly from your connected
                        Phantom wallet on devnet. Your activity stays in
                        TravelQuest, while Solana is the balance source.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:w-[420px]">
                    <CompactStatPill icon={Compass} label="Trips" value={12} />
                    <CompactStatPill icon={Trophy} label="Badges" value={7} />
                    <CompactStatPill
                      icon={Wallet}
                      label="TRIPIX"
                      value={tokenBalanceDisplay}
                    />
                    <CompactStatPill
                      icon={Flame}
                      label="Burned"
                      value={totalBurned}
                    />
                  </div>
                </div>
              </div>
            </section>

            {tab === "feed" && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
                <div className="space-y-5">
                  <ScreenTitle
                    title="Activity Feed"
                    subtitle="See each event's route, schedule, reward, and next action at a glance."
                  />

                  {feedPosts.length === 0 ? (
                    <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                      <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800">
                          <ImageIcon className="h-6 w-6 text-zinc-100" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-white">
                          Your feed is ready
                        </h3>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-300">
                          Completed check-ins, hike stops, and community events
                          will appear here.
                        </p>
                      </CardContent>
                    </Card>
                  ) : null}

                  {feedPosts.map((post) => (
                    <Card
                      key={post.id}
                      className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm"
                    >
                      <CardContent className="p-0">
                        <div className="flex items-center justify-between px-5 py-4">
                          <div className="flex items-center gap-3">
                            <ProfileAvatar
                              name={post.author}
                              avatarUrl={
                                post.author === "You"
                                  ? authUser.avatarUrl
                                  : post.avatarUrl
                              }
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {post.author}
                              </p>
                              <p className="truncate text-xs text-zinc-300">
                                {post.destination}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge className="rounded-full">
                              {post.achievement}
                            </Badge>
                            {post.userId === sessionUser.id ? (
                              <button
                                type="button"
                                onClick={() => void handleDeletePost(post.id)}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-200 transition hover:bg-rose-500/20"
                                aria-label="Delete post"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="relative mx-5 h-72 overflow-hidden rounded-[24px] border border-zinc-700 bg-gradient-to-br from-zinc-800 to-zinc-700">
                          {post.postType === "event" && post.eventImage ? (
                            <Image
                              src={post.eventImage}
                              alt={post.eventTitle || "Event image"}
                              fill
                              unoptimized
                              sizes="(min-width: 1280px) 50vw, 100vw"
                              className="h-full w-full object-cover"
                            />
                          ) : post.postType !== "event" &&
                            isPublicImageUrl(post.image) ? (
                            <Image
                              src={post.image}
                              alt={`${post.destination} proof photo`}
                              fill
                              unoptimized
                              sizes="(min-width: 1280px) 50vw, 100vw"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-end justify-between p-5">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-zinc-300">
                                  Travel story
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-white">
                                  {post.postType === "event" && post.eventTitle
                                    ? post.eventTitle
                                    : post.image}
                                </p>
                              </div>
                              <ImageIcon className="h-8 w-8 text-zinc-100" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 px-5 py-4">
                          <div className="flex items-center gap-4 text-zinc-100">
                            <button
                              className={`flex items-center gap-2 text-sm ${
                                post.likedByUser ? "text-rose-200" : ""
                              }`}
                              onClick={() => void handleLikePost(post.id)}
                            >
                              <Heart
                                className={`h-4 w-4 ${
                                  post.likedByUser
                                    ? "fill-rose-400 text-rose-300"
                                    : "text-zinc-100"
                                }`}
                              />{" "}
                              {post.likes}
                            </button>
                            <button
                              className="flex items-center gap-2 text-sm"
                              onClick={() => void handleLoadComments(post.id)}
                            >
                              <MessageCircle className="h-4 w-4 text-zinc-100" />{" "}
                              {post.comments}
                            </button>
                            <button className="flex items-center gap-2 text-sm">
                              <Share2 className="h-4 w-4 text-zinc-100" /> Share
                            </button>
                          </div>

                          <p className="text-sm leading-7 text-zinc-100">
                            <span className="font-semibold">{post.author}</span>{" "}
                            {post.caption}
                          </p>

                          <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
                            {(commentsByPost[post.id] || []).map((comment) => (
                              <div
                                key={comment.id}
                                className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2"
                              >
                                <p className="text-xs font-semibold text-zinc-200">
                                  {comment.author_name || "Traveler"}
                                </p>
                                <p className="mt-1 break-words text-sm leading-6 text-zinc-100">
                                  {comment.content}
                                </p>
                              </div>
                            ))}

                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Input
                                value={commentDrafts[post.id] || ""}
                                onFocus={() => void handleLoadComments(post.id)}
                                onChange={(event) =>
                                  setCommentDrafts((prev) => ({
                                    ...prev,
                                    [post.id]: event.target.value,
                                  }))
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault();
                                    void handleCommentSubmit(post.id);
                                  }
                                }}
                                placeholder="Write a comment"
                                className="min-w-0 rounded-2xl text-white"
                              />
                              <Button
                                className="rounded-2xl bg-zinc-100 text-zinc-950 hover:bg-white"
                                disabled={!commentDrafts[post.id]?.trim()}
                                onClick={() => void handleCommentSubmit(post.id)}
                              >
                                Comment
                              </Button>
                            </div>
                          </div>

                          {post.postType === "event" ? (
                            <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                              <div className="space-y-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="break-words text-lg font-semibold text-white">
                                      {post.eventTitle}
                                    </p>
                                    {post.eventDescription ? (
                                      <p className="mt-1 text-sm leading-6 text-zinc-300">
                                        {post.eventDescription}
                                      </p>
                                    ) : null}
                                  </div>
                                  <span
                                    className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                                      isEventExpired(post)
                                        ? "border border-rose-500/30 bg-rose-500/10 text-rose-200"
                                        : !hasEventStarted(post)
                                        ? "border border-amber-500/30 bg-amber-500/10 text-amber-200"
                                        : post.participant?.completed
                                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                        : "border border-sky-500/30 bg-sky-500/10 text-sky-200"
                                    }`}
                                  >
                                    {isEventExpired(post)
                                      ? "Expired"
                                      : !hasEventStarted(post)
                                      ? "Scheduled"
                                      : post.participant?.completed
                                      ? "Completed"
                                      : post.participant?.joined
                                      ? "Joined"
                                      : "Open"}
                                  </span>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                  <InfoTile
                                    label="Reward Left"
                                    value={`${post.remainingRewardPool ?? post.rewardPool} TRIPIX`}
                                  />
                                  <InfoTile
                                    label="Per Finish"
                                    value={`${post.rewardPerFinisher || 0} TRIPIX`}
                                  />
                                  <InfoTile
                                    label="Distance"
                                    value={formatDistance(post.routeDistanceKm)}
                                  />
                                  <InfoTile
                                    label="People"
                                    value={`${post.joinedCount || 0}/${post.eventCapacity || 0}`}
                                  />
                                </div>

                                <div className="grid gap-3 text-sm text-zinc-300 md:grid-cols-2">
                                  <div>
                                    <p className="font-semibold text-white">Route</p>
                                    <p className="mt-1 leading-6">
                                      {formatPoint(post.initialPoint)} to{" "}
                                      {formatPoint(post.destinationPoint)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white">Schedule</p>
                                    <p className="mt-1 leading-6">
                                      Starts {post.eventDate} at {post.startTime}
                                      <br />
                                      Expires {post.expirationDate || post.eventDate} at{" "}
                                      {post.endTime}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white">Stake</p>
                                    <p className="mt-1 leading-6">
                                      {post.stakeAmount} locked · {post.burnAmount} burned
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white">Access</p>
                                    <p className="mt-1 leading-6">
                                      {post.requiredAuthorityName}
                                      {post.eventDifficulty ? ` · ${post.eventDifficulty}` : ""}
                                      {post.eventCategory === "Hiking"
                                        ? ` · ${post.distanceRewardBonus || 0} TRIPIX distance portion`
                                        : ""}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {!post.participant?.joined ? (
                                <Button
                                  className="mt-4 w-full rounded-2xl bg-sky-600 text-white hover:bg-sky-500"
                                  disabled={isEventExpired(post)}
                                  onClick={() =>
                                    handleJoinEvent(post.id, post.joinCost || 10)
                                  }
                                >
                                  {isEventExpired(post)
                                    ? "Event Expired"
                                    : `Join Event - Burn ${post.joinCost || 10} TRIPIX`}
                                </Button>
                              ) : (
                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                  <Button
                                    className={`rounded-2xl border font-medium ${getActionStateClass(
                                      post.participant.verifiedStart ? "done" : "active"
                                    )}`}
                                    variant="outline"
                                    disabled={
                                      post.participant.verifiedStart ||
                                      post.participant.completed ||
                                      !hasEventStarted(post) ||
                                      isEventExpired(post)
                                    }
                                    onClick={() =>
                                      void handleOpenEventStartPreview(post.id)
                                    }
                                  >
                                    <Flag
                                      className={`mr-2 h-4 w-4 ${getActionIconClass(
                                        post.participant.verifiedStart ? "done" : "active"
                                      )}`}
                                    />
                                    {post.participant.verifiedStart
                                      ? "Start Verified"
                                      : !hasEventStarted(post)
                                      ? "Starts Later"
                                      : "Verify Start"}
                                  </Button>

                                  <Button
                                    className={`rounded-2xl font-medium ${
                                      post.participant.completed
                                        ? "bg-emerald-600 text-white"
                                        : "bg-emerald-600 text-white hover:bg-emerald-500"
                                    }`}
                                    disabled={
                                      !post.participant.verifiedStart ||
                                      post.participant.completed ||
                                      !hasEventStarted(post) ||
                                      isEventExpired(post)
                                    }
                                    onClick={() => handleCompleteEvent(post.id)}
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {post.participant.completed
                                      ? "Completed"
                                      : "Complete Event"}
                                  </Button>

                                  <Button
                                    className="rounded-2xl bg-rose-600 text-white hover:bg-rose-500"
                                    disabled={
                                      post.participant.completed ||
                                      post.participant.failed ||
                                      !hasEventStarted(post) ||
                                      isEventExpired(post)
                                    }
                                    onClick={() => handleFailEvent(post.id)}
                                  >
                                    Fail Task
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="space-y-5">
                  <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">
                        Current Joined Events
                      </CardTitle>
                      <CardDescription className="text-sm leading-6 text-zinc-300">
                        Events you joined and your current progress state.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {joinedActivities.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm text-zinc-300">
                          You have not joined an event yet.
                        </div>
                      ) : (
                        joinedActivities.map((activity) => {
                          const status = getJoinedEventStatus(
                            activity,
                            hasEventStarted(activity),
                            isEventExpired(activity)
                          );

                          return (
                            <div
                              key={activity.id}
                              className={`relative overflow-hidden rounded-2xl border p-4 ${status.cardClass}`}
                            >
                              <div
                                aria-hidden="true"
                                className={`absolute inset-y-0 left-0 w-1.5 ${status.railClass}`}
                              />
                              <div className="pl-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <p className="text-sm font-semibold text-white">
                                    {activity.eventTitle}
                                  </p>
                                  <span
                                    className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.badgeClass}`}
                                  >
                                    {status.label}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs font-medium text-zinc-200">
                                  {status.helper}
                                </p>
                                <p className="mt-2 text-sm text-zinc-300">
                                  Starts {activity.eventDate} · {activity.startTime}
                                </p>
                                <p className="mt-1 text-sm text-zinc-300">
                                  Expires {activity.expirationDate || activity.eventDate} ·{" "}
                                  {activity.endTime}
                                </p>
                                <p className="mt-1 text-xs leading-6 text-zinc-300">
                                  {formatPoint(activity.initialPoint)} →{" "}
                                  {formatPoint(activity.destinationPoint)}
                                </p>
                                <p className="mt-1 text-xs text-zinc-300">
                                  Distance: {formatDistance(activity.routeDistanceKm)}
                                </p>
                                <p className="mt-1 text-xs text-zinc-300">
                                  Start:{" "}
                                  {activity.participant?.verifiedStart
                                    ? "Verified"
                                    : "Pending"}{" "}
                                  · Completion:{" "}
                                  {activity.participant?.completed ? "Done" : "Pending"}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">
                        Quick Check-In
                      </CardTitle>
                      <CardDescription className="text-sm leading-6 text-zinc-300">
                        Verify a selected destination without leaving the feed.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                        <p className="text-sm font-semibold text-white">
                          {selectedDestination?.name || "No destination selected"}
                        </p>
                        <p className="mt-1 text-sm text-zinc-200">
                          {selectedDestination?.location ||
                            "Choose a destination from Discover to start a check-in."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          className={`rounded-2xl border font-medium ${getActionStateClass(
                            checkInState.gps ? "done" : "active"
                          )}`}
                          variant="outline"
                          onClick={handleVerifyGps}
                          disabled={!selectedDestination}
                        >
                          <MapPin
                            className={`mr-2 h-4 w-4 ${getActionIconClass(
                              checkInState.gps ? "done" : "active"
                            )}`}
                          />
                          {checkInState.gps ? "GPS Verified" : "GPS"}
                        </Button>

                        <Button
                          className={`rounded-2xl border font-medium ${getActionStateClass(
                            checkInState.photo ? "done" : "active"
                          )}`}
                          asChild
                          variant="outline"
                        >
                          <label>
                            <Camera
                              className={`mr-2 h-4 w-4 ${getActionIconClass(
                                checkInState.photo ? "done" : "active"
                              )}`}
                            />
                            {checkInState.photo ? "Photo Hashed" : "Photo"}
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="sr-only"
                              onChange={handlePhotoProofChange}
                            />
                          </label>
                        </Button>
                      </div>

                      <Button
                        className={`w-full rounded-2xl font-medium ${
                          checkInState.gps && checkInState.photo
                            ? "bg-emerald-600 text-white hover:bg-emerald-500"
                            : "bg-zinc-800 text-zinc-300"
                        }`}
                        onClick={handleSimpleCheckIn}
                        disabled={
                          !selectedDestination ||
                          !checkInState.gps ||
                          !checkInState.photo
                        }
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {checkInState.gps && checkInState.photo
                          ? "Complete Check-In"
                          : "Complete Steps First"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {tab === "discover" && (
              <div className="space-y-5">
                <ScreenTitle
                  title="Discover"
                  subtitle="Browse verified places, compare difficulty, and choose where to earn TRIPIX next."
                />

                <Card
                  className={`rounded-[28px] border shadow-sm ${
                    currentLocationClaimed
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-sky-500/30 bg-sky-500/10"
                  }`}
                >
                  <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <MapPin
                          className={`h-5 w-5 ${
                            currentLocationClaimed
                              ? "text-emerald-200"
                              : "text-sky-200"
                          }`}
                        />
                        <p className="text-base font-semibold text-white">
                          Discover your current location
                        </p>
                      </div>
                      <p
                        className={`mt-2 text-sm leading-6 ${
                          currentLocationClaimed
                            ? "text-emerald-100"
                            : "text-sky-100"
                        }`}
                      >
                        {currentLocationClaimed
                          ? `Current-location discovery reward received. Your one-time +${currentLocationReward} TRIPIX claim is complete.`
                          : `Capture your live GPS point, then verify with GPS and camera proof for +${currentLocationReward} TRIPIX.`}
                      </p>
                    </div>
                    <Button
                      className={`shrink-0 rounded-2xl text-white ${
                        currentLocationClaimed
                          ? "bg-emerald-600 hover:bg-emerald-600"
                          : "bg-sky-600 hover:bg-sky-500"
                      }`}
                      disabled={
                        currentLocationClaimed ||
                        currentLocationSaving ||
                        currentLocationClaimLoading
                      }
                      onClick={() => void handleDiscoverCurrentLocation()}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {currentLocationClaimed
                        ? "Reward Received"
                        : currentLocationSaving
                          ? "Capturing GPS"
                          : currentLocationClaimLoading
                            ? "Checking Claim"
                            : "Use Current Location"}
                    </Button>
                  </CardContent>
                </Card>

                <div className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-4 shadow-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-100" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search falls, beaches, islands, hiking areas"
                      className="rounded-2xl pl-9 text-white"
                    />
                  </div>
                </div>

                {filteredDestinations.length === 0 ? (
                  <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                    <CardContent className="p-6 text-sm leading-6 text-zinc-300">
                      No destinations match this search.
                    </CardContent>
                  </Card>
                ) : null}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredDestinations.map((destination) => (
                    <button
                      key={destination.id}
                      onClick={() => {
                        setSelectedDestination(destination);
                        setTab("checkin");
                      }}
                      className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-900 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="relative h-44 overflow-hidden">
                        <Image
                          src={destination.imageUrl}
                          alt={destination.name}
                          fill
                          unoptimized
                          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-lg font-semibold leading-tight text-white">
                              {destination.name}
                            </p>
                            <p className="mt-2 text-sm text-zinc-200">
                              {destination.location}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${getDifficultyClass(
                              destination.difficulty
                            )}`}
                          >
                            {destination.difficulty}
                          </span>
                        </div>

                        <p className="text-sm leading-7 text-zinc-300">
                          {destination.description}
                        </p>

                        <div className="flex items-center justify-between text-sm text-zinc-100">
                          <span>Reward +{destination.points} TRIPIX</span>
                          <span>
                            {destination.requiresQR ? "QR Required" : "QR Optional"}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === "checkin" && !selectedDestination && (
              <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                <CardContent className="p-6 text-sm leading-6 text-zinc-300">
                  No destination is selected. Choose a place from Discover
                  before checking in.
                </CardContent>
              </Card>
            )}

            {tab === "checkin" && selectedDestination && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                  <CardContent className="p-0">
                    <div className="relative h-72 overflow-hidden">
                      <Image
                        src={selectedDestination.imageUrl}
                        alt={selectedDestination.name}
                        fill
                        unoptimized
                        sizes="(min-width: 1280px) 55vw, 100vw"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="space-y-4 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Badge className="rounded-full" variant="secondary">
                            {selectedDestination.category}
                          </Badge>
                          <h3 className="mt-4 text-3xl font-semibold text-white">
                            {selectedDestination.name}
                          </h3>
                          <p className="mt-2 text-sm text-zinc-200">
                            {selectedDestination.location}
                          </p>
                        </div>
                        <MapPin className="h-10 w-10 text-zinc-100" />
                      </div>

                      <div>
                        <h4 className="text-base font-semibold text-white">
                          Destination Map
                        </h4>
                        <p className="mt-1 text-sm leading-6 text-zinc-300">
                          View the destination location before starting check-in.
                        </p>
                      </div>

                      <MapPreview
                        startLat={selectedDestination.startLat}
                        startLng={selectedDestination.startLng}
                        destLat={selectedDestination.destLat}
                        destLng={selectedDestination.destLng}
                        title={selectedDestination.name}
                        subtitle={selectedDestination.location}
                        geofenceLat={selectedDestination.startLat}
                        geofenceLng={selectedDestination.startLng}
                        geofenceRadiusMeters={
                          startGeofenceStatus.effectiveRadiusMeters
                        }
                        geofenceLabel="Initial location geofence"
                        destinationGeofenceLat={selectedDestination.destLat}
                        destinationGeofenceLng={selectedDestination.destLng}
                        destinationGeofenceRadiusMeters={
                          targetGeofenceStatus.effectiveRadiusMeters
                        }
                        destinationGeofenceLabel="Destination geofence"
                        currentLat={currentGpsPoint?.lat}
                        currentLng={currentGpsPoint?.lng}
                      />

                      <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm leading-6 text-zinc-200">
                        Blue marks the initial-location geofence. Green marks
                        the destination geofence. GPS proof must land inside the
                        destination circle for check-in.
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-white">
                      Check-In
                    </CardTitle>
                    <CardDescription className="text-sm leading-6 text-zinc-300">
                      Keep the flow short, visible, and easy to finish.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      <Button
                        className={`justify-start rounded-2xl border font-medium ${getActionStateClass(
                          checkInState.gps ? "done" : "active"
                        )}`}
                        variant="outline"
                        onClick={() => void handleVerifyGps()}
                      >
                        <MapPin
                          className={`mr-2 h-4 w-4 ${getActionIconClass(
                            checkInState.gps ? "done" : "active"
                          )}`}
                        />
                        {checkInState.gps ? "GPS Verified" : "Verify GPS"}
                      </Button>

                      <Button
                        className={`justify-start rounded-2xl border font-medium ${getActionStateClass(
                          checkInState.photo ? "done" : "active"
                        )}`}
                        asChild
                        variant="outline"
                      >
                        <label>
                          <Camera
                            className={`mr-2 h-4 w-4 ${getActionIconClass(
                              checkInState.photo ? "done" : "active"
                            )}`}
                          />
                          {checkInState.photo
                            ? "Photo Hash Captured"
                            : "Capture Live Photo"}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            onChange={handlePhotoProofChange}
                          />
                        </label>
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button
                        className={`justify-start rounded-2xl border font-medium ${
                          gpsTracking
                            ? getActionStateClass("done")
                            : getActionStateClass("active")
                        }`}
                        variant="outline"
                        onClick={() => startLiveGpsTracking()}
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        {gpsTracking ? "Live GPS Tracking" : "Start Live GPS"}
                      </Button>
                      <Button
                        className="justify-start rounded-2xl border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                        variant="outline"
                        disabled={!gpsTracking}
                        onClick={stopLiveGpsTracking}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Stop GPS
                      </Button>
                    </div>

                    <div
                      className={`rounded-2xl border p-4 text-sm leading-6 ${
                        checkInState.gps && checkInState.photo
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                          : "border-sky-500/30 bg-sky-500/10 text-sky-100"
                      }`}
                    >
                      {checkInState.gps && checkInState.photo
                        ? "Metadata captured. Complete validation to create the SHA-256 proof and Solana devnet anchor."
                        : "Complete the blue steps first. GPS and live photo are the primary proof. QR stays optional for supported destinations."}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoTile
                        label="Current Location"
                        value={
                          currentGpsPoint
                            ? `${currentGpsPoint.lat.toFixed(
                                5
                              )}, ${currentGpsPoint.lng.toFixed(5)}`
                            : "Waiting for live GPS"
                        }
                      />
                      <InfoTile
                        label="GPS Accuracy"
                        value={
                          liveGps?.accuracy
                            ? `±${formatMeters(liveGps.accuracy)}`
                            : "Waiting for GPS"
                        }
                      />
                      <InfoTile
                        label="Initial Geofence"
                        value={
                          startGeofenceStatus.available
                            ? `${
                                startGeofenceStatus.inside
                                  ? "Inside"
                                  : "Outside"
                              } · ${formatMeters(
                                startGeofenceStatus.distanceMeters
                              )}`
                            : "Waiting for GPS"
                        }
                      />
                      <InfoTile
                        label="Target Geofence"
                        value={
                          targetGeofenceStatus.available
                            ? `${
                                targetGeofenceStatus.inside
                                  ? "Inside"
                                  : "Outside"
                              } · ${formatMeters(
                                targetGeofenceStatus.distanceMeters
                              )}`
                            : "Waiting for GPS"
                        }
                      />
                      <InfoTile
                        label="GPS Metadata"
                        value={
                          checkInState.gpsPoint
                            ? `${checkInState.gpsPoint.lat.toFixed(
                                5
                              )}, ${checkInState.gpsPoint.lng.toFixed(5)}`
                            : "Waiting for GPS"
                        }
                      />
                      <InfoTile
                        label="Photo SHA-256"
                        value={
                          checkInState.photoHash
                            ? shortenHash(checkInState.photoHash)
                            : "Waiting for photo"
                        }
                      />
                      <InfoTile
                        label="Proof Hash"
                        value={
                          checkInState.metadataHash
                            ? shortenHash(checkInState.metadataHash)
                            : "Not anchored"
                        }
                      />
                      <InfoTile
                        label="Solana"
                        value={
                          checkInState.solanaSignature
                            ? `Devnet ${shortenHash(
                                checkInState.solanaSignature
                              )}`
                            : "Pending validation"
                        }
                      />
                    </div>

                    <Button
                      className={`w-full rounded-2xl font-medium ${
                        checkInState.gps && checkInState.photo
                          ? "bg-emerald-600 text-white hover:bg-emerald-500"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                      onClick={handleSimpleCheckIn}
                      disabled={!checkInState.gps || !checkInState.photo}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {checkInState.gps && checkInState.photo
                        ? "Verify Visit and Reward TRIPIX"
                        : "Complete Verification Steps First"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "hiking" && (
              <div className="space-y-6">
                <ScreenTitle
                  title="Hiking Session"
                  subtitle="Pick a trail, verify the trailhead, and track rewards as you reach each stop."
                />

                {!selectedTrail || !selectedTarget ? (
                  <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                    <CardContent className="p-6 text-sm leading-6 text-zinc-300">
                      No trail is ready yet. Add trails, trailheads, and
                      destinations before starting a hiking session.
                    </CardContent>
                  </Card>
                ) : (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                  <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">
                        Trail Setup
                      </CardTitle>
                      <CardDescription className="text-sm leading-6 text-zinc-300">
                        Choose trail and target before the hike starts.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {trails.map((trail) => (
                        <button
                          key={trail.id}
                          onClick={() => handleSelectTrail(trail.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            selectedTrailId === trail.id
                              ? "border-sky-500/40 bg-sky-500/15"
                              : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words text-base font-semibold leading-tight text-white">
                                {trail.name}
                              </p>
                              <p className="mt-1 text-sm text-zinc-200">
                                {trail.area}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1 text-xs font-medium text-white">
                              {trail.destinations.length} stops
                            </span>
                          </div>
                          <p className="mt-2 break-words text-sm text-zinc-200">
                            Trailhead: {trail.trailhead.name}
                          </p>
                        </button>
                      ))}

                      <div className="space-y-3">
                        <p className="text-sm font-medium text-zinc-100">
                          Select target destination
                        </p>
                        <div className="grid gap-3 md:grid-cols-2">
                          {selectedTrail.destinations.map((destination) => (
                            <button
                              key={destination.id}
                              onClick={() => setSelectedTargetId(destination.id)}
                              className={`rounded-2xl border p-4 text-left transition ${
                                selectedTargetId === destination.id
                                  ? "border-sky-500/40 bg-sky-500/15"
                                  : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 break-words text-base font-semibold leading-tight text-white">
                                  {destination.name}
                                </p>
                                <span
                                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${getDifficultyClass(
                                    destination.difficulty
                                  )}`}
                                >
                                  {destination.difficulty}
                                </span>
                              </div>

                              <p className="mt-2 break-words text-sm text-zinc-100">
                                {destination.type} · Base +{destination.reward} TRIPIX
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">
                              Initial location geofence
                            </p>
                            <p className="mt-1 text-sm leading-6 text-zinc-200">
                              Go to {selectedTrail.trailhead.name} and verify
                              your live GPS inside the marked circle.
                            </p>
                          </div>
                          <MapPin className="h-5 w-5 shrink-0 text-sky-200" />
                        </div>

                        {selectedTrailheadPoint ? (
                          <>
                            <MapPreview
                              startLat={selectedTrailheadPoint.lat}
                              startLng={selectedTrailheadPoint.lng}
                              destLat={selectedTrailheadPoint.lat}
                              destLng={selectedTrailheadPoint.lng}
                              title={selectedTrail.trailhead.name}
                              subtitle={selectedTrail.trailhead.location}
                              height={260}
                              geofenceLat={selectedTrailheadPoint.lat}
                              geofenceLng={selectedTrailheadPoint.lng}
                              geofenceRadiusMeters={
                                trailheadGeofenceStatus.effectiveRadiusMeters
                              }
                              geofenceLabel="Trailhead geofence"
                              currentLat={currentGpsPoint?.lat}
                              currentLng={currentGpsPoint?.lng}
                            />

                            <div className="grid gap-3 sm:grid-cols-2">
                              <InfoTile
                                label="Your GPS"
                                value={
                                  currentGpsPoint
                                    ? `${currentGpsPoint.lat.toFixed(
                                        5
                                      )}, ${currentGpsPoint.lng.toFixed(5)}`
                                    : "Tap Verify Trailhead"
                                }
                              />
                              <InfoTile
                                label="Trailhead"
                                value={`${selectedTrailheadPoint.lat.toFixed(
                                  5
                                )}, ${selectedTrailheadPoint.lng.toFixed(5)}`}
                              />
                              <InfoTile
                                label="Geofence"
                                value={
                                  trailheadGeofenceStatus.available
                                    ? `${
                                        trailheadGeofenceStatus.inside
                                          ? "Inside"
                                          : "Outside"
                                      } · ${formatMeters(
                                        trailheadGeofenceStatus.distanceMeters
                                      )}`
                                    : "Waiting for GPS"
                                }
                              />
                            </div>
                          </>
                        ) : (
                          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                            This trailhead needs latitude and longitude before
                            GPS geofencing can verify the initial location.
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Button
                          className={`rounded-2xl border font-medium ${
                            hikeSession.currentTrailheadMatched
                              ? getActionStateClass("done")
                              : getActionStateClass("active")
                          }`}
                          variant="outline"
                          onClick={handleVerifyTrailhead}
                          disabled={!selectedTrailheadPoint}
                        >
                          <Flag
                            className={`mr-2 h-4 w-4 shrink-0 ${
                              hikeSession.currentTrailheadMatched
                                ? getActionIconClass("done")
                                : getActionIconClass("active")
                            }`}
                          />
                          <span className="whitespace-normal break-words text-center leading-tight">
                            {hikeSession.currentTrailheadMatched
                              ? "Trailhead Verified"
                              : "Verify Trailhead"}
                          </span>
                        </Button>

                        <Button
                          className={`rounded-2xl font-medium ${
                            trailheadReadyToStart
                              ? "bg-emerald-600 text-white hover:bg-emerald-500"
                              : "bg-zinc-800 text-zinc-300"
                          }`}
                          onClick={handleStartHike}
                          disabled={!trailheadReadyToStart}
                        >
                          <PlayCircle className="mr-2 h-4 w-4 shrink-0" />
                          <span className="whitespace-normal break-words text-center leading-tight">
                            {trailheadReadyToStart
                              ? "Start Hike"
                              : trailheadGeofenceStatus.available
                                ? "Go Inside Geofence"
                                : "Verify Trailhead First"}
                          </span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">
                        Live Hike Progress
                      </CardTitle>
                      <CardDescription className="text-sm leading-6 text-zinc-300">
                        Track each stop, reward, and session state as the hike
                        progresses.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
                        <CompactStatPill
                          icon={Flag}
                          label="Trailhead"
                          value={selectedTrail.trailhead.name.replace(
                            " Trailhead",
                            ""
                          )}
                        />
                        <CompactStatPill
                          icon={Trophy}
                          label="Target"
                          value={selectedTarget.name}
                        />
                        <CompactStatPill
                          icon={Wallet}
                          label="Earned"
                          value={`${hikeSession.totalEarned} TRIPIX`}
                        />
                        <CompactStatPill
                          icon={Route}
                          label="Status"
                          value={hikeSession.status}
                        />
                      </div>

                      <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">
                              Hike proof photo
                            </p>
                            <p className="mt-1 truncate text-sm text-zinc-300">
                              {hikeProofPhotoName ||
                                "Add a fresh photo before marking the next stop reached."}
                            </p>
                          </div>
                          <Button
                            className={`shrink-0 rounded-2xl border font-medium ${getActionStateClass(
                              hikeProofPhotoFile ? "done" : "active"
                            )}`}
                            asChild
                            variant="outline"
                          >
                            <label>
                              <Camera
                                className={`mr-2 h-4 w-4 ${getActionIconClass(
                                  hikeProofPhotoFile ? "done" : "active"
                                )}`}
                              />
                              {hikeProofPhotoFile ? "Photo Ready" : "Add Photo"}
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="sr-only"
                                onChange={(event) => {
                                  handleHikePhotoProofChange(event);
                                  event.target.value = "";
                                }}
                              />
                            </label>
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {selectedTrail.destinations.map((destination) => {
                          const reached = hikeSession.reachedDestinationIds.includes(
                            destination.id
                          );
                          const isTarget =
                            destination.id === hikeSession.selectedTargetId;

                          return (
                            <div
                              key={destination.id}
                              className="min-w-0 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="break-words text-base font-semibold leading-tight text-white">
                                    {destination.name}
                                  </p>
                                  <p className="mt-1 text-sm text-zinc-200">
                                    {destination.type}
                                  </p>
                                </div>

                                <span
                                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${getDifficultyClass(
                                    destination.difficulty
                                  )}`}
                                >
                                  {destination.difficulty}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full border border-zinc-600 bg-zinc-700 px-3 py-1 text-xs font-medium text-zinc-100">
                                  Base +{destination.reward}
                                </span>

                                {isTarget ? (
                                  <span className="rounded-full border border-sky-400/40 bg-sky-500/20 px-3 py-1 text-xs font-medium text-sky-200">
                                    Target +10
                                  </span>
                                ) : null}
                              </div>

                              <Button
                                className={`mt-4 w-full rounded-2xl font-medium ${
                                  reached
                                    ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/20"
                                    : "bg-sky-600 text-white hover:bg-sky-500"
                                }`}
                                variant={reached ? "outline" : "default"}
                                disabled={
                                  !hikeSession.active ||
                                  reached ||
                                  !hikeProofPhotoFile
                                }
                                onClick={() =>
                                  handleReachDestination(destination.id)
                                }
                              >
                                <span className="break-words whitespace-normal text-center leading-tight">
                                  {reached
                                    ? "Reached"
                                    : !hikeProofPhotoFile
                                      ? "Add Photo First"
                                    : `Mark ${destination.name} Reached`}
                                </span>
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      {hikeSession.lastRewardBreakdown ? (
                        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-800 p-4">
                          <p className="text-sm font-semibold text-white">
                            Latest reward breakdown
                          </p>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                            <div className="rounded-xl border border-zinc-600 bg-zinc-700 p-3 text-white">
                              Base +{hikeSession.lastRewardBreakdown.baseReward}
                            </div>
                            <div className="rounded-xl border border-zinc-600 bg-zinc-700 p-3 text-white">
                              Target +{hikeSession.lastRewardBreakdown.targetBonus}
                            </div>
                            <div className="rounded-xl border border-zinc-600 bg-zinc-700 p-3 text-white">
                              Multi +
                              {
                                hikeSession.lastRewardBreakdown
                                  .multiDestinationBonus
                              }
                            </div>
                            <div className="rounded-xl border border-zinc-600 bg-zinc-700 p-3 text-white">
                              Total +{hikeSession.lastRewardBreakdown.totalAdded}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {hikeSession.nextTrailReady && nextTrail ? (
                        <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                          <p className="text-sm font-semibold text-white">
                            Next trail available
                          </p>
                          <p className="mt-1 text-sm leading-6 text-zinc-200">
                            {nextTrail.name} can start because this reached
                            destination is inside its initial geofence.
                          </p>
                          <Button
                            className="mt-4 rounded-2xl"
                            onClick={handleProceedNextTrail}
                          >
                            <ArrowRight className="mr-2 h-4 w-4" /> Proceed to
                            Next Trail
                          </Button>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
                )}
              </div>
            )}

            {tab === "wallet" && (
              <div className="space-y-6">
                <ScreenTitle
                  title="Balance and Withdrawal"
                  subtitle="Use devnet TRIPIX from your connected wallet and review your TravelQuest activity."
                />

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">
                        Devnet TRIPIX Balance
                      </CardTitle>
                      <CardDescription className="text-sm leading-6 text-zinc-300">
                        The spendable balance is read from your Phantom token
                        account on Solana devnet. TravelQuest keeps an in-app
                        activity record separately.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <StatPill
                          icon={Wallet}
                          label="In-app Balance"
                          value={
                            onChainTripixLoading
                              ? "Loading"
                              : `${tokenBalanceDisplay} TRIPIX`
                          }
                        />
                        <StatPill
                          icon={Zap}
                          label="Wallet Balance"
                          value={
                            onChainTripixLoading
                              ? "Loading"
                              : `${onChainTripixBalance} TRIPIX`
                          }
                        />
                      </div>

                      <div
                        className={`rounded-2xl border p-4 text-sm leading-6 ${
                          connected
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                        }`}
                      >
                        {connected
                          ? "Phantom connected. Your public key is saved to your profile for wallet-linked rewards."
                          : "Connect Phantom to save your wallet address to your TravelQuest profile."}
                      </div>

                      <ConnectWalletButton />

                      <div className="grid gap-3">
                        <InfoTile
                          label="Connected Wallet"
                          value={
                            publicKey ? publicKey.toBase58() : "Not connected"
                          }
                        />
                        <InfoTile label="Network" value={solanaNetwork} />
                        <InfoTile
                          label="TRIPIX Mint"
                          value={tripixMint || "Not set"}
                        />
                        <InfoTile
                          label="In-app Balance"
                          value={
                            onChainTripixLoading
                              ? "Loading"
                              : `${tokenBalanceDisplay} TRIPIX`
                          }
                        />
                        <InfoTile
                          label="Activity Ledger"
                          value={`${inAppTripixBalance} TRIPIX`}
                        />
                        <InfoTile
                          label="Wallet Balance"
                          value={
                            onChainTripixLoading
                              ? "Loading"
                              : `${onChainTripixBalance} TRIPIX`
                          }
                        />
                        <InfoTile
                          label="On-chain Status"
                          value={
                            onChainTripixError ||
                            (connected
                              ? "Token account balance loaded from Solana."
                              : "Connect Phantom to read token balance.")
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                </div>

                <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-white">
                      Balance Activity
                    </CardTitle>
                    <CardDescription className="text-sm leading-6 text-zinc-300">
                      Recent withdrawals and TRIPIX utility transactions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {burnHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-white">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm text-zinc-300">
                            {item.reason} · {item.time}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                            {item.status}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              item.direction === "credit"
                                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                                : "border-rose-400/30 bg-rose-500/10 text-rose-200"
                            }`}
                          >
                            {item.direction === "credit" ? "+" : "-"}
                            {item.amount} TRIPIX
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "utility" && (
              <div className="space-y-5">
                <ScreenTitle
                  title="TRIPIX Utility"
                  subtitle="Create authority-based events with locked stakes, automatic 10% burn, and 90% distribution to verified finishers."
                />

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                  <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">
                        Balance Utility Summary
                      </CardTitle>
                      <CardDescription className="text-sm leading-6 text-zinc-300">
                        Your event stake is locked at creation. 10% is burned and
                        90% becomes the reward pool.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <StatPill
                          icon={Wallet}
                          label="Balance"
                          value={tokenBalanceDisplay}
                        />
                        <StatPill icon={Flame} label="Burned" value={totalBurned} />
                        <StatPill
                          icon={Ticket}
                          label="Actions"
                          value={burnHistory.length}
                        />
                      </div>

                      <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm leading-6 text-sky-100">
                        Creating a hiking event requires <span className="font-semibold">Hike Master</span>.
                        Creating a falls event requires <span className="font-semibold">Waterfall Expertise</span>.
                      </div>
                    </CardContent>
                  </Card>

                  {utilityView === "actions" ? (
                    <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-white">
                          Burn Actions
                        </CardTitle>
                        <CardDescription className="text-sm leading-6 text-zinc-300">
                          Event creation now uses a locked stake pool rather than
                          a small flat cost.
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          {utilityActions.map((action) => {
                            const canAfford = tokenBalance >= action.burnCost;
                            const isActionReady = canAfford;
                            const Icon = action.icon;
                            const isCreateEvent = action.type === "CREATE_EVENT";

                            return (
                              <div
                                key={action.id}
                                className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5"
                              >
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                  <div className="flex min-w-0 gap-4">
                                    <div
                                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                                        isActionReady || isCreateEvent
                                          ? "bg-emerald-500/20"
                                          : "bg-zinc-700"
                                      }`}
                                    >
                                      <Icon
                                        className={`h-5 w-5 ${
                                          isActionReady || isCreateEvent
                                            ? "text-emerald-300"
                                            : "text-zinc-100"
                                        }`}
                                      />
                                    </div>

                                    <div className="min-w-0">
                                      <p className="text-lg font-semibold leading-tight text-white">
                                        {action.title}
                                      </p>
                                      <p className="mt-2 text-sm leading-7 text-zinc-300">
                                        {action.description}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    <span className="inline-flex rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-200">
                                      {isCreateEvent
                                        ? "Large Stake Required"
                                        : `Burn ${action.burnCost}`}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-5">
                                  {isCreateEvent ? (
                                    <Button
                                      className="w-full rounded-2xl bg-sky-600 text-white hover:bg-sky-500"
                                      onClick={() => handleUtilityAction(action)}
                                    >
                                      <Flame className="mr-2 h-4 w-4" />
                                      Create event
                                    </Button>
                                  ) : (
                                    <Button
                                      className={`w-full rounded-2xl font-medium ${
                                        isActionReady
                                          ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                          : "bg-zinc-700 text-zinc-400"
                                      }`}
                                      disabled={!isActionReady}
                                      onClick={() => handleUtilityAction(action)}
                                    >
                                      <Flame className="mr-2 h-4 w-4" />
                                      {canAfford
                                        ? `Burn ${action.burnCost} TRIPIX`
                                        : "Not Enough TRIPIX"}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <CardTitle className="text-lg text-white">
                              Create Event
                            </CardTitle>
                            <CardDescription className="text-sm leading-6 text-zinc-300">
                              Add the basics, pick a route, then review the
                              reward before posting.
                            </CardDescription>
                          </div>

                          <Button
                            variant="outline"
                            className="rounded-2xl border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                            onClick={() => setUtilityView("actions")}
                          >
                            Back to Utility Actions
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm leading-6 text-sky-100">
                          Simple rule: 10% of the stake burns. The rest becomes
                          the reward pool. For hikes, distance changes how the
                          stake pool is weighted, but it never creates rewards
                          above the stake.
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-white">
                            1. Event Details
                          </h3>
                          <p className="mt-1 text-sm text-zinc-300">
                            Fill this in from top to bottom: basic info,
                            schedule, reward setup, then notes.
                          </p>
                        </div>

                        {eventFieldErrors.length > 0 ? (
                          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
                              <div>
                                <p className="font-semibold text-white">
                                  Required fields need attention
                                </p>
                                <p className="mt-1">
                                  Fill in the highlighted areas:{" "}
                                  {eventFieldErrors
                                    .map((field) => requiredEventFieldLabels[field])
                                    .join(", ")}
                                  .
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <p className="text-sm font-semibold text-white">
                              Basic Info
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-200">
                              Event Name
                            </label>
                            <Input
                              value={eventForm.title}
                              aria-invalid={hasEventFieldError("title")}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEventForm((prev) => ({
                                  ...prev,
                                  title: value,
                                }));
                                if (value.trim()) clearEventFieldError("title");
                              }}
                              placeholder="e.g. Weekend Mountain Hike"
                              className={getEventInputClass(
                                "title",
                                "rounded-2xl text-white"
                              )}
                            />
                            {hasEventFieldError("title") ? (
                              <p className="text-xs font-medium text-amber-200">
                                Event name is required.
                              </p>
                            ) : null}
                          </div>

                          <SelectField
                            label="Event Type"
                            value={eventForm.category}
                            onChange={(value) => {
                              setEventForm((prev) => ({
                                ...prev,
                                category: value as CategoryType,
                              }));
                            }}
                            options={["Hiking", "Falls", "Beach", "Island"]}
                          />

                          <SelectField
                            label="Difficulty"
                            value={eventForm.difficulty}
                            onChange={(value) =>
                              setEventForm((prev) => ({
                                ...prev,
                                difficulty: value as DifficultyLevel,
                              }))
                            }
                            options={["Easy", "Moderate", "Hard", "Expert"]}
                          />

                          <div className="md:col-span-2">
                            <p className="text-sm font-semibold text-white">
                              Schedule
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                              The event opens at the start date/time and closes
                              at the expiration date/time.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-200">
                              Start Date
                            </label>
                            <div className="relative">
                              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-100" />
                              <Input
                                type="date"
                                value={eventForm.date}
                                aria-invalid={hasEventFieldError("date")}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setEventForm((prev) => ({
                                    ...prev,
                                    date: value,
                                  }));
                                  if (value) clearEventFieldError("date");
                                }}
                                className={getEventInputClass(
                                  "date",
                                  "rounded-2xl pl-10 text-white"
                                )}
                              />
                            </div>
                            {hasEventFieldError("date") ? (
                              <p className="text-xs font-medium text-amber-200">
                                Start date is required.
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-200">
                              Expiration Date
                            </label>
                            <div className="relative">
                              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-100" />
                              <Input
                                type="date"
                                value={eventForm.expirationDate}
                                aria-invalid={hasEventFieldError("expirationDate")}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setEventForm((prev) => ({
                                    ...prev,
                                    expirationDate: value,
                                  }));
                                  if (value) clearEventFieldError("expirationDate");
                                }}
                                className={getEventInputClass(
                                  "expirationDate",
                                  "rounded-2xl pl-10 text-white"
                                )}
                              />
                            </div>
                            {hasEventFieldError("expirationDate") ? (
                              <p className="text-xs font-medium text-amber-200">
                                Expiration date is required.
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-200">
                              Start Time
                            </label>
                            <div className="relative">
                              <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-100" />
                              <Input
                                type="time"
                                value={eventForm.startTime}
                                aria-invalid={hasEventFieldError("startTime")}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setEventForm((prev) => ({
                                    ...prev,
                                    startTime: value,
                                  }));
                                  if (value) clearEventFieldError("startTime");
                                }}
                                className={getEventInputClass(
                                  "startTime",
                                  "rounded-2xl pl-10 text-white"
                                )}
                              />
                            </div>
                            {hasEventFieldError("startTime") ? (
                              <p className="text-xs font-medium text-amber-200">
                                Start time is required.
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-200">
                              Expiration Time
                            </label>
                            <div className="relative">
                              <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-100" />
                              <Input
                                type="time"
                                value={eventForm.endTime}
                                aria-invalid={hasEventFieldError("endTime")}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setEventForm((prev) => ({
                                    ...prev,
                                    endTime: value,
                                  }));
                                  if (value) clearEventFieldError("endTime");
                                }}
                                className={getEventInputClass(
                                  "endTime",
                                  "rounded-2xl pl-10 text-white"
                                )}
                              />
                            </div>
                            {hasEventFieldError("endTime") ? (
                              <p className="text-xs font-medium text-amber-200">
                                Expiration time is required.
                              </p>
                            ) : null}
                          </div>

                          <div className="md:col-span-2">
                            <p className="text-sm font-semibold text-white">
                              Reward Setup
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                              Set how many people can finish and how much TRIPIX
                              is locked for rewards.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-200">
                              Max Finishers
                            </label>
                            <div className="relative">
                              <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-100" />
                              <Input
                                value={eventForm.capacity}
                                aria-invalid={hasEventFieldError("capacity")}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setEventForm((prev) => ({
                                    ...prev,
                                    capacity: value,
                                  }));
                                  if (value.trim()) clearEventFieldError("capacity");
                                }}
                                placeholder="e.g. 20"
                                className={getEventInputClass(
                                  "capacity",
                                  "rounded-2xl pl-10 text-white"
                                )}
                              />
                            </div>
                            {hasEventFieldError("capacity") ? (
                              <p className="text-xs font-medium text-amber-200">
                                Max finishers is required.
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-200">
                              Stake to Lock
                            </label>
                            <div className="relative">
                              <Wallet className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-100" />
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                value={eventForm.stakeAmount}
                                aria-invalid={hasEventFieldError("stakeAmount")}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setEventForm((prev) => ({
                                    ...prev,
                                    stakeAmount: value,
                                  }));
                                  if (value.trim()) {
                                    clearEventFieldError("stakeAmount");
                                  }
                                }}
                                placeholder="Choose amount"
                                className={getEventInputClass(
                                  "stakeAmount",
                                  "rounded-2xl pl-10 text-white"
                                )}
                              />
                            </div>
                            {hasEventFieldError("stakeAmount") ? (
                              <p className="text-xs font-medium text-amber-200">
                                Stake amount is required.
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                Notes and Image
                              </p>
                              <p className="mt-1 text-xs text-zinc-400">
                                Add a clear description and optional image for
                                the feed card.
                              </p>
                            </div>

                            <label className="text-sm font-medium text-zinc-200">
                              Description
                            </label>
                            <textarea
                              value={eventForm.description}
                              aria-invalid={hasEventFieldError("description")}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEventForm((prev) => ({
                                  ...prev,
                                  description: value,
                                }));
                                if (value.trim()) {
                                  clearEventFieldError("description");
                                }
                              }}
                              placeholder="What should participants know or bring?"
                              rows={4}
                              className={`w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-400 ${
                                hasEventFieldError("description")
                                  ? "border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/30"
                                  : ""
                              }`}
                            />
                            {hasEventFieldError("description") ? (
                              <p className="text-xs font-medium text-amber-200">
                                Description is required.
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-zinc-200">
                              Event Image
                            </label>
                            <Input
                              type="file"
                              accept="image/*"
                              className="rounded-2xl text-white"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const previewUrl = URL.createObjectURL(file);
                                if (eventImagePreview) {
                                  URL.revokeObjectURL(eventImagePreview);
                                }
                                setEventImageFile(file);
                                setEventImagePreview(previewUrl);
                              }}
                            />

                            {eventImagePreview ? (
                              <div className="relative h-56 overflow-hidden rounded-2xl border border-zinc-700">
                                <Image
                                  src={eventImagePreview}
                                  alt="Event preview"
                                  fill
                                  unoptimized
                                  sizes="(min-width: 768px) 66vw, 100vw"
                                  className="h-56 w-full object-cover"
                                />
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <h3 className="text-base font-semibold text-white">
                                  2. Route
                                </h3>
                                <p className="mt-1 text-sm text-zinc-300">
                                  Pick the initial location and destination. The
                                  distance is calculated automatically.
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                className="shrink-0 rounded-2xl border-sky-500/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/20"
                                onClick={() => void applyCurrentLocationToEventStart()}
                              >
                                <MapPin className="mr-2 h-4 w-4" />
                                Use Current Location
                              </Button>
                            </div>

                            <div
                              className={`rounded-[26px] border p-2 transition ${
                                hasEventFieldError("startPoint") ||
                                hasEventFieldError("destinationPoint") ||
                                hasEventFieldError("distance")
                                  ? "border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/30"
                                  : "border-transparent"
                              }`}
                            >
                              <EventRoutePicker
                                startPoint={eventRoute.startPoint}
                                destinationPoint={eventRoute.destinationPoint}
                                onRouteDistanceChange={handleRouteDistanceChange}
                                onStartChange={(point) => {
                                  clearEventFieldError("startPoint");
                                  setEventRoute((prev) => {
                                    const pointMoved =
                                      prev.startPoint?.lat !== point.lat ||
                                      prev.startPoint?.lng !== point.lng;

                                    return {
                                      ...prev,
                                      startPoint: point,
                                      distanceKm: pointMoved ? null : prev.distanceKm,
                                    };
                                  });
                                }}
                                onDestinationChange={(point) => {
                                  clearEventFieldError("destinationPoint");
                                  setEventRoute((prev) => {
                                    const pointMoved =
                                      prev.destinationPoint?.lat !== point.lat ||
                                      prev.destinationPoint?.lng !== point.lng;

                                    return {
                                      ...prev,
                                      destinationPoint: point,
                                      distanceKm: pointMoved ? null : prev.distanceKm,
                                    };
                                  });
                                }}
                              />
                            </div>

                            {hasEventFieldError("startPoint") ||
                            hasEventFieldError("destinationPoint") ||
                            hasEventFieldError("distance") ? (
                              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs font-medium leading-5 text-amber-100">
                                Required route items:{" "}
                                {[
                                  hasEventFieldError("startPoint")
                                    ? "initial location"
                                    : null,
                                  hasEventFieldError("destinationPoint")
                                    ? "destination location"
                                    : null,
                                  hasEventFieldError("distance")
                                    ? "calculated distance"
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                                .
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                          <div>
                            <h3 className="text-base font-semibold text-white">
                              3. Review
                            </h3>
                            <p className="mt-1 text-sm text-zinc-300">
                              Check the key numbers before creating the event.
                            </p>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <InfoTile
                              label="Stake"
                              value={`${parsedStake || 0} TRIPIX`}
                            />
                            <InfoTile
                              label="Burn"
                              value={`${stakeSettlement.burnAmount} TRIPIX`}
                            />
                            <InfoTile
                              label="Reward Pool"
                              value={`${stakeSettlement.rewardPool} TRIPIX`}
                            />
                            <InfoTile
                              label="Per Finish"
                              value={`${stakeSettlement.rewardPerFinisher} TRIPIX`}
                            />
                          </div>

                          <div className="grid gap-3 text-sm text-zinc-300 md:grid-cols-2">
                            <p>
                              <span className="font-semibold text-white">
                                Authority:
                              </span>{" "}
                              {getRequiredAuthorityName(eventForm.category)} ·{" "}
                              {canHostEvent(eventForm.category)
                                ? "available"
                                : "missing"}
                            </p>
                            <p>
                              <span className="font-semibold text-white">
                                Distance:
                              </span>{" "}
                              {formatDistance(eventRoute.distanceKm)}
                              {eventForm.category === "Hiking"
                                ? ` · ${stakeSettlement.distanceRewardBonus} TRIPIX distance portion`
                                : ""}
                            </p>
                            <p>
                              <span className="font-semibold text-white">
                                Starts:
                              </span>{" "}
                              {eventForm.date && eventForm.startTime
                                ? `${eventForm.date} at ${eventForm.startTime}`
                                : "Choose a start time"}
                            </p>
                            <p>
                              <span className="font-semibold text-white">
                                Expires:
                              </span>{" "}
                              {eventForm.expirationDate && eventForm.endTime
                                ? `${eventForm.expirationDate} at ${eventForm.endTime}`
                                : "Choose an end time"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                          <Button
                            variant="outline"
                            className="rounded-2xl border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                            onClick={() => setUtilityView("actions")}
                          >
                            Cancel
                          </Button>

                          <Button
                            className={`rounded-2xl font-medium ${
                              hasValidStake && tokenBalance >= parsedStake
                                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                : "bg-zinc-700 text-zinc-400"
                            }`}
                            disabled={
                              !hasValidStake ||
                              tokenBalance < parsedStake
                            }
                            onClick={handleCreateEventSubmit}
                          >
                            <Flame className="mr-2 h-4 w-4" />
                            {`Lock ${parsedStake || 0} TRIPIX and Create Event`}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-white">
                      Burn History
                    </CardTitle>
                    <CardDescription className="text-sm leading-6 text-zinc-300">
                      Event stake mechanics now record both the locked creation
                      amount and the reserved burn portion.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {burnHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-white">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm text-zinc-300">
                            {item.reason} · {item.time}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                            {item.status}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              item.direction === "credit"
                                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                                : "border-rose-400/30 bg-rose-500/10 text-rose-200"
                            }`}
                          >
                            {item.direction === "credit" ? "+" : "-"}
                            {item.amount} TRIPIX
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "achievements" && (
              <div className="space-y-5">
                <ScreenTitle
                  title="Achievements"
                  subtitle="Authority achievements now control which event category a user can host."
                />

                <div className="flex flex-wrap gap-2">
                  {[
                    "All",
                    "Unlocked",
                    "Locked",
                    "Authority",
                    "Hiking",
                    "Falls",
                    "Beach",
                    "Island",
                  ].map((filter) => (
                    <Button
                      key={filter}
                      variant={achievementFilter === filter ? "default" : "outline"}
                      className={`rounded-full ${
                        achievementFilter === filter
                          ? "border-sky-500/40 bg-sky-500/15 text-white"
                          : "border-zinc-600 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                      }`}
                      onClick={() => setAchievementFilter(filter)}
                    >
                      {filter}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredAchievements.map((achievement) => (
                    <Card
                      key={achievement.id}
                      className={`rounded-[28px] border shadow-sm ${
                        achievement.unlocked
                          ? "border-zinc-700 bg-zinc-900"
                          : "border-zinc-800 bg-zinc-900/80"
                      }`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                              {achievement.unlocked ? (
                                <Award className="h-6 w-6 text-yellow-300" />
                              ) : (
                                <Lock className="h-5 w-5 text-zinc-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="break-words text-base font-semibold text-white">
                                {achievement.name}
                              </p>
                              <p className="text-sm text-zinc-300">
                                {achievement.category}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${getTierClass(
                              achievement.tier
                            )}`}
                          >
                            {achievement.tier}
                          </span>
                        </div>

                        <p className="mt-4 text-sm leading-7 text-zinc-300">
                          {achievement.description}
                        </p>

                        {achievement.grantsAuthority ? (
                          <div className="mt-3 rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-sm text-sky-100">
                            Grants authority for{" "}
                            <span className="font-semibold">
                              {achievement.grantsAuthority}
                            </span>{" "}
                            event creation.
                          </div>
                        ) : null}

                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="text-zinc-200">
                            {achievement.progress}/{achievement.target}
                          </span>
                          <span
                            className={
                              achievement.unlocked ? "text-emerald-300" : "text-zinc-400"
                            }
                          >
                            {achievement.unlocked ? "Unlocked" : "In Progress"}
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-zinc-100"
                            style={{
                              width: `${Math.min(
                                (achievement.progress / achievement.target) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {tab === "profile" && (
              <div className="space-y-6">
                <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                      <div className="flex shrink-0 flex-col items-center gap-3">
                        <ProfileAvatar
                          name={authUser.displayName}
                          avatarUrl={authUser.avatarUrl}
                          size="lg"
                        />
                        <div className="grid w-full gap-2">
                          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-medium text-sky-100 hover:bg-sky-500/20">
                            <Upload className="h-3.5 w-3.5" />
                            Change
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              disabled={avatarUploading}
                              onChange={async (event) => {
                                const file = event.target.files?.[0];
                                if (file) await handleProfileAvatarUpload(file);
                                event.target.value = "";
                              }}
                            />
                          </label>
                          <Button
                            variant="outline"
                            className="rounded-2xl border-emerald-500/40 bg-emerald-500/15 text-xs text-emerald-100 hover:bg-emerald-500/20"
                            disabled={avatarUploading}
                            onClick={handleProfileCameraStart}
                          >
                            <Camera className="mr-2 h-3.5 w-3.5" />
                            Camera
                          </Button>
                        </div>
                        {profileCameraStream ? (
                          <div className="w-full space-y-2 rounded-2xl border border-zinc-700 bg-zinc-800 p-2">
                            <video
                              ref={profileVideoRef}
                              autoPlay
                              playsInline
                              muted
                              className="aspect-square w-full rounded-xl object-cover"
                            />
                            <div className="grid gap-2">
                              <Button
                                className="rounded-2xl bg-emerald-600 text-xs text-white hover:bg-emerald-500"
                                onClick={handleProfileCameraCapture}
                              >
                                Capture
                              </Button>
                              <Button
                                variant="outline"
                                className="rounded-2xl border-zinc-600 bg-zinc-900 text-xs text-zinc-100 hover:bg-zinc-700"
                                onClick={() => {
                                  profileCameraStream
                                    .getTracks()
                                    .forEach((track) => track.stop());
                                  setProfileCameraStream(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : null}
                        {avatarUploading ? (
                          <p className="text-center text-xs text-zinc-300">
                            Updating avatar...
                          </p>
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        {profileEditing ? (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-zinc-200">
                                Display name
                              </label>
                              <Input
                                value={profileName}
                                onChange={(event) =>
                                  setProfileName(event.target.value)
                                }
                                className="rounded-2xl text-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-zinc-200">
                                Bio
                              </label>
                              <textarea
                                value={profileBio}
                                onChange={(event) =>
                                  setProfileBio(event.target.value)
                                }
                                rows={4}
                                placeholder="Tell people what kind of trips you enjoy."
                                className="w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-400"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-zinc-200">
                                Local number
                              </label>
                              <Input
                                type="tel"
                                value={profileLocalNumber}
                                onChange={(event) =>
                                  setProfileLocalNumber(event.target.value)
                                }
                                placeholder="912 345 6789"
                                className="rounded-2xl text-white"
                              />
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button
                                className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500"
                                disabled={profileSaving}
                                onClick={handleProfileSaveRequest}
                              >
                                {profileSaving ? "Saving..." : "Save Profile"}
                              </Button>
                              <Button
                                variant="outline"
                                className="rounded-2xl border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                                disabled={profileSaving}
                                onClick={() => {
                                  setProfileName(authUser.displayName);
                                  setProfileBio(authUser.bio);
                                  setProfileLocalNumber(
                                    profile?.phone_local_number || ""
                                  );
                                  setProfileEditing(false);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <h2 className="break-words text-3xl font-semibold leading-tight text-white md:text-4xl">
                                  {authUser.displayName}
                                </h2>
                                <p className="mt-2 break-words text-base leading-7 text-zinc-300">
                                  {authUser.bio ||
                                    "Adventure traveler · Solana Devnet identity"}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                className="shrink-0 rounded-2xl border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                                onClick={() => {
                                  setProfileName(authUser.displayName);
                                  setProfileBio(authUser.bio);
                                  setProfileLocalNumber(
                                    profile?.phone_local_number || ""
                                  );
                                  setProfileEditing(true);
                                }}
                              >
                                Edit Profile
                              </Button>
                            </div>
                          </>
                        )}

                        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          <StatPill
                            icon={ImageIcon}
                            label="Posts"
                            value={profileStats.postsCount}
                          />
                          <StatPill
                            icon={MapPin}
                            label="Places"
                            value={profileStats.placesCount}
                          />
                          <StatPill
                            icon={Trophy}
                            label="Badges"
                            value={profileStats.badgesCount}
                          />
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <InfoTile
                            label="Contact"
                            value={authUser.contactNumber || "Not added"}
                          />
                          <InfoTile
                            label="Location"
                            value={authUser.location || "Not added"}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl text-white">
                      Account Security
                    </CardTitle>
                    <CardDescription className="text-sm leading-6 text-zinc-300">
                      Wallet-linked identity and proof anchors for validation.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="grid gap-4 md:grid-cols-3">
                    <InfoTile
                      label="Password SHA-256"
                      value={shortenHash(accountSecurity.passwordSha256)}
                    />
                    <InfoTile
                      label="Solana Public Key"
                      value={accountSecurity.solanaPublicKey}
                    />
                    <InfoTile
                      label="Network"
                      value={accountSecurity.network}
                    />
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl text-white">
                      Proof Ledger
                    </CardTitle>
                    <CardDescription className="text-sm leading-6 text-zinc-300">
                      GPS and photo metadata records anchored for check-ins.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {proofRecords.length === 0 ? (
                      <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm text-zinc-300">
                        Proof records from completed destination check-ins will
                        appear here.
                      </div>
                    ) : (
                      proofRecords.map((proof) => (
                        <div
                          key={proof.id}
                          className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-base font-semibold text-white">
                                {proof.destination}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-zinc-300">
                                {proof.timestamp}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-zinc-300">
                                GPS {proof.gps.lat.toFixed(5)},{" "}
                                {proof.gps.lng.toFixed(5)} · Photo{" "}
                                {proof.photoName}
                              </p>
                              <p className="mt-1 break-all text-xs leading-5 text-zinc-400">
                                Metadata SHA-256: {proof.metadataHash}
                              </p>
                              <p className="mt-1 break-all text-xs leading-5 text-zinc-400">
                                Solana signature: {proof.solanaSignature}
                              </p>
                            </div>

                            <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                              {proof.network}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl text-white">
                      Hosting Authority
                    </CardTitle>
                    <CardDescription className="text-sm leading-6 text-zinc-300">
                      Event creation rights are based on relevant expertise achievements.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="grid gap-4 md:grid-cols-2">
                    {(["Hiking", "Falls", "Beach", "Island"] as CategoryType[]).map(
                      (category) => {
                        const authority = hostingAuthority.find(
                          (item) => item.category === category
                        );
                        const required =
                          authority?.requiredBadge || getRequiredAuthorityName(category);
                        const unlocked = authority?.authorized || false;

                        return (
                          <div
                            key={category}
                            className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4"
                          >
                            <p className="text-sm font-semibold text-white">
                              {category} Event Hosting
                            </p>
                            <p className="mt-1 text-sm text-zinc-300">
                              Required badge: {required}
                            </p>
                            <p
                              className={`mt-2 text-sm font-medium ${
                                unlocked ? "text-emerald-300" : "text-rose-300"
                              }`}
                            >
                              {unlocked ? "Authorized" : "Not Authorized"}
                            </p>
                          </div>
                        );
                      }
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl text-white">
                      Current Joined Events
                    </CardTitle>
                    <CardDescription className="text-sm leading-6 text-zinc-300">
                      Events and activities currently joined by the user.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {joinedActivities.length === 0 ? (
                      <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm text-zinc-300">
                        Joined events will appear here.
                      </div>
                    ) : (
                      joinedActivities.map((activity) => {
                        const status = getJoinedEventStatus(
                          activity,
                          hasEventStarted(activity),
                          isEventExpired(activity)
                        );

                        return (
                          <div
                            key={activity.id}
                            className={`relative overflow-hidden rounded-2xl border p-4 ${status.cardClass}`}
                          >
                            <div
                              aria-hidden="true"
                              className={`absolute inset-y-0 left-0 w-1.5 ${status.railClass}`}
                            />
                            <div className="flex flex-col gap-3 pl-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="break-words text-base font-semibold text-white">
                                  {activity.eventTitle}
                                </p>
                                <p className="mt-1 text-xs font-medium text-zinc-200">
                                  {status.helper}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-zinc-300">
                                  {formatPoint(activity.initialPoint)} →{" "}
                                  {formatPoint(activity.destinationPoint)}
                                </p>
                                <p className="text-sm text-zinc-300">
                                  Starts {activity.eventDate} · {activity.startTime}
                                </p>
                                <p className="text-sm text-zinc-300">
                                  Expires {activity.expirationDate || activity.eventDate} ·{" "}
                                  {activity.endTime}
                                </p>
                                <p className="text-sm text-zinc-300">
                                  Distance: {formatDistance(activity.routeDistanceKm)}
                                </p>
                                <p className="text-sm text-zinc-300">
                                  Stake: {activity.stakeAmount} · Pool: {activity.rewardPool} ·
                                  Remaining:{" "}
                                  {activity.remainingRewardPool ?? activity.rewardPool}
                                </p>
                                <p className="text-sm text-zinc-300">
                                  Reward per completion: {activity.rewardPerFinisher}
                                </p>
                              </div>

                              <span
                                className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.badgeClass}`}
                              >
                                {status.label}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
