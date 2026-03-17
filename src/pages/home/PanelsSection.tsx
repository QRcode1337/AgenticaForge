import { motion } from "framer-motion";
import type { ReactNode } from "react";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface PanelData {
  number: string;
  title: string;
  tagline: string;
  description: string;
  accent: string;
  icon: ReactNode;
}

function IconGrid() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="10" height="10" />
      <rect x="16" y="2" width="10" height="10" />
      <rect x="2" y="16" width="10" height="10" />
      <rect x="16" y="16" width="10" height="10" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="14,2 26,9 14,16 2,9" />
      <polyline points="2,14 14,21 26,14" />
      <polyline points="2,19 14,26 26,19" />
    </svg>
  );
}

function IconWaveform() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="2,14 5,6 8,18 11,4 14,22 17,8 20,16 23,10 26,14" />
    </svg>
  );
}

function IconSphere() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="14" cy="14" r="12" />
      <ellipse cx="14" cy="14" rx="5" ry="12" />
      <line x1="2" y1="14" x2="26" y2="14" />
    </svg>
  );
}

function IconTerminal() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="24" height="20" />
      <polyline points="6,12 10,16 6,20" />
      <line x1="14" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function IconCircuit() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="14" cy="14" r="4" />
      <line x1="14" y1="2" x2="14" y2="10" />
      <line x1="14" y1="18" x2="14" y2="26" />
      <line x1="2" y1="14" x2="10" y2="14" />
      <line x1="18" y1="14" x2="26" y2="14" />
    </svg>
  );
}

const PANELS: PanelData[] = [
  {
    number: "01",
    title: "Squad Builder",
    tagline: "ASSEMBLE. DEPLOY. DOMINATE.",
    description:
      "Drag-and-drop canvas for building AI agent squads. Define roles, set parameters, wire connections between agents.",
    accent: "#22C55E",

    icon: <IconGrid />,
  },
  {
    number: "02",
    title: "Memory Inspector",
    tagline: "TOTAL RECALL.",
    description:
      "Three-tier memory hierarchy visualizer — HOT, WARM, COLD. Inspect individual memory patterns and optimize consolidation.",
    accent: "#3B82F6",
    icon: <IconLayers />,
  },
  {
    number: "03",
    title: "Training Studio",
    tagline: "EVOLVE OR DIE.",
    description:
      "Pick your RL algorithm — PPO, DQN, Actor-Critic, Decision Transformer. Configure hyperparameters with sliders, not spreadsheets.",
    accent: "#F59E0B",
    icon: <IconWaveform />,
  },
  {
    number: "04",
    title: "Vector Galaxy",
    tagline: "NAVIGATE THE VOID.",
    description:
      "3D embedding space visualization with gradient orbs floating in a cyber nebula. Rotate, zoom, explore clusters.",
    accent: "#A855F7",
    icon: <IconSphere />,
  },
  {
    number: "05",
    title: "Live Feed",
    tagline: "EVERY DECISION. EVERY MOMENT.",
    description:
      "Real-time terminal stream of every agent decision, tool invocation, and reward signal. Timestamped. Searchable.",
    accent: "#EF4444",
    icon: <IconTerminal />,
  },
  {
    number: "06",
    title: "Integration Hub",
    tagline: "PLUG IN. POWER UP.",
    description:
      "Connect AgentDB, claude-flow, OpenClaw, and your model providers. Status monitoring and one-click configuration.",
    accent: "#22C55E",
    icon: <IconCircuit />,
  },
];

/** Full panel box — number, icon, title, tagline, accent bar, description */
function PanelBox({ panel }: { panel: PanelData }) {
  return (
    <div className="border border-forge-border p-5 md:p-6 bg-forge-surface/40">
      <div className="flex items-center gap-4 mb-4">
        <span className="text-3xl md:text-4xl font-bold leading-none font-sans text-forge-border">
          {panel.number}
        </span>
        <div className="w-[1px] h-7 bg-forge-border" />
        <div style={{ color: panel.accent }}>{panel.icon}</div>
      </div>
      <p
        className="text-xs tracking-[0.3em] uppercase mb-2 font-mono"
        style={{ color: panel.accent }}
      >
        {panel.title}
      </p>
      <h3 className="text-base md:text-lg font-bold uppercase leading-tight mb-3 font-sans text-forge-text">
        {panel.tagline}
      </h3>
      <div
        className="w-10 h-[2px] mb-4"
        style={{ background: panel.accent, opacity: 0.5 }}
      />
      <p className="text-xs leading-[1.7] font-mono text-forge-muted">
        {panel.description}
      </p>
    </div>
  );
}

/** Single panel placed on one side of the spine */
function SpineItem({ panel, side }: { panel: PanelData; side: "left" | "right" }) {
  const isLeft = side === "left";

  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -30 : 30, y: 20 }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease }}
      className="grid grid-cols-[1fr_auto_1fr] gap-0 items-start"
    >
      {/* Left column */}
      <div
        className={isLeft ? "pr-6 md:pr-10" : ""}
        style={isLeft ? { justifySelf: "end", maxWidth: 380 } : undefined}
      >
        {isLeft && <PanelBox panel={panel} />}
      </div>

      {/* Center spine connector: dot */}
      <div className="flex flex-col items-center pt-6">
        <div
          className="w-2.5 h-2.5 shrink-0"
          style={{ background: panel.accent }}
        />
      </div>

      {/* Right column */}
      <div
        className={isLeft ? "" : "pl-6 md:pl-10"}
        style={isLeft ? undefined : { maxWidth: 380 }}
      >
        {!isLeft && <PanelBox panel={panel} />}
      </div>
    </motion.div>
  );
}

export default function PanelsSection() {
  return (
    <section className="relative py-20 md:py-32 px-6 md:px-16 lg:px-24 bg-forge-bg">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-16 md:mb-24">
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
          className="text-xs tracking-[0.3em] uppercase mb-4 font-mono text-forge-dim"
        >
          // 6 TACTICAL PANELS
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: 0.1 }}
          className="text-[clamp(3rem,7vw,7rem)] font-bold uppercase leading-[0.9] tracking-tight font-sans text-forge-text"
        >
          THE ARSENAL
        </motion.h2>
      </div>

      {/* Spine + items alternating L, R, L, R, L, R */}
      <div className="relative max-w-5xl mx-auto">
        {/* Vertical spine line */}
        <div
          className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2 bg-forge-border"
        />

        <div className="relative flex flex-col gap-12 md:gap-16">
          {PANELS.map((panel, i) => (
            <SpineItem
              key={panel.number}
              panel={panel}
              side={i % 2 === 0 ? "left" : "right"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
