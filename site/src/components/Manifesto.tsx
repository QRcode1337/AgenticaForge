"use client";

import { motion } from "framer-motion";

const TICKER_TEXT =
  "SQUAD BUILDER \u00B7 MEMORY INSPECTOR \u00B7 TRAINING STUDIO \u00B7 VECTOR GALAXY \u00B7 LIVE FEED \u00B7 INTEGRATION HUB \u00B7 ";

export default function Manifesto() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundColor: "var(--bg-slab)",
        clipPath: "polygon(0 4vw, 100% 0, 100% 100%, 0 100%)",
        marginTop: "-4vw",
      }}
    >
      {/* Stripe pattern overlay */}
      <div className="stripe-pattern absolute inset-0 z-0" />

      {/* Noise overlay */}
      <div className="noise absolute inset-0 z-[1] pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 px-6 md:px-16 lg:px-24 pt-32 pb-20 max-w-[1400px] mx-auto">
        {/* --- Headline block --- */}
        <div className="mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-stroke text-[clamp(2.5rem,8vw,6rem)] font-bold uppercase leading-[0.95] tracking-tight"
            style={{
              fontFamily: "var(--font-display)",
              WebkitTextStroke: "2px var(--concrete-100)",
              color: "transparent",
            }}
          >
            STOP WRITING JSON.
          </motion.h2>

          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.12,
            }}
            className="text-[clamp(2.5rem,8vw,6rem)] font-bold uppercase leading-[0.95] tracking-tight mt-2"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--concrete-100)",
            }}
          >
            START COMMANDING AGENTS.
          </motion.h2>
        </div>

        {/* --- Animated green rule --- */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="h-[2px] w-full max-w-3xl origin-center mb-12"
          style={{ backgroundColor: "var(--signal-green)" }}
        />

        {/* --- Description paragraph --- */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          className="text-base md:text-lg leading-relaxed max-w-3xl"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--concrete-200)",
          }}
        >
          AgentForge is a visual command center for AI agent orchestration.
          Build squads, inspect memory hierarchies, train with reinforcement
          learning, explore vector embeddings in 3D, monitor live decisions,
          and connect your entire AI stack&mdash;all without touching a
          config file.
        </motion.p>
      </div>

      {/* --- Marquee ticker --- */}
      <div
        className="relative z-10 overflow-hidden border-t border-b py-4"
        style={{
          borderColor: "var(--concrete-500)",
        }}
      >
        <div className="animate-marquee flex whitespace-nowrap">
          {/* Duplicate the text so it loops seamlessly */}
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="text-sm uppercase tracking-[0.2em] mr-0"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--concrete-400)",
              }}
            >
              {TICKER_TEXT}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
