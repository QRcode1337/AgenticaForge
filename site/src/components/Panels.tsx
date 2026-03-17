"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface PanelData {
  number: string;
  title: string;
  tagline: string;
  description: string;
  accent: string;
  icon: ReactNode;
}

const PANELS: PanelData[] = [
  {
    number: "01",
    title: "Squad Builder",
    tagline: "ASSEMBLE. DEPLOY. DOMINATE.",
    description:
      "Drag-and-drop canvas for building AI agent squads. Define roles, set parameters, wire connections between agents. Visual orchestration that replaces 200 lines of YAML with a 5-minute drag session.",
    accent: "#22C55E",
    icon: <IconGrid />,
  },
  {
    number: "02",
    title: "Memory Inspector",
    tagline: "TOTAL RECALL.",
    description:
      "Three-tier memory hierarchy visualizer \u2014 HOT, WARM, COLD. Watch token budgets drain in real time. Inspect individual memory patterns, optimize consolidation, and purge what you don\u2019t need.",
    accent: "#3B82F6",
    icon: <IconLayers />,
  },
  {
    number: "03",
    title: "Training Studio",
    tagline: "EVOLVE OR DIE.",
    description:
      "Pick your RL algorithm \u2014 PPO, DQN, Actor-Critic, Decision Transformer. Configure hyperparameters with sliders, not spreadsheets. Watch loss curves and reward signals update live.",
    accent: "#F59E0B",
    icon: <IconWaveform />,
  },
  {
    number: "04",
    title: "Vector Galaxy",
    tagline: "NAVIGATE THE VOID.",
    description:
      "3D embedding space visualization with gradient orbs floating in a cyber nebula. Rotate, zoom, explore clusters of memory patterns, tool actions, reward signals, and decision trees in voidspace.",
    accent: "#A855F7",
    icon: <IconSphere />,
  },
  {
    number: "05",
    title: "Live Feed",
    tagline: "EVERY DECISION. EVERY MOMENT.",
    description:
      "Real-time terminal stream of every agent decision, tool invocation, and reward signal. Filter by agent, type, or confidence. Timestamped. Searchable. Nothing escapes the feed.",
    accent: "#EF4444",
    icon: <IconTerminal />,
  },
  {
    number: "06",
    title: "Integration Hub",
    tagline: "PLUG IN. POWER UP.",
    description:
      "Connect AgentDB, claude-flow, OpenClaw, and your model providers in one dashboard. Status monitoring, credential management, and one-click configuration for your entire AI stack.",
    accent: "#22C55E",
    icon: <IconCircuit />,
  },
];

/* ================================================================
   ICONS
   ================================================================ */

function IconGrid() {
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="10" height="10" />
      <rect x="16" y="2" width="10" height="10" />
      <rect x="2" y="16" width="10" height="10" />
      <rect x="16" y="16" width="10" height="10" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="14,2 26,9 14,16 2,9" />
      <polyline points="2,14 14,21 26,14" />
      <polyline points="2,19 14,26 26,19" />
    </svg>
  );
}

function IconWaveform() {
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="2,14 5,6 8,18 11,4 14,22 17,8 20,16 23,10 26,14" />
    </svg>
  );
}

function IconSphere() {
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="14" cy="14" r="12" />
      <ellipse cx="14" cy="14" rx="5" ry="12" />
      <line x1="2" y1="14" x2="26" y2="14" />
    </svg>
  );
}

function IconTerminal() {
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="24" height="20" />
      <polyline points="6,12 10,16 6,20" />
      <line x1="14" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function IconCircuit() {
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="14" cy="14" r="4" />
      <line x1="14" y1="2" x2="14" y2="10" />
      <line x1="14" y1="18" x2="14" y2="26" />
      <line x1="2" y1="14" x2="10" y2="14" />
      <line x1="18" y1="14" x2="26" y2="14" />
    </svg>
  );
}

/* ================================================================
   SINGLE PANEL ROW — alternating left/right alignment
   Tons of negative space. One panel per visual "beat".
   ================================================================ */

function PanelRow({ panel, index }: { panel: PanelData; index: number }) {
  const isEven = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease }}
      className={`flex flex-col ${isEven ? "md:items-start" : "md:items-end"}`}
    >
      {/* Content block — never wider than 640px, floats left or right */}
      <div className="max-w-2xl">
        {/* Number + icon row */}
        <div className="flex items-center gap-5 mb-8">
          <span
            className="text-6xl md:text-7xl font-bold leading-none"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--concrete-500)",
            }}
          >
            {panel.number}
          </span>
          <div
            className="w-[1px] h-10 self-center"
            style={{ background: "var(--concrete-500)" }}
          />
          <div style={{ color: panel.accent }}>
            {panel.icon}
          </div>
        </div>

        {/* Title */}
        <p
          className="text-xs tracking-[0.3em] uppercase mb-4"
          style={{
            fontFamily: "var(--font-mono)",
            color: panel.accent,
          }}
        >
          {panel.title}
        </p>

        {/* Tagline */}
        <h3
          className="text-2xl md:text-4xl font-bold uppercase leading-tight mb-6"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--concrete-100)",
          }}
        >
          {panel.tagline}
        </h3>

        {/* Accent bar */}
        <div
          className="w-16 h-[2px] mb-8"
          style={{ background: panel.accent, opacity: 0.5 }}
        />

        {/* Description */}
        <p
          className="text-sm leading-[1.8] max-w-lg"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--concrete-300)",
          }}
        >
          {panel.description}
        </p>
      </div>
    </motion.div>
  );
}

/* ================================================================
   MAIN SECTION
   ================================================================ */

export default function Panels() {
  return (
    <section
      className="relative py-32 md:py-48 px-6 md:px-16 lg:px-24"
      style={{ backgroundColor: "var(--bg-void)" }}
    >
      {/* Section header — lots of space below */}
      <div className="max-w-7xl mx-auto mb-32 md:mb-48">
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
          className="text-xs tracking-[0.3em] uppercase mb-4"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--concrete-400)",
          }}
        >
          // 6 TACTICAL PANELS
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: 0.1 }}
          className="text-[clamp(3rem,7vw,7rem)] font-bold uppercase leading-[0.9] tracking-tight"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--concrete-100)",
          }}
        >
          THE ARSENAL
        </motion.h2>
      </div>

      {/* Panel rows — massive vertical spacing between each */}
      <div className="max-w-7xl mx-auto flex flex-col gap-32 md:gap-48">
        {PANELS.map((panel, i) => (
          <PanelRow key={panel.number} panel={panel} index={i} />
        ))}
      </div>
    </section>
  );
}
