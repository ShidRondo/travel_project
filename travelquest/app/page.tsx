"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import TravelQuestMVP from "@/components/ui/TravelQuestMVP";

type Profile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_storage_path: string | null;
  avatar_updated_at: string | null;
  wallet_address: string | null;
  phone_country: string | null;
  phone_country_code: string | null;
  phone_local_number: string | null;
  country: string | null;
  region: string | null;
  municipality: string | null;
  barangay: string | null;
  zip_code: string | null;
  is_profile_complete: boolean | null;
};

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      const { user, error: userError } = await supabase.auth
        .getUser()
        .then(({ data, error }) => ({ user: data.user, error }))
        .catch((error: Error) => ({ user: null, error }));

      if (userError || !user) {
        await supabase.auth.signOut({ scope: "local" });
        router.push("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        router.push("/login");
        return;
      }

      if (!profileData.is_profile_complete) {
        router.push("/complete-profile");
        return;
      }

      setUser(user);
      setProfile(profileData);
      setLoading(false);
    };

    loadUserData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
  };

  if (loading || !user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Loading TravelQuest...
      </div>
    );
  }

  return (
    <TravelQuestMVP
      sessionUser={user}
      userProfile={profile}
      onLogout={handleLogout}
    />
  );
}
