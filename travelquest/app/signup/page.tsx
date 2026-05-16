"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const user = data.user;

      if (user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: user.id,
          display_name: fullName,
          full_name: fullName,
          bio: "",
          avatar_url: "",
          avatar_storage_path: "",
          avatar_updated_at: null,
          birthdate: null,
          gender: "",
          phone_country: "Philippines",
          phone_country_code: "+63",
          phone_local_number: "",
          country: "Philippines",
          region: "",
          municipality: "",
          barangay: "",
          zip_code: "",
          wallet_address: null,
          is_profile_complete: false,
        });

        if (profileError) {
          setMessage(profileError.message);
          setLoading(false);
          return;
        }

      }

      setMessage("Account created. You can sign in now.");
      setLoading(false);
      router.push("/login");
    } catch (err) {
      console.error(err);
      setMessage("We could not create your account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-md space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-6"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-300">
            TravelQuest
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Create your account
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Start tracking verified trips, events, badges, and TRIPIX rewards.
          </p>
        </div>

        <input
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none"
          required
        />

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        {message ? <p className="text-sm text-zinc-300">{message}</p> : null}

        <p className="text-center text-sm text-zinc-300">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-sky-300 hover:text-sky-200">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
