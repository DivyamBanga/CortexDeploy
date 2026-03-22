"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useState } from "react";

const ParticleTerrain = dynamic(
  () => import("@/components/ParticleTerrain"),
  { ssr: false }
);

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      delay: i * 0.15,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const features = [
  "3D semantic visualization of your AI chat history.",
  "Hybrid search that finds conversations you forgot you had.",
  "Context injection via MCP — your memory, your models.",
];

const stats = [
  { value: "768D", label: "EMBEDDING DIMENSIONS" },
  { value: "< 1s", label: "SEARCH LATENCY" },
  { value: "100%", label: "LOCAL & PRIVATE" },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("You're on the list!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong.");
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* 3D Background */}
      <ParticleTerrain />

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col min-h-screen px-6 sm:px-10 lg:px-20">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col lg:flex-row items-start lg:items-center justify-center gap-8 lg:gap-16 pt-20 lg:pt-0">
          {/* Left — Headline + Sub + CTA */}
          <div className="flex-1 max-w-2xl">
            <motion.h1
              className="font-serif text-5xl sm:text-7xl lg:text-[88px] leading-[1.05] font-normal text-white tracking-tight"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
            >
              Your AI Conversations,
              <br />
              Remembered.
            </motion.h1>

            <motion.p
              className="mt-6 text-base sm:text-lg text-white/70 max-w-lg leading-relaxed font-sans"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
            >
              Explore your AI chat history in 3D. Search across every
              conversation. Inject context into new sessions.
            </motion.p>

            {/* Email Capture */}
            <motion.form
              onSubmit={handleSubmit}
              className="mt-8 flex flex-col sm:flex-row gap-3"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status !== "idle") setStatus("idle");
                }}
                placeholder="Enter your email address"
                className="h-12 flex-1 max-w-sm px-5 rounded-lg bg-white/[0.08] border border-white/[0.12] text-white placeholder:text-white/40 text-sm font-sans focus:outline-none focus:border-white/30 transition-colors"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="h-12 px-8 rounded-lg bg-white text-black font-medium text-sm font-sans hover:bg-white/90 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {status === "loading" ? "Joining..." : "Join Waitlist"}
              </button>
            </motion.form>

            {status !== "idle" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`mt-3 text-sm font-sans ${
                  status === "success" ? "text-green-400" : "text-red-400"
                }`}
              >
                {message}
              </motion.p>
            )}
          </div>

          {/* Right — Feature Bullets */}
          <div className="flex-shrink-0 lg:text-right">
            {features.map((feature, i) => (
              <motion.p
                key={i}
                className="text-sm sm:text-base text-white/60 font-sans leading-relaxed mb-3 last:mb-0"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={i + 2}
              >
                {feature}
              </motion.p>
            ))}
          </div>
        </div>

        {/* Stats Bar */}
        <motion.div
          className="pb-10 lg:pb-14 grid grid-cols-3 gap-4 max-w-5xl mx-auto w-full text-center"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={5}
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white font-sans tracking-tight">
                {stat.value}
              </p>
              <p className="mt-2 text-[10px] sm:text-xs text-white/50 uppercase tracking-[0.2em] font-sans">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
