"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

/* ================================================================
   AGENTFORGE FOOTER
   Brutalist. Compressed. Stark.
   ================================================================ */

const LINKS = [
  { label: "DASHBOARD", href: "/dashboard" },
  { label: "DOCUMENTATION", href: "/docs" },
  { label: "GITHUB", href: "https://github.com/agentforge" },
  { label: "AGENTDB", href: "/agentdb" },
] as const;

const STATUS_ROWS = [
  { label: "STATUS", value: "OPERATIONAL", indicator: true },
  { label: "VERSION", value: "1.0.0", indicator: false },
  { label: "LICENSE", value: "MIT", indicator: false },
] as const;

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="group flex items-center gap-1.5 text-xs tracking-wider uppercase no-underline transition-colors duration-200"
      style={{
        fontFamily: "var(--font-mono)",
        color: "var(--concrete-200)",
        textDecoration: "none",
      }}
    >
      <span
        className="inline-block w-0 overflow-hidden transition-all duration-200 group-hover:w-3"
        style={{ color: "var(--signal-green)" }}
      >
        &gt;
      </span>
      <span className="group-hover:underline">{label}</span>
    </a>
  );
}

function ScrollToTop() {
  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Scroll to top"
      className="group flex h-8 w-8 items-center justify-center transition-colors duration-200"
      style={{
        border: "1px solid var(--concrete-400)",
        borderRadius: 0,
        background: "transparent",
        color: "var(--concrete-300)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--signal-green)";
        e.currentTarget.style.borderColor = "var(--signal-green)";
        e.currentTarget.style.color = "var(--bg-void)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "var(--concrete-400)";
        e.currentTarget.style.color = "var(--concrete-300)";
      }}
    >
      <span
        className="text-sm leading-none"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        &uarr;
      </span>
    </button>
  );
}

export default function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.2 });

  return (
    <motion.footer
      ref={footerRef}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      style={{ background: "var(--bg-void)" }}
    >
      {/* ---- TOP BORDER ---- */}
      <div
        className="w-full"
        style={{ height: "1px", background: "var(--concrete-500)" }}
      />

      {/* ---- MAIN CONTENT ---- */}
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {/* ---- LEFT: MONOGRAM + TAGLINE ---- */}
          <div className="flex flex-col gap-3">
            <div>
              <span
                className="text-3xl font-bold leading-none"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--concrete-100)",
                }}
              >
                AF
              </span>
              <div
                className="mt-1 text-[10px] tracking-[0.3em] uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--concrete-300)",
                }}
              >
                AGENTFORGE
              </div>
            </div>
            <p
              className="text-xs italic leading-relaxed"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--concrete-300)",
              }}
            >
              Built for builders who refuse to write JSON.
            </p>
          </div>

          {/* ---- CENTER: LINKS ---- */}
          <div className="flex flex-col gap-3">
            {LINKS.map((link) => (
              <FooterLink key={link.label} label={link.label} href={link.href} />
            ))}
          </div>

          {/* ---- RIGHT: STATUS ---- */}
          <div className="flex flex-col gap-2">
            {STATUS_ROWS.map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-4 text-xs"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span
                  className="w-16 shrink-0 tracking-wider"
                  style={{ color: "var(--concrete-400)" }}
                >
                  {row.label}
                </span>
                <span
                  className="flex items-center gap-2"
                  style={{ color: "var(--concrete-100)" }}
                >
                  {row.indicator && (
                    <span
                      className="inline-block h-1.5 w-1.5 shrink-0"
                      style={{
                        background: "var(--signal-green)",
                        borderRadius: 0,
                      }}
                    />
                  )}
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- BOTTOM DIVIDER ---- */}
      <div
        className="w-full"
        style={{ height: "1px", background: "var(--concrete-500)" }}
      />

      {/* ---- BOTTOM BAR ---- */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12 lg:px-20">
        <span
          className="text-[10px] tracking-wider uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--concrete-400)",
          }}
        >
          &copy; 2026 AGENTFORGE
        </span>

        <div className="flex items-center gap-4">
          <span
            className="text-[10px] tracking-wider uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--concrete-300)",
            }}
          >
            FORGE YOUR FUTURE
            <span
              className="animate-blink ml-0.5 inline-block"
              style={{
                width: "0.5em",
                height: "1em",
                background: "var(--signal-green)",
                verticalAlign: "middle",
                marginBottom: "1px",
              }}
            />
          </span>

          <ScrollToTop />
        </div>
      </div>
    </motion.footer>
  );
}
