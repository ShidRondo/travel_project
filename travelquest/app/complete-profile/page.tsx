"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Camera, MapPin, Phone, Upload, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const phoneCountries = [
  { name: "Philippines", code: "+63" },
  { name: "United States", code: "+1" },
  { name: "Canada", code: "+1" },
  { name: "United Kingdom", code: "+44" },
  { name: "Australia", code: "+61" },
  { name: "Japan", code: "+81" },
  { name: "South Korea", code: "+82" },
  { name: "Singapore", code: "+65" },
];

const locationCountries = [
  "Philippines",
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Japan",
  "South Korea",
  "Singapore",
];

const philippineRegions = [
  "NCR - National Capital Region",
  "CAR - Cordillera Administrative Region",
  "Region I - Ilocos Region",
  "Region II - Cagayan Valley",
  "Region III - Central Luzon",
  "Region IV-A - CALABARZON",
  "MIMAROPA Region",
  "Region V - Bicol Region",
  "Region VI - Western Visayas",
  "Region VII - Central Visayas",
  "Region VIII - Eastern Visayas",
  "Region IX - Zamboanga Peninsula",
  "Region X - Northern Mindanao",
  "Region XI - Davao Region",
  "Region XII - SOCCSKSARGEN",
  "Region XIII - Caraga",
  "BARMM",
];

function formatLocation({
  country,
  region,
  municipality,
  barangay,
  zipCode,
}: {
  country: string;
  region: string;
  municipality: string;
  barangay: string;
  zipCode: string;
}) {
  return [barangay, municipality, region, country, zipCode]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
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

export default function CompleteProfilePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("Philippines");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+63");
  const [contactNumber, setContactNumber] = useState("");
  const [country, setCountry] = useState("Philippines");
  const [region, setRegion] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [barangay, setBarangay] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarStoragePath, setAvatarStoragePath] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const locationPreview = useMemo(
    () => formatLocation({ country, region, municipality, barangay, zipCode }),
    [barangay, country, municipality, region, zipCode]
  );

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        return;
      }

      setFullName(
        profile?.display_name ||
          profile?.full_name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          ""
      );
      setBio(profile?.bio || "");
      setBirthdate(profile?.birthdate || "");
      setGender(profile?.gender || "");
      setPhoneCountry(profile?.phone_country || "Philippines");
      setPhoneCountryCode(profile?.phone_country_code || "+63");
      setContactNumber(profile?.phone_local_number || "");
      setAvatarUrl(profile?.avatar_url || "");
      setAvatarStoragePath(profile?.avatar_storage_path || "");
      setBarangay(profile?.barangay || "");
      setMunicipality(profile?.municipality || "");
      setRegion(profile?.region || "");
      setCountry(profile?.country || "Philippines");
      setZipCode(profile?.zip_code || "");
    };

    loadUser();
  }, [router]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }

    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  const handleUploadAvatar = async (file: File) => {
    if (!userId) return;

    setUploadingAvatar(true);
    setMessage("");

    let croppedFile: File;

    try {
      croppedFile = await cropAvatarFile(file);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Avatar crop failed.");
      setUploadingAvatar(false);
      return;
    }

    const fileExt = croppedFile.name.split(".").pop() || "png";
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(filePath, croppedFile, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      setMessage(`Avatar upload failed: ${uploadError.message}`);
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(filePath);

    console.log("Saved file path:", filePath);
    console.log("Generated public URL:", data.publicUrl);

    setAvatarUrl(data.publicUrl);
    setAvatarStoragePath(filePath);
    setUploadingAvatar(false);
  };

  const handleStartCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Camera is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setCameraStream(stream);
      setMessage("");
    } catch {
      setMessage("Camera permission was blocked or no camera was found.");
    }
  };

  const handleCaptureCamera = async () => {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setMessage("Camera is still starting. Try again in a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      setMessage("Camera capture failed.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );

    if (!blob) {
      setMessage("Camera capture failed.");
      return;
    }

    const file = new File([blob], `camera-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    await handleUploadAvatar(file);
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    console.log("Saving avatar URL to profile:", avatarUrl);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: fullName.trim(),
        full_name: fullName.trim(),
        bio,
        birthdate: birthdate || null,
        gender,
        phone_country: phoneCountry,
        phone_country_code: phoneCountryCode,
        phone_local_number: contactNumber.trim(),
        country,
        region,
        municipality,
        barangay,
        zip_code: zipCode,
        avatar_url: avatarUrl,
        avatar_storage_path: avatarStoragePath,
        avatar_updated_at: avatarUrl ? new Date().toISOString() : null,
        is_profile_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/");
  };

  return (
    <main className="h-screen overflow-y-auto bg-zinc-950 px-4 py-6 text-zinc-100 md:px-6">
      <form
        onSubmit={handleSave}
        className="mx-auto grid w-full max-w-6xl gap-6 pb-10 lg:grid-cols-[0.85fr_1.15fr]"
      >
        <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5 shadow-sm md:p-6 lg:sticky lg:top-6 lg:h-fit">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-300">
            Profile Setup
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Complete your traveler profile
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Your avatar, contact number, and location help make events and
            check-ins feel more credible.
          </p>

          <div className="mt-6 rounded-3xl border border-zinc-700 bg-zinc-800 p-5">
            <div className="flex flex-col items-center text-center">
              <div className="relative h-32 w-32 overflow-hidden rounded-full border border-zinc-600 bg-zinc-900">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Profile preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserRound className="h-14 w-14 text-zinc-300" />
                  </div>
                )}
              </div>

              <h2 className="mt-4 break-words text-xl font-semibold text-white">
                {fullName || "New traveler"}
              </h2>
              <p className="mt-1 break-words text-sm text-zinc-300">
                {email || "Add your details before entering TravelQuest"}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-sky-500/40 bg-sky-500/15 px-4 py-3 text-sm font-medium text-sky-100 hover:bg-sky-500/20">
                <Upload className="h-4 w-4" />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploadingAvatar}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handleUploadAvatar(file);
                    e.target.value = "";
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleStartCamera}
                disabled={uploadingAvatar}
                className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Camera className="h-4 w-4" />
                Camera
              </button>
            </div>

            {cameraStream ? (
              <div className="mt-4 space-y-3 rounded-2xl border border-zinc-700 bg-zinc-900 p-3">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="aspect-square w-full rounded-2xl object-cover"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleCaptureCamera}
                    className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    Capture Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      cameraStream.getTracks().forEach((track) => track.stop());
                      setCameraStream(null);
                    }}
                    className="rounded-2xl border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {uploadingAvatar ? (
              <p className="mt-3 text-center text-sm text-zinc-300">
                Uploading avatar...
              </p>
            ) : null}
          </div>
        </section>

        <section className="space-y-5 rounded-[28px] border border-zinc-800 bg-zinc-900 p-5 shadow-sm md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-zinc-200">
                Full name
              </span>
              <input
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none focus:border-sky-400"
                required
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-zinc-200">Bio</span>
              <textarea
                placeholder="Tell people what kind of trips you enjoy."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none focus:border-sky-400"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-200">
                Birthdate
              </span>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none focus:border-sky-400"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-200">Gender</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none focus:border-sky-400"
                required
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>
          </div>

          <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Phone className="h-4 w-4 text-sky-300" />
              Contact number
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr]">
              <select
                value={phoneCountry}
                onChange={(e) => {
                  const selected = phoneCountries.find(
                    (item) => item.name === e.target.value
                  );
                  setPhoneCountry(e.target.value);
                  setPhoneCountryCode(selected?.code || "+63");
                }}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-sky-400"
              >
                {phoneCountries.map((item) => (
                  <option key={`${item.name}-${item.code}`} value={item.name}>
                    {item.name} {item.code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                inputMode="tel"
                placeholder="912 345 6789"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <MapPin className="h-4 w-4 text-emerald-300" />
              Location
            </div>
            <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Country</span>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-sky-400"
                  required
                >
                  {locationCountries.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Region</span>
                {country === "Philippines" ? (
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-sky-400"
                    required
                  >
                    <option value="">Select region</option>
                    {philippineRegions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="State, province, or region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-sky-400"
                    required
                  />
                )}
              </label>

              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Municipality / City</span>
                <input
                  type="text"
                  placeholder="Municipality or city"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-sky-400"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Barangay</span>
                <input
                  type="text"
                  placeholder="Barangay"
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-sky-400"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-zinc-300">ZIP code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="6000"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-sky-400"
                  required
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-3 text-sm leading-6 text-zinc-300">
              {locationPreview || "Your full location preview appears here."}
            </div>
          </div>

          {message ? (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || uploadingAvatar}
            className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save and Continue"}
          </button>
        </section>
      </form>
    </main>
  );
}
