import { motion } from "framer-motion";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

const POINTS = [
  {
    num: "01",
    title: "NO CONFIG FILES",
    desc: "Visual controls replace JSON and YAML. Drag, click, slide. What used to be 200 lines of configuration is now a 5-minute session.",
  },
  {
    num: "02",
    title: "REAL-TIME FEEDBACK",
    desc: "Every parameter change, every agent spawn, every memory operation reflects instantly. No rebuild. No redeploy. Just results.",
  },
  {
    num: "03",
    title: "FULL STACK CONTROL",
    desc: "Memory hierarchies, reinforcement learning, vector embeddings, agent orchestration, live monitoring, and service connections. One interface.",
  },
];

const FLOW = [
  { label: "YOU", color: "#22C55E" },
  { label: "AGENTFORGE", color: "#e2e4e9" },
  { label: "AGENTS", color: "#22C55E" },
  { label: "MEMORY", color: "#3B82F6" },
  { label: "TRAINING", color: "#F59E0B" },
  { label: "VECTORS", color: "#A855F7" },
];

export default function ArchitectureSection() {
  return (
    <section className="relative py-40 md:py-56 overflow-hidden bg-forge-bg">
      {/* Subtle grid */}
      <div className="absolute inset-0 grid-bg opacity-[0.02]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-16 lg:px-24">
        {/* ---- HEADING ---- */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="mb-32 md:mb-48"
        >
          <p className="text-xs tracking-[0.3em] uppercase mb-4 font-mono text-forge-cta">
            {"// SYSTEM ARCHITECTURE"}
          </p>
          <h2 className="text-[clamp(3rem,7vw,7rem)] font-bold uppercase leading-[0.9] tracking-tight font-sans text-forge-text">
            HOW IT WORKS
          </h2>
        </motion.div>

        {/* ---- SIMPLIFIED FLOW LINE ---- */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease }}
          className="mb-40 md:mb-56 overflow-x-auto"
        >
          <div className="flex items-center gap-0 min-w-max">
            {FLOW.map((item, i) => (
              <div key={item.label} className="flex items-center">
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.12, ease }}
                  className="text-xs tracking-[0.2em] uppercase px-4 py-2.5 font-mono"
                  style={{
                    color: i === 0 ? "#080a0f" : "#e2e4e9",
                    background: i === 0 ? item.color : "transparent",
                    border: i === 0 ? "none" : "1px solid #252830",
                  }}
                >
                  {item.label}
                </motion.span>
                {i < FLOW.length - 1 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.12 + 0.1, ease }}
                    className="w-8 md:w-16 h-[1px] origin-left bg-forge-border"
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ---- KEY POINTS — stacked vertically with massive spacing ---- */}
        <div className="flex flex-col gap-24 md:gap-36">
          {POINTS.map((point) => (
            <motion.div
              key={point.num}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease }}
              className="max-w-2xl"
            >
              {/* Thin top line */}
              <div className="w-full h-[1px] mb-10 bg-forge-border" />

              <div className="flex items-start gap-8 md:gap-12">
                <span className="text-5xl md:text-6xl font-bold leading-none shrink-0 font-sans text-forge-border">
                  {point.num}
                </span>

                <div>
                  <h3 className="text-xl md:text-2xl font-bold uppercase tracking-wide mb-4 font-sans text-forge-text">
                    {point.title}
                  </h3>
                  <p className="text-sm leading-[1.8] font-mono text-forge-muted">
                    {point.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
