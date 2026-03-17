import { motion } from "framer-motion";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

function Line({
  prompt,
  text,
  color,
}: {
  prompt?: boolean;
  text: string;
  color?: string;
}) {
  return (
    <div className="flex">
      {prompt && (
        <span className="text-forge-cta" style={{ marginRight: "0.75em" }}>
          &gt;
        </span>
      )}
      <span
        style={{
          color: color ?? (prompt ? "#e2e4e9" : "#484c58"),
        }}
      >
        {text}
      </span>
    </div>
  );
}

export default function GetStartedSection({
  navigate,
}: {
  navigate: (r: "home" | "docs" | "dashboard") => void;
}) {
  return (
    <section className="relative py-40 md:py-56 bg-forge-surface">
      {/* Noise */}
      <div className="noise absolute inset-0 pointer-events-none" />

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-forge-border" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-16 lg:px-24">
        {/* Heading -- centered, lots of space below */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-24 md:mb-32"
        >
          <p className="text-xs tracking-[0.3em] uppercase mb-6 font-mono text-forge-dim">
            {"// 3 COMMANDS. THAT'S IT."}
          </p>
          <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-bold uppercase leading-[0.9] tracking-tight font-sans text-forge-text">
            GET STARTED
          </h2>
        </motion.div>

        {/* Single terminal block -- centered, constrained width */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15, ease }}
          className="max-w-xl mx-auto mb-24 md:mb-32"
        >
          <div className="bg-forge-elevated border-l-2 border-forge-cta">
            <pre className="p-8 text-sm leading-[2] font-mono">
              <Line prompt text="git clone agentforge" />
              <Line prompt text="cd agentforge && npm install" />
              <Line prompt text="npm run dev" />
              <Line text="" />
              <Line text="  Ready at http://localhost:3001" color="#22C55E" />
            </pre>
          </div>
        </motion.div>

        {/* CTAs -- centered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <button
            onClick={() => navigate("dashboard")}
            className="group inline-flex items-center gap-3 px-10 py-4 text-sm font-bold uppercase tracking-wider transition-all duration-200 font-sans cursor-pointer"
            style={{
              background: "#22C55E",
              color: "#080a0f",
              border: "2px solid #22C55E",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#22C55E";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#22C55E";
              e.currentTarget.style.color = "#080a0f";
            }}
          >
            LAUNCH DASHBOARD
            <span className="transition-transform duration-200 group-hover:translate-x-1">
              &rarr;
            </span>
          </button>

          <button
            onClick={() => navigate("docs")}
            className="inline-flex items-center gap-2 py-4 text-sm uppercase tracking-wider transition-colors duration-200 font-mono cursor-pointer bg-transparent border-none"
            style={{
              color: "#7a7f8d",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#22C55E";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#7a7f8d";
            }}
          >
            READ THE DOCS &rarr;
          </button>
        </motion.div>
      </div>
    </section>
  );
}
