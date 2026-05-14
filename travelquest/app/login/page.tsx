"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    if (!user) {
      setMessage("Login failed.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_profile_complete")
      .eq("id", user.id)
      .single();

    if (profileError) {
      setMessage(profileError.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (!profile?.is_profile_complete) {
      router.push("/complete-profile");
      return;
    }

    router.push("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-6"
      >
        <h1 className="text-2xl font-semibold text-white">Login</h1>

        <input
          type="email"
          placeholder="Email"
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
          className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {message ? <p className="text-sm text-zinc-300">{message}</p> : null}

        <p className="text-center text-sm text-zinc-300">
          No account yet?{" "}
          <Link href="/signup" className="font-medium text-sky-300 hover:text-sky-200">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
