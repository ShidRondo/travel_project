"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
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
  MapPin,
  MessageCircle,
  PlayCircle,
  Route,
  Search,
  Share2,
  Ticket,
  Trophy,
  User,
  Users,
  Wallet,
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
  | "utility"
  | "achievements"
  | "profile";

type MapPoint = {
  lat: number;
  lng: number;
};

type DestinationCard = {
  id: number;
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

type TrailDestination = {
  id: string;
  name: string;
  type: "Checkpoint" | "Target";
  difficulty: DifficultyLevel;
  reward: number;
};

type Trail = {
  id: string;
  name: string;
  area: string;
  trailhead: {
    id: string;
    name: string;
    location: string;
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

type FeedPost = {
  id: number;
  author: string;
  avatar: string;
  destination: string;
  caption: string;
  achievement: string;
  likes: number;
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
  startTime?: string;
  endTime?: string;
  eventDescription?: string;
  eventImage?: string;
  creatorAuthorityName?: string;
  requiredAuthorityName?: string;
  stakeAmount?: number;
  rewardPool?: number;
  burnAmount?: number;
  rewardPerFinisher?: number;
  participant?: EventProgress;
};

type BurnReason =
  | "CREATE_EVENT"
  | "JOIN_EVENT"
  | "UNLOCK_BADGE"
  | "ACTIVATE_BOOST"
  | "EVENT_BURN";

type BurnHistoryItem = {
  id: string;
  title: string;
  reason: BurnReason;
  amount: number;
  status: "Completed";
  time: string;
};

type UtilityAction = {
  id: string;
  title: string;
  description: string;
  burnCost: number;
  type: "CREATE_EVENT" | "JOIN_EVENT" | "UNLOCK_BADGE" | "ACTIVATE_BOOST";
  icon: LucideIcon;
};

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

function formatPoint(point?: MapPoint | null) {
  if (!point) return "Not selected";
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
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

function hasEventAuthority(
  achievements: AchievementItem[],
  category: CategoryType
) {
  const required = getRequiredAuthorityName(category);
  return achievements.some((a) => a.name === required && a.unlocked);
}

function getMinimumStake(
  difficulty: DifficultyLevel,
  capacity: number
) {
  const base = 100;
  const difficultyAdd: Record<DifficultyLevel, number> = {
    Easy: 0,
    Moderate: 50,
    Hard: 100,
    Expert: 150,
  };
  const capacityAdd = capacity * 10;
  return base + difficultyAdd[difficulty] + capacityAdd;
}

function settleStake(stakeAmount: number, finishers: number) {
  const burnAmount = Math.round(stakeAmount * 0.1);
  const rewardPool = stakeAmount - burnAmount;
  const rewardPerFinisher =
    finishers > 0 ? Math.floor(rewardPool / finishers) : 0;

  return {
    burnAmount,
    rewardPool,
    rewardPerFinisher,
  };
}

const destinations: DestinationCard[] = [
  {
    id: 1,
    name: "Kawasan Falls",
    category: "Falls",
    location: "Badian, Cebu",
    difficulty: "Easy",
    points: 20,
    requiresQR: false,
    description:
      "A famous multi-tiered waterfall destination known for turquoise water and canyon activities.",
    hero: "Waterfall explorer",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    startLat: 9.8005,
    startLng: 123.365,
    destLat: 9.8167,
    destLng: 123.3747,
  },
  {
    id: 2,
    name: "Osmeña Peak",
    category: "Hiking",
    location: "Dalaguete, Cebu",
    difficulty: "Moderate",
    points: 30,
    requiresQR: false,
    description:
      "A scenic mountain destination popular for sunrise hikes and panoramic ridge views.",
    hero: "Summit tracker",
    imageUrl:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    startLat: 9.785,
    startLng: 123.596,
    destLat: 9.7993,
    destLng: 123.6072,
  },
  {
    id: 3,
    name: "Bantayan Island",
    category: "Island",
    location: "Cebu",
    difficulty: "Easy",
    points: 25,
    requiresQR: false,
    description:
      "A well-known island destination with beaches, resorts, and clear coastal views.",
    hero: "Island escape",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    startLat: 11.244,
    startLng: 123.941,
    destLat: 11.2614,
    destLng: 123.9543,
  },
  {
    id: 4,
    name: "Moalboal White Beach",
    category: "Beach",
    location: "Moalboal, Cebu",
    difficulty: "Easy",
    points: 15,
    requiresQR: false,
    description:
      "A coastal destination for beach trips, sunsets, and marine activities.",
    hero: "Coastal check-in",
    imageUrl:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80",
    startLat: 9.932,
    startLng: 123.39,
    destLat: 9.9439,
    destLng: 123.3995,
  },
];

const trails: Trail[] = [
  {
    id: "trail-1",
    name: "Paseo Ridge Network",
    area: "Cebu Highlands",
    trailhead: {
      id: "th-1",
      name: "Paseo Trailhead",
      location: "Registered initial hiking point",
    },
    nextTrailId: "trail-2",
    destinations: [
      {
        id: "dest-1",
        name: "Starbuk Viewpoint",
        type: "Checkpoint",
        difficulty: "Moderate",
        reward: 20,
      },
      {
        id: "dest-2",
        name: "Pahamutan Peak",
        type: "Target",
        difficulty: "Hard",
        reward: 30,
      },
    ],
  },
  {
    id: "trail-2",
    name: "Pahamutan Extension Trail",
    area: "Cebu Highlands",
    trailhead: {
      id: "th-2",
      name: "Pahamutan Junction Trailhead",
      location: "Connected next trail start",
    },
    nextTrailId: null,
    destinations: [
      {
        id: "dest-3",
        name: "Cedar Camp Stop",
        type: "Checkpoint",
        difficulty: "Moderate",
        reward: 20,
      },
      {
        id: "dest-4",
        name: "Eagle Crest Summit",
        type: "Target",
        difficulty: "Expert",
        reward: 40,
      },
    ],
  },
];

const achievementsData: AchievementItem[] = [
  {
    id: "a0",
    name: "Hike Master",
    category: "Authority",
    tier: "Advanced",
    progress: 1,
    target: 1,
    unlocked: true,
    description:
      "Grants authority to create hiking events at any difficulty level.",
    grantsAuthority: "Hiking",
  },
  {
    id: "a01",
    name: "Waterfall Expertise",
    category: "Authority",
    tier: "Advanced",
    progress: 1,
    target: 1,
    unlocked: true,
    description:
      "Grants authority to create waterfall events at any difficulty level.",
    grantsAuthority: "Falls",
  },
  {
    id: "a02",
    name: "Beach Explorer",
    category: "Authority",
    tier: "Beginner",
    progress: 0,
    target: 1,
    unlocked: false,
    description:
      "Grants authority to create beach events once unlocked.",
    grantsAuthority: "Beach",
  },
  {
    id: "a03",
    name: "Island Specialist",
    category: "Authority",
    tier: "Expert",
    progress: 0,
    target: 1,
    unlocked: false,
    description:
      "Grants authority to create island events once unlocked.",
    grantsAuthority: "Island",
  },
  {
    id: "a1",
    name: "Falls Explorer",
    category: "Falls",
    tier: "Advanced",
    progress: 3,
    target: 5,
    unlocked: false,
    description: "Visit 5 verified falls.",
  },
  {
    id: "a2",
    name: "Trail Starter",
    category: "Hiking",
    tier: "Beginner",
    progress: 1,
    target: 1,
    unlocked: true,
    description: "Complete 1 verified hiking destination.",
  },
  {
    id: "a3",
    name: "Trail Expert",
    category: "Hiking",
    tier: "Expert",
    progress: 4,
    target: 10,
    unlocked: false,
    description: "Complete 10 verified hiking destinations.",
  },
  {
    id: "a4",
    name: "Island Hopper",
    category: "Island",
    tier: "Beginner",
    progress: 1,
    target: 3,
    unlocked: false,
    description: "Visit 3 verified islands.",
  },
  {
    id: "a5",
    name: "Coastal Wanderer",
    category: "Beach",
    tier: "Advanced",
    progress: 2,
    target: 5,
    unlocked: false,
    description: "Visit 5 verified beaches.",
  },
];

const starterPosts: FeedPost[] = [
  {
    id: 1,
    author: "Sid Lloyd",
    avatar: "SL",
    destination: "Kawasan Falls",
    caption:
      "First verified waterfall this week. Clean feed, clean view, worth the trip.",
    achievement: "Falls Beginner",
    likes: 42,
    comments: 7,
    image: "Falls check-in",
    postType: "standard",
  },
  {
    id: 2,
    author: "Mika",
    avatar: "MK",
    destination: "Osmeña Peak",
    caption: "Sunrise hike unlocked. Trail target completed and bonus earned.",
    achievement: "Trail Starter",
    likes: 28,
    comments: 5,
    image: "Peak sunrise",
    postType: "standard",
  },
  {
    id: 3,
    author: "TravelQuest",
    avatar: "TQ",
    destination: "Hiking Event",
    caption:
      "Authority-based hiking event created by a host with Hike Master. The locked stake is settled after completion.",
    achievement: "Event Posted",
    likes: 14,
    comments: 4,
    image: "Community event",
    postType: "event",
    eventTitle: "Sunrise Ridge Trek",
    eventCategory: "Hiking",
    eventDifficulty: "Moderate",
    joinCost: 10,
    joinedCount: 8,
    completedCount: 3,
    failedCount: 1,
    eventCapacity: 20,
    initialPoint: { lat: 10.3202, lng: 123.8945 },
    destinationPoint: { lat: 10.3355, lng: 123.9104 },
    eventDate: "2026-12-20",
    startTime: "05:30",
    endTime: "10:30",
    eventDescription:
      "A guided sunrise hike with route briefing, summit stop, and verification-based reward distribution.",
    creatorAuthorityName: "Hike Master",
    requiredAuthorityName: "Hike Master",
    stakeAmount: 300,
    rewardPool: 270,
    burnAmount: 30,
    rewardPerFinisher: 90,
    eventImage:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    participant: {
      joined: false,
      verifiedStart: false,
      completed: false,
      failed: false,
      rewardClaimed: false,
    },
  },
];

const utilityActions: UtilityAction[] = [
  {
    id: "u1",
    title: "Create Community Event",
    description:
      "Lock a large TRIPIX stake, burn 10%, and distribute 90% to verified finishers.",
    burnCost: 100,
    type: "CREATE_EVENT",
    icon: Flame,
  },
  {
    id: "u2",
    title: "Join Premium Event",
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
    description: "Boost the next verified trip or hike reward for stronger engagement.",
    burnCost: 15,
    type: "ACTIVATE_BOOST",
    icon: Zap,
  },
];

export default function TravelQuestMVP() {
  const [tab, setTab] = useState<TabKey>("feed");
  const [search, setSearch] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(1200);
  const [selectedDestination, setSelectedDestination] = useState<DestinationCard>(
    destinations[0]
  );
  const [selectedTrailId, setSelectedTrailId] = useState(trails[0].id);
  const [selectedTargetId, setSelectedTargetId] = useState(
    trails[0].destinations[1].id
  );
  const [utilityView, setUtilityView] = useState<"actions" | "createEvent">(
    "actions"
  );
  const [eventImagePreview, setEventImagePreview] = useState("");

  const [eventRoute, setEventRoute] = useState<{
    startPoint: MapPoint | null;
    destinationPoint: MapPoint | null;
  }>({
    startPoint: null,
    destinationPoint: null,
  });

  const [eventForm, setEventForm] = useState({
    title: "",
    category: "Hiking" as CategoryType,
    difficulty: "Moderate" as DifficultyLevel,
    date: "",
    startTime: "",
    endTime: "",
    capacity: "",
    description: "",
    stakeAmount: "300",
  });

  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([
    {
      id: Date.now(),
      author: "You",
      avatar: "YU",
      destination: "Kawasan Falls",
      caption: "Verified visit completed at Kawasan Falls.",
      achievement: "Falls Progress +1",
      likes: 0,
      comments: 0,
      image: "Travel story",
      postType: "standard",
    },
    ...starterPosts,
  ]);

  const [checkInState, setCheckInState] = useState({
    gps: false,
    photo: false,
    verified: false,
  });

  const [achievementFilter, setAchievementFilter] = useState("All");

  const [burnHistory, setBurnHistory] = useState<BurnHistoryItem[]>([
    {
      id: "bh1",
      title: "Joined Premium Event",
      reason: "JOIN_EVENT",
      amount: 10,
      status: "Completed",
      time: "Today",
    },
  ]);

  const [hikeSession, setHikeSession] = useState<HikeSession>({
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
  }, [search]);

  const filteredAchievements = useMemo(() => {
    if (achievementFilter === "All") return achievementsData;
    if (achievementFilter === "Unlocked") {
      return achievementsData.filter((a) => a.unlocked);
    }
    if (achievementFilter === "Locked") {
      return achievementsData.filter((a) => !a.unlocked);
    }
    return achievementsData.filter((a) => a.category === achievementFilter);
  }, [achievementFilter]);

  const totalBurned = useMemo(
    () => burnHistory.reduce((sum, item) => sum + item.amount, 0),
    [burnHistory]
  );

  const selectedTrail = useMemo(
    () => trails.find((trail) => trail.id === selectedTrailId) || trails[0],
    [selectedTrailId]
  );

  const selectedTarget = useMemo(
    () =>
      selectedTrail.destinations.find(
        (destination) => destination.id === selectedTargetId
      ) || selectedTrail.destinations[0],
    [selectedTargetId, selectedTrail]
  );

  const nextTrail = useMemo(
    () => trails.find((trail) => trail.id === selectedTrail.nextTrailId) || null,
    [selectedTrail]
  );

  const joinedActivities = useMemo(() => {
    return feedPosts.filter(
      (post) => post.postType === "event" && post.participant?.joined
    );
  }, [feedPosts]);

  const parsedCapacity = Number(eventForm.capacity || 0);
  const parsedStake = Number(eventForm.stakeAmount || 0);
  const minimumStake = useMemo(
    () => getMinimumStake(eventForm.difficulty, parsedCapacity || 0),
    [eventForm.difficulty, parsedCapacity]
  );
  const stakeSettlement = useMemo(
    () => settleStake(parsedStake || 0, 1),
    [parsedStake]
  );

  const navItems: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
    { key: "feed", label: "Feed", icon: Home },
    { key: "discover", label: "Discover", icon: Search },
    { key: "checkin", label: "Check-In", icon: Camera },
    { key: "hiking", label: "Hike", icon: Route },
    { key: "utility", label: "TRIPIX Utility", icon: Flame },
    { key: "achievements", label: "Achievements", icon: Award },
    { key: "profile", label: "Profile", icon: User },
  ];

  const isEventExpired = (post: FeedPost) => {
    if (!post.eventDate || !post.endTime) return false;
    const endDateTime = new Date(`${post.eventDate}T${post.endTime}`);
    return new Date() > endDateTime;
  };

  const handleSimpleCheckIn = () => {
    if (!checkInState.gps || !checkInState.photo) return;

    setCheckInState((prev) => ({ ...prev, verified: true }));
    setTokenBalance((prev) => prev + selectedDestination.points);

    setFeedPosts((prev) => [
      {
        id: Date.now(),
        author: "You",
        avatar: "YU",
        destination: selectedDestination.name,
        caption: `Verified visit completed at ${selectedDestination.name}.`,
        achievement: `${selectedDestination.category} Progress +1`,
        likes: 0,
        comments: 0,
        image: "Travel story",
        postType: "standard",
      },
      ...prev,
    ]);
  };

  const handleBurnAction = (action: UtilityAction) => {
    if (tokenBalance < action.burnCost) return;

    setTokenBalance((prev) => prev - action.burnCost);
    setBurnHistory((prev) => [
      {
        id: `${action.id}-${Date.now()}`,
        title: action.title,
        reason: action.type,
        amount: action.burnCost,
        status: "Completed",
        time: "Just now",
      },
      ...prev,
    ]);
  };

  const handleJoinEvent = (postId: number, joinCost: number) => {
    if (tokenBalance < joinCost) {
      alert("Not enough TRIPIX to join this event.");
      return;
    }

    setTokenBalance((prev) => prev - joinCost);

    setBurnHistory((prev) => [
      {
        id: `join-event-${postId}-${Date.now()}`,
        title: "Joined Premium Event",
        reason: "JOIN_EVENT",
        amount: joinCost,
        status: "Completed",
        time: "Just now",
      },
      ...prev,
    ]);

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
  };

  const handleVerifyEventStart = (postId: number) => {
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
  };

  const handleCompleteEvent = (postId: number) => {
    setFeedPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId || !post.participant || post.participant.completed) {
          return post;
        }

        const newCompletedCount = (post.completedCount || 0) + 1;
        const stakeAmount = post.stakeAmount || 0;
        const burnAmount = Math.round(stakeAmount * 0.1);
        const rewardPool = stakeAmount - burnAmount;
        const rewardPerFinisher =
          newCompletedCount > 0 ? Math.floor(rewardPool / newCompletedCount) : 0;

        setTokenBalance((prevBalance) => prevBalance + rewardPerFinisher);

        return {
          ...post,
          completedCount: newCompletedCount,
          burnAmount,
          rewardPool,
          rewardPerFinisher,
          participant: {
            ...post.participant,
            completed: true,
            rewardClaimed: true,
          },
        };
      })
    );
  };

  const handleFailEvent = (postId: number) => {
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
  };

  const handleCreateEventSubmit = () => {
    if (
      !eventForm.title.trim() ||
      !eventForm.date.trim() ||
      !eventForm.startTime.trim() ||
      !eventForm.endTime.trim() ||
      !eventForm.capacity.trim() ||
      !eventForm.description.trim() ||
      !eventForm.stakeAmount.trim() ||
      eventRoute.startPoint === null ||
      eventRoute.destinationPoint === null
    ) {
      alert("Please complete all required event fields.");
      return;
    }

    if (!hasEventAuthority(achievementsData, eventForm.category)) {
      alert(
        `You need ${getRequiredAuthorityName(
          eventForm.category
        )} to create a ${eventForm.category.toLowerCase()} event.`
      );
      return;
    }

    if (parsedStake < minimumStake) {
      alert(
        `Stake amount is too low. Minimum required stake is ${minimumStake} TRIPIX.`
      );
      return;
    }

    if (tokenBalance < parsedStake) {
      alert("Not enough TRIPIX for the required event stake.");
      return;
    }

    const creatorAuthorityName = getRequiredAuthorityName(eventForm.category);
    const settlement = settleStake(parsedStake, 1);

    setTokenBalance((prev) => prev - parsedStake);

    setBurnHistory((prev) => [
      {
        id: `create-event-${Date.now()}`,
        title: `Created Event: ${eventForm.title}`,
        reason: "CREATE_EVENT",
        amount: parsedStake,
        status: "Completed",
        time: "Just now",
      },
      {
        id: `event-burn-${Date.now()}`,
        title: `Reserved Burn Pool: ${eventForm.title}`,
        reason: "EVENT_BURN",
        amount: settlement.burnAmount,
        status: "Completed",
        time: "Just now",
      },
      ...prev,
    ]);

    setFeedPosts((prev) => [
      {
        id: Date.now(),
        author: "You",
        avatar: "YU",
        destination: `${eventForm.category} Event`,
        caption:
          "New authority-based event posted. 10% of the locked stake is burned and 90% is distributed to verified finishers.",
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
        startTime: eventForm.startTime,
        endTime: eventForm.endTime,
        eventDescription: eventForm.description,
        eventImage: eventImagePreview,
        creatorAuthorityName,
        requiredAuthorityName: creatorAuthorityName,
        stakeAmount: parsedStake,
        rewardPool: settlement.rewardPool,
        burnAmount: settlement.burnAmount,
        rewardPerFinisher: settlement.rewardPerFinisher,
        participant: {
          joined: false,
          verifiedStart: false,
          completed: false,
          failed: false,
          rewardClaimed: false,
        },
      },
      ...prev,
    ]);

    setEventForm({
      title: "",
      category: "Hiking",
      difficulty: "Moderate",
      date: "",
      startTime: "",
      endTime: "",
      capacity: "",
      description: "",
      stakeAmount: "300",
    });

    setEventRoute({
      startPoint: null,
      destinationPoint: null,
    });

    setEventImagePreview("");
    setUtilityView("actions");
    setTab("feed");
  };

  const handleSelectTrail = (trailId: string) => {
    const trail = trails.find((item) => item.id === trailId) || trails[0];
    setSelectedTrailId(trail.id);
    const target =
      trail.destinations.find((item) => item.type === "Target") ||
      trail.destinations[0];
    setSelectedTargetId(target.id);
  };

  const handleVerifyTrailhead = () => {
    setHikeSession((prev) => ({
      ...prev,
      currentTrailheadMatched: true,
      trailheadVerified: true,
    }));
  };

  const handleStartHike = () => {
    if (!hikeSession.currentTrailheadMatched) return;

    setHikeSession({
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

  const handleReachDestination = (destinationId: string) => {
    if (!hikeSession.active) return;
    if (hikeSession.reachedDestinationIds.includes(destinationId)) return;

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

    setTokenBalance((prev) => prev + totalAdded);

    setHikeSession((prev) => ({
      ...prev,
      reachedDestinationIds: updatedReached,
      totalEarned: prev.totalEarned + totalAdded,
      targetReached: prev.targetReached || isTarget,
      status: isTarget ? "Target Reached" : prev.status,
      multiDestinationBonusAwarded:
        prev.multiDestinationBonusAwarded || multiDestinationBonus > 0,
      nextTrailReady: isTarget && !!nextTrail,
      lastRewardBreakdown: {
        destination: destination.name,
        difficulty: destination.difficulty,
        baseReward: destination.reward,
        targetBonus,
        multiDestinationBonus,
        totalAdded,
      },
    }));

    setFeedPosts((prev) => [
      {
        id: Date.now(),
        author: "You",
        avatar: "YU",
        destination: destination.name,
        caption: `Reached ${destination.name} on ${selectedTrail.name}.`,
        achievement: isTarget ? "Target Completed" : "Checkpoint Reached",
        likes: 0,
        comments: 0,
        image: destination.name,
        postType: "standard",
      },
      ...prev,
    ]);
  };

  const handleProceedNextTrail = () => {
    if (!nextTrail) return;

    const target =
      nextTrail.destinations.find((item) => item.type === "Target") ||
      nextTrail.destinations[0];

    setSelectedTrailId(nextTrail.id);
    setSelectedTargetId(target.id);

    setHikeSession({
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
      <div className="mx-auto flex max-w-7xl gap-6 p-4 md:p-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
              <div className="mb-6 space-y-2">
                <div className="text-2xl font-bold tracking-tight text-white">
                  TravelQuest
                </div>
                <p className="text-sm leading-6 text-zinc-300">
                  Social travel activity tracking with authority-based event
                  creation, locked TRIPIX stakes, and burn-backed reward pools.
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
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Wallet
                  </span>
                  <Wallet className="h-4 w-4 text-zinc-100" />
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {tokenBalance} TRIPIX
                </div>
                <Button
                  className={`mt-3 w-full rounded-2xl border font-medium ${
                    walletConnected
                      ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/20"
                      : "border-sky-500/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/20"
                  }`}
                  variant="outline"
                  onClick={() => setWalletConnected((value) => !value)}
                >
                  {walletConnected ? "Wallet Connected" : "Connect Wallet"}
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
            <section className="overflow-hidden rounded-[30px] border border-zinc-800 bg-zinc-900 shadow-sm">
              <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 px-6 py-8 text-white md:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl space-y-3">
                    <Badge className="rounded-full border border-zinc-600 bg-zinc-800/80 px-3 py-1 text-white hover:bg-zinc-800/80">
                      Authority + Stake Pool Mechanics
                    </Badge>
                    <div className="space-y-2">
                      <h1 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
                        Credible hosts. Locked stake pools. Burn-backed rewards.
                      </h1>
                      <p className="max-w-2xl text-sm leading-7 text-zinc-200 md:text-base">
                        Event creation requires category authority achievements.
                        The creator locks a large TRIPIX stake, 10% is burned,
                        and 90% is distributed only to verified finishers.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:w-[420px]">
                    <CompactStatPill icon={Compass} label="Trips" value={12} />
                    <CompactStatPill icon={Trophy} label="Badges" value={7} />
                    <CompactStatPill
                      icon={Wallet}
                      label="TRIPIX"
                      value={tokenBalance}
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
                    subtitle="Posted events now show required authority, locked stake, 10% burn, 90% reward pool, joined count, and completion controls."
                  />

                  {feedPosts.map((post) => (
                    <Card
                      key={post.id}
                      className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm"
                    >
                      <CardContent className="p-0">
                        <div className="flex items-center justify-between px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 font-semibold text-white">
                              {post.avatar}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {post.author}
                              </p>
                              <p className="truncate text-xs text-zinc-300">
                                {post.destination}
                              </p>
                            </div>
                          </div>
                          <Badge className="rounded-full">
                            {post.achievement}
                          </Badge>
                        </div>

                        <div className="mx-5 h-72 overflow-hidden rounded-[24px] border border-zinc-700 bg-gradient-to-br from-zinc-800 to-zinc-700">
                          {post.postType === "event" && post.eventImage ? (
                            <img
                              src={post.eventImage}
                              alt={post.eventTitle || "Event image"}
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
                            <button className="flex items-center gap-2 text-sm">
                              <Heart className="h-4 w-4 text-zinc-100" />{" "}
                              {post.likes}
                            </button>
                            <button className="flex items-center gap-2 text-sm">
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

                          {post.postType === "event" ? (
                            <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                              <div className="space-y-2 text-sm text-zinc-200">
                                <p className="text-base font-semibold text-white">
                                  {post.eventTitle}
                                </p>

                                {post.eventDescription ? (
                                  <p className="leading-6 text-zinc-300">
                                    {post.eventDescription}
                                  </p>
                                ) : null}

                                <div>
                                  <span className="font-semibold text-white">
                                    Required Authority:
                                  </span>{" "}
                                  {post.requiredAuthorityName}
                                </div>

                                <div>
                                  <span className="font-semibold text-white">
                                    Host Authority:
                                  </span>{" "}
                                  {post.creatorAuthorityName}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white">
                                    Difficulty:
                                  </span>
                                  {post.eventDifficulty ? (
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-medium ${getDifficultyClass(
                                        post.eventDifficulty
                                      )}`}
                                    >
                                      {post.eventDifficulty}
                                    </span>
                                  ) : null}
                                </div>

                                <div>
                                  <span className="font-semibold text-white">
                                    Stake Locked:
                                  </span>{" "}
                                  {post.stakeAmount} TRIPIX
                                </div>

                                <div>
                                  <span className="font-semibold text-white">
                                    Burn 10%:
                                  </span>{" "}
                                  {post.burnAmount} TRIPIX
                                </div>

                                <div>
                                  <span className="font-semibold text-white">
                                    Reward Pool 90%:
                                  </span>{" "}
                                  {post.rewardPool} TRIPIX
                                </div>

                                <div>
                                  <span className="font-semibold text-white">
                                    Current Reward per Finisher:
                                  </span>{" "}
                                  {post.rewardPerFinisher} TRIPIX
                                </div>

                                <div>
                                  <span className="font-semibold text-white">
                                    Joined:
                                  </span>{" "}
                                  {post.joinedCount || 0} / {post.eventCapacity}
                                </div>

                                <div>
                                  <span className="font-semibold text-white">
                                    Completed:
                                  </span>{" "}
                                  {post.completedCount || 0}
                                </div>

                                <div>
                                  <span className="font-semibold text-white">
                                    Failed:
                                  </span>{" "}
                                  {post.failedCount || 0}
                                </div>

                                <div>
                                  <span className="font-semibold text-white">
                                    Initial:
                                  </span>{" "}
                                  {formatPoint(post.initialPoint)}
                                </div>

                                <div>
                                  <span className="font-semibold text-white">
                                    Destination:
                                  </span>{" "}
                                  {formatPoint(post.destinationPoint)}
                                </div>

                                <div>
                                  <span className="font-semibold text-white">
                                    Date:
                                  </span>{" "}
                                  {post.eventDate}
                                </div>

                                <div>
                                  <span className="font-semibold text-white">
                                    Time:
                                  </span>{" "}
                                  {post.startTime} - {post.endTime}
                                </div>

                                <div>
                                  <span className="font-semibold text-white">
                                    Status:
                                  </span>{" "}
                                  <span
                                    className={
                                      isEventExpired(post)
                                        ? "text-rose-300"
                                        : post.participant?.completed
                                        ? "text-emerald-300"
                                        : post.participant?.joined
                                        ? "text-sky-300"
                                        : "text-zinc-300"
                                    }
                                  >
                                    {isEventExpired(post)
                                      ? "Expired"
                                      : post.participant?.completed
                                      ? "Completed"
                                      : post.participant?.joined
                                      ? "Joined"
                                      : "Open"}
                                  </span>
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
                                      isEventExpired(post)
                                    }
                                    onClick={() => handleVerifyEventStart(post.id)}
                                  >
                                    <Flag
                                      className={`mr-2 h-4 w-4 ${getActionIconClass(
                                        post.participant.verifiedStart ? "done" : "active"
                                      )}`}
                                    />
                                    {post.participant.verifiedStart
                                      ? "Start Verified"
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
                          No joined events yet.
                        </div>
                      ) : (
                        joinedActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4"
                          >
                            <p className="text-sm font-semibold text-white">
                              {activity.eventTitle}
                            </p>
                            <p className="mt-1 text-sm text-zinc-300">
                              {activity.eventDate} · {activity.startTime} -{" "}
                              {activity.endTime}
                            </p>
                            <p className="mt-1 text-xs leading-6 text-zinc-300">
                              {formatPoint(activity.initialPoint)} →{" "}
                              {formatPoint(activity.destinationPoint)}
                            </p>
                            <p className="mt-1 text-xs text-zinc-300">
                              Start:{" "}
                              {activity.participant?.verifiedStart ? "Verified" : "Pending"} ·
                              Completion:{" "}
                              {activity.participant?.completed ? "Done" : "Pending"}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">
                        Quick Check-In
                      </CardTitle>
                      <CardDescription className="text-sm leading-6 text-zinc-300">
                        Fast destination verification from the feed.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                        <p className="text-sm font-semibold text-white">
                          {selectedDestination.name}
                        </p>
                        <p className="mt-1 text-sm text-zinc-200">
                          {selectedDestination.location}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          className={`rounded-2xl border font-medium ${getActionStateClass(
                            checkInState.gps ? "done" : "active"
                          )}`}
                          variant="outline"
                          onClick={() =>
                            setCheckInState((prev) => ({ ...prev, gps: true }))
                          }
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
                          variant="outline"
                          onClick={() =>
                            setCheckInState((prev) => ({ ...prev, photo: true }))
                          }
                        >
                          <Camera
                            className={`mr-2 h-4 w-4 ${getActionIconClass(
                              checkInState.photo ? "done" : "active"
                            )}`}
                          />
                          {checkInState.photo ? "Photo Verified" : "Photo"}
                        </Button>
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
                  subtitle="Browse destinations with visible images, readable text, and reward and difficulty details."
                />

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
                      <div className="h-44 overflow-hidden">
                        <img
                          src={destination.imageUrl}
                          alt={destination.name}
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

            {tab === "checkin" && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                  <CardContent className="p-0">
                    <div className="h-72 overflow-hidden">
                      <img
                        src={selectedDestination.imageUrl}
                        alt={selectedDestination.name}
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
                      />

                      <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm leading-6 text-zinc-200">
                        The map shows the initial point and the destination point
                        so users can understand where they will start and where
                        they should go.
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-white">
                      Check-In UX
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
                        onClick={() =>
                          setCheckInState((prev) => ({ ...prev, gps: true }))
                        }
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
                        variant="outline"
                        onClick={() =>
                          setCheckInState((prev) => ({ ...prev, photo: true }))
                        }
                      >
                        <Camera
                          className={`mr-2 h-4 w-4 ${getActionIconClass(
                            checkInState.photo ? "done" : "active"
                          )}`}
                        />
                        {checkInState.photo ? "Photo Verified" : "Capture Live Photo"}
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
                        ? "Verification complete. GPS and live photo are confirmed. Ready to reward TRIPIX."
                        : "Complete the blue steps first. GPS and live photo are the primary proof. QR stays optional for supported destinations."}
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
                  subtitle="A balanced hiking layout with clearer trail setup, readable destination cards, and compact progress tracking."
                />

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

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Button
                          className={`rounded-2xl border font-medium ${
                            hikeSession.currentTrailheadMatched
                              ? getActionStateClass("done")
                              : getActionStateClass("active")
                          }`}
                          variant="outline"
                          onClick={handleVerifyTrailhead}
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
                            hikeSession.currentTrailheadMatched
                              ? "bg-emerald-600 text-white hover:bg-emerald-500"
                              : "bg-zinc-800 text-zinc-300"
                          }`}
                          onClick={handleStartHike}
                          disabled={!hikeSession.currentTrailheadMatched}
                        >
                          <PlayCircle className="mr-2 h-4 w-4 shrink-0" />
                          <span className="whitespace-normal break-words text-center leading-tight">
                            {hikeSession.currentTrailheadMatched
                              ? "Start Hike"
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
                        Clear, compact progress tracking without oversized text
                        blocks.
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
                                disabled={!hikeSession.active || reached}
                                onClick={() =>
                                  handleReachDestination(destination.id)
                                }
                              >
                                <span className="break-words whitespace-normal text-center leading-tight">
                                  {reached
                                    ? "Reached"
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
                            {nextTrail.name} can start if the user is already at
                            the next trailhead.
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
                        Wallet Utility Summary
                      </CardTitle>
                      <CardDescription className="text-sm leading-6 text-zinc-300">
                        Your event stake is locked at creation. 10% is burned and
                        90% becomes the reward pool.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <StatPill icon={Wallet} label="Balance" value={tokenBalance} />
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
                                        canAfford
                                          ? "bg-emerald-500/20"
                                          : "bg-zinc-700"
                                      }`}
                                    >
                                      <Icon
                                        className={`h-5 w-5 ${
                                          canAfford
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
                                      Open Create Event Page
                                    </Button>
                                  ) : (
                                    <Button
                                      className={`w-full rounded-2xl font-medium ${
                                        canAfford
                                          ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                          : "bg-zinc-700 text-zinc-400"
                                      }`}
                                      disabled={!canAfford}
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
                              Lock a large event stake. 10% is burned and 90% is
                              distributed to finishers.
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
                          Example mechanic: 300 TRIPIX stake → 30 burned → 270
                          reward pool. Only verified finishers receive rewards.
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-200">
                              Event Title
                            </label>
                            <Input
                              value={eventForm.title}
                              onChange={(e) =>
                                setEventForm((prev) => ({
                                  ...prev,
                                  title: e.target.value,
                                }))
                              }
                              placeholder="e.g. Weekend Mountain Hike"
                              className="rounded-2xl text-white"
                            />
                          </div>

                          <SelectField
                            label="Category"
                            value={eventForm.category}
                            onChange={(value) =>
                              setEventForm((prev) => ({
                                ...prev,
                                category: value as CategoryType,
                              }))
                            }
                            options={["Hiking", "Falls", "Beach", "Island"]}
                          />

                          <SelectField
                            label="Difficulty Level"
                            value={eventForm.difficulty}
                            onChange={(value) =>
                              setEventForm((prev) => ({
                                ...prev,
                                difficulty: value as DifficultyLevel,
                              }))
                            }
                            options={["Easy", "Moderate", "Hard", "Expert"]}
                          />

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-200">
                              Event Date
                            </label>
                            <div className="relative">
                              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-100" />
                              <Input
                                type="date"
                                value={eventForm.date}
                                onChange={(e) =>
                                  setEventForm((prev) => ({
                                    ...prev,
                                    date: e.target.value,
                                  }))
                                }
                                className="rounded-2xl pl-10 text-white"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-200">
                              Participant Capacity
                            </label>
                            <div className="relative">
                              <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-100" />
                              <Input
                                value={eventForm.capacity}
                                onChange={(e) =>
                                  setEventForm((prev) => ({
                                    ...prev,
                                    capacity: e.target.value,
                                  }))
                                }
                                placeholder="e.g. 20"
                                className="rounded-2xl pl-10 text-white"
                              />
                            </div>
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
                                onChange={(e) =>
                                  setEventForm((prev) => ({
                                    ...prev,
                                    startTime: e.target.value,
                                  }))
                                }
                                className="rounded-2xl pl-10 text-white"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-200">
                              End Time / Expiration
                            </label>
                            <div className="relative">
                              <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-100" />
                              <Input
                                type="time"
                                value={eventForm.endTime}
                                onChange={(e) =>
                                  setEventForm((prev) => ({
                                    ...prev,
                                    endTime: e.target.value,
                                  }))
                                }
                                className="rounded-2xl pl-10 text-white"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-200">
                              Stake Amount
                            </label>
                            <div className="relative">
                              <Wallet className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-100" />
                              <Input
                                value={eventForm.stakeAmount}
                                onChange={(e) =>
                                  setEventForm((prev) => ({
                                    ...prev,
                                    stakeAmount: e.target.value,
                                  }))
                                }
                                placeholder="e.g. 300"
                                className="rounded-2xl pl-10 text-white"
                              />
                            </div>
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
                                setEventImagePreview(previewUrl);
                              }}
                            />

                            {eventImagePreview ? (
                              <div className="overflow-hidden rounded-2xl border border-zinc-700">
                                <img
                                  src={eventImagePreview}
                                  alt="Event preview"
                                  className="h-56 w-full object-cover"
                                />
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-zinc-200">
                              Route Selection
                            </label>

                            <EventRoutePicker
                              startPoint={eventRoute.startPoint}
                              destinationPoint={eventRoute.destinationPoint}
                              onStartChange={(point) =>
                                setEventRoute((prev) => ({
                                  ...prev,
                                  startPoint: point,
                                }))
                              }
                              onDestinationChange={(point) =>
                                setEventRoute((prev) => ({
                                  ...prev,
                                  destinationPoint: point,
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-zinc-200">
                              Description
                            </label>
                            <textarea
                              value={eventForm.description}
                              onChange={(e) =>
                                setEventForm((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                              placeholder="Describe the event, route, and what participants should prepare."
                              rows={5}
                              className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-400"
                            />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                          <div className="grid gap-2 text-sm text-zinc-200 md:grid-cols-2">
                            <div>
                              <span className="font-semibold text-white">
                                Required Authority:
                              </span>{" "}
                              {getRequiredAuthorityName(eventForm.category)}
                            </div>
                            <div>
                              <span className="font-semibold text-white">
                                You Have Authority:
                              </span>{" "}
                              {hasEventAuthority(achievementsData, eventForm.category)
                                ? "Yes"
                                : "No"}
                            </div>
                            <div>
                              <span className="font-semibold text-white">
                                Minimum Stake:
                              </span>{" "}
                              {minimumStake} TRIPIX
                            </div>
                            <div>
                              <span className="font-semibold text-white">
                                Proposed Stake:
                              </span>{" "}
                              {parsedStake || 0} TRIPIX
                            </div>
                            <div>
                              <span className="font-semibold text-white">
                                10% Burn:
                              </span>{" "}
                              {stakeSettlement.burnAmount} TRIPIX
                            </div>
                            <div>
                              <span className="font-semibold text-white">
                                90% Reward Pool:
                              </span>{" "}
                              {stakeSettlement.rewardPool} TRIPIX
                            </div>
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
                              tokenBalance >= parsedStake
                                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                : "bg-zinc-700 text-zinc-400"
                            }`}
                            disabled={tokenBalance < parsedStake}
                            onClick={handleCreateEventSubmit}
                          >
                            <Flame className="mr-2 h-4 w-4" />
                            Lock {parsedStake || 0} TRIPIX and Create Event
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
                          <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-200">
                            -{item.amount} TRIPIX
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
                      <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-3xl font-semibold text-white">
                        SL
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="break-words text-3xl font-semibold leading-tight text-white md:text-4xl">
                          Sid Lloyd
                        </h2>
                        <p className="mt-2 break-words text-base leading-7 text-zinc-300">
                          Adventure traveler · Cebu
                        </p>

                        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          <StatPill icon={ImageIcon} label="Posts" value={18} />
                          <StatPill icon={MapPin} label="Places" value={12} />
                          <StatPill icon={Trophy} label="Badges" value={7} />
                        </div>
                      </div>
                    </div>
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
                        const required = getRequiredAuthorityName(category);
                        const unlocked = hasEventAuthority(achievementsData, category);

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
                        No joined events yet.
                      </div>
                    ) : (
                      joinedActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="break-words text-base font-semibold text-white">
                                {activity.eventTitle}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-zinc-300">
                                {formatPoint(activity.initialPoint)} →{" "}
                                {formatPoint(activity.destinationPoint)}
                              </p>
                              <p className="text-sm text-zinc-300">
                                {activity.eventDate} · {activity.startTime} -{" "}
                                {activity.endTime}
                              </p>
                              <p className="text-sm text-zinc-300">
                                Stake: {activity.stakeAmount} · Pool: {activity.rewardPool} ·
                                Current reward: {activity.rewardPerFinisher}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                                activity.participant?.completed
                                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                  : isEventExpired(activity)
                                  ? "border border-zinc-600 bg-zinc-700 text-zinc-300"
                                  : "border border-sky-500/30 bg-sky-500/10 text-sky-200"
                              }`}
                            >
                              {activity.participant?.completed
                                ? "Completed"
                                : isEventExpired(activity)
                                ? "Expired"
                                : "Joined"}
                            </span>
                          </div>
                        </div>
                      ))
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