"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

/* ================================================================
   AGENTFORGE HERO
   Brutalist. Massive. Intentional.
   ================================================================ */

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

function StatusBar() {
  const [agentCount, setAgentCount] = useState(0);

  useEffect(() => {
    let frame: number;
    const target = 30;
    const duration = 2000;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAgentCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    const timer = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, 1800);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 1.6, ease: EASE_OUT_EXPO }}
      className="absolute top-8 right-8 z-30 md:top-12 md:right-12"
    >
      <div
        className="border px-4 py-3 text-[10px] leading-relaxed tracking-widest uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          borderColor: "var(--concrete-500)",
          background: "rgba(5, 5, 16, 0.6)",
          backdropFilter: "blur(8px)",
          color: "var(--concrete-300)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--signal-green)" }}
          />
          <span style={{ color: "var(--signal-green)" }}>
            STATUS: OPERATIONAL
          </span>
        </div>
        <div className="mt-1" style={{ color: "var(--concrete-400)" }}>
          BUILD: v1.0.0
        </div>
        <div className="mt-0.5" style={{ color: "var(--concrete-300)" }}>
          AGENTS:{" "}
          <span style={{ color: "var(--concrete-100)" }}>{agentCount}</span>{" "}
          ACTIVE
        </div>
      </div>
    </motion.div>
  );
}

function BlinkingCursor() {
  return (
    <span
      className="animate-blink inline-block ml-1"
      style={{
        width: "0.55em",
        height: "1.1em",
        background: "var(--signal-green)",
        verticalAlign: "middle",
        marginBottom: "0.05em",
      }}
    />
  );
}

function FloatingGeometrics() {
  const { scrollYProgress } = useScroll();

  // Parallax transforms at different speeds
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -300]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -450]);
  const y4 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const rotate1 = useTransform(scrollYProgress, [0, 1], [45, 90]);
  const rotate2 = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const rotate3 = useTransform(scrollYProgress, [0, 1], [12, 60]);

  const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {/* Large hollow diamond - right side */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 1.2, delay: 1.0 }}
        style={{
          y: y1,
          rotate: rotate1,
          position: "absolute",
          top: "15%",
          right: "8%",
          width: "clamp(180px, 22vw, 340px)",
          height: "clamp(180px, 22vw, 340px)",
          border: "2px solid var(--concrete-500)",
          opacity: 0.35,
        }}
      />

      {/* Small solid square - left side, lower */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 1.0, delay: 1.3 }}
        style={{
          y: y2,
          rotate: rotate2,
          position: "absolute",
          bottom: "30%",
          left: "5%",
          width: "clamp(24px, 3vw, 48px)",
          height: "clamp(24px, 3vw, 48px)",
          border: "2px solid var(--signal-green)",
          opacity: 0.25,
        }}
      />

      {/* Horizontal line with terminal square - mid-right */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 1.0, delay: 1.1 }}
        style={{
          y: y2,
          position: "absolute",
          top: "42%",
          right: "4%",
          display: "flex",
          alignItems: "center",
          gap: 0,
          opacity: 0.3,
        }}
      >
        <div
          style={{
            width: "clamp(60px, 10vw, 140px)",
            height: "2px",
            background: "var(--concrete-400)",
          }}
        />
        <div
          style={{
            width: "8px",
            height: "8px",
            background: "var(--concrete-400)",
            flexShrink: 0,
          }}
        />
      </motion.div>

      {/* Dot grid cluster - upper left */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 1.0, delay: 1.4 }}
        style={{
          y: y3,
          position: "absolute",
          top: "18%",
          left: "12%",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "clamp(8px, 1.2vw, 14px)",
          opacity: 0.2,
        }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: "3px",
              height: "3px",
              background:
                i === 5 || i === 10
                  ? "var(--signal-green)"
                  : "var(--concrete-400)",
              borderRadius: "0",
            }}
          />
        ))}
      </motion.div>

      {/* Diagonal stripe band - lower right */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 1.2, delay: 1.2 }}
        style={{
          y: y4,
          rotate: rotate3,
          position: "absolute",
          bottom: "18%",
          right: "15%",
          width: "clamp(120px, 16vw, 260px)",
          height: "clamp(30px, 4vw, 60px)",
          opacity: 0.15,
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 6px,
            var(--concrete-400) 6px,
            var(--concrete-400) 8px
          )`,
        }}
      />

      {/* Vertical line with dot - left */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 0.8, delay: 1.5 }}
        style={{
          y: y3,
          position: "absolute",
          top: "55%",
          left: "8%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          opacity: 0.2,
        }}
      >
        <div
          style={{
            width: "4px",
            height: "4px",
            background: "var(--signal-green)",
            borderRadius: 0,
          }}
        />
        <div
          style={{
            width: "2px",
            height: "clamp(40px, 6vw, 80px)",
            background:
              "linear-gradient(to bottom, var(--concrete-400), transparent)",
          }}
        />
      </motion.div>

      {/* Small crosshair - center-right area */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 0.8, delay: 1.6 }}
        style={{
          y: y1,
          position: "absolute",
          top: "65%",
          right: "30%",
          opacity: 0.15,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "20px",
            height: "20px",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              height: "1px",
              background: "var(--concrete-300)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: "1px",
              background: "var(--concrete-300)",
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}

function ScrollIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 2.4 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3"
    >
      <span
        className="text-[10px] tracking-[0.3em] uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--concrete-400)",
        }}
      >
        SCROLL
      </span>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="flex flex-col items-center gap-1"
      >
        <div
          style={{
            width: "1px",
            height: "32px",
            background:
              "linear-gradient(to bottom, var(--concrete-400), transparent)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

function AccentLine() {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 1.4, delay: 1.0, ease: EASE_OUT_EXPO }}
      className="absolute z-20"
      style={{
        left: 0,
        top: "38%",
        width: "clamp(80px, 18vw, 260px)",
        height: "2px",
        background: "var(--signal-green)",
        transformOrigin: "left center",
        opacity: 0.7,
      }}
    />
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(headlineRef, { once: true, amount: 0.3 });

  const wordVariants = {
    hidden: { opacity: 0, y: 60 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.9,
        delay: i * 0.15 + 0.3,
        ease: EASE_OUT_EXPO,
      },
    }),
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: "var(--bg-void)" }}
    >
      {/* Grid background */}
      <div className="grid-bg absolute inset-0 opacity-[0.04]" />

      {/* Noise texture */}
      <div className="noise absolute inset-0" />

      {/* Scanlines */}
      <div className="scanlines absolute inset-0" />

      {/* Floating geometric elements */}
      <FloatingGeometrics />

      {/* Green accent line */}
      <AccentLine />

      {/* Status bar */}
      <StatusBar />

      {/* ================================================================
          MAIN CONTENT
         ================================================================ */}
      <div className="relative z-20 flex min-h-screen flex-col justify-center px-6 md:px-12 lg:px-20">
        <div ref={headlineRef} className="max-w-[90vw]">
          {/* ---- HEADLINE ---- */}
          <div
            className="select-none"
            style={{ lineHeight: 0.85, letterSpacing: "-0.04em" }}
          >
            {/* AGENT - outline/stroke */}
            <motion.div
              custom={0}
              variants={wordVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="overflow-hidden"
            >
              <h1
                className="text-stroke"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(4rem, 14vw, 12rem)",
                  fontWeight: 700,
                  lineHeight: 0.85,
                  letterSpacing: "-0.04em",
                  WebkitTextStroke: "2px var(--concrete-100)",
                  color: "transparent",
                }}
              >
                AGENT
              </h1>
            </motion.div>

            {/* FORGE - solid white */}
            <motion.div
              custom={1}
              variants={wordVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="overflow-hidden"
            >
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(4rem, 14vw, 12rem)",
                  fontWeight: 700,
                  lineHeight: 0.85,
                  letterSpacing: "-0.04em",
                  color: "var(--concrete-100)",
                }}
              >
                FORGE
              </h1>
            </motion.div>
          </div>

          {/* ---- SUBTITLE ---- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={
              isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
            }
            transition={{
              duration: 0.8,
              delay: 0.9,
              ease: EASE_OUT_EXPO,
            }}
            className="mt-6 md:mt-10"
          >
            <p
              className="text-sm md:text-base tracking-wider"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--concrete-300)",
              }}
            >
              <span style={{ color: "var(--signal-green)" }}>&gt;</span>{" "}
              COMMAND YOUR AI ARMY
              <BlinkingCursor />
            </p>
          </motion.div>

          {/* ---- SECONDARY LINE ---- */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
            className="mt-4"
          >
            <p
              className="text-xs tracking-[0.2em] uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--concrete-400)",
              }}
            >
              Visual orchestration for autonomous agent squads
            </p>
          </motion.div>
        </div>
      </div>

      {/* ================================================================
          SCROLL INDICATOR
         ================================================================ */}
      <ScrollIndicator />

      {/* ================================================================
          DIAGONAL CLIP DIVIDER
         ================================================================ */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20"
        style={{
          height: "8vw",
          minHeight: "60px",
          background: "var(--bg-slab)",
          clipPath: "polygon(0 100%, 100% 0, 100% 100%)",
        }}
      />

      {/* Thin line at the cut edge for definition */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.0, delay: 2.0 }}
        className="absolute bottom-0 left-0 right-0 z-20"
        style={{
          height: "8vw",
          minHeight: "60px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "100%",
            clipPath: "polygon(0 100%, 100% 0, 100% calc(0% + 1px), 0 calc(100% + 1px))",
            background: "var(--concrete-500)",
            opacity: 0.4,
          }}
        />
      </motion.div>
    </section>
  );
}
