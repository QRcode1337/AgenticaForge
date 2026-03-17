import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const LINKS = [
  { label: "DASHBOARD", action: "dashboard" as const },
  { label: "DOCUMENTATION", action: "docs" as const },
  { label: "GITHUB", href: "https://github.com/agentforge" },
  { label: "AGENTDB", action: null },
] as const;

const STATUS_ROWS = [
  { label: "STATUS", value: "OPERATIONAL", indicator: true },
  { label: "VERSION", value: "1.0.0", indicator: false },
  { label: "LICENSE", value: "MIT", indicator: false },
] as const;

function FooterLink({
  label,
  href,
  onClick,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "group flex items-center gap-1.5 text-xs tracking-wider uppercase no-underline transition-colors duration-200 font-mono text-forge-text-soft";

  const inner = (
    <>
      <span className="inline-block w-0 overflow-hidden transition-all duration-200 group-hover:w-3 text-forge-cta">
        &gt;
      </span>
      <span className="group-hover:underline">{label}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={{ textDecoration: "none" }}
      >
        {inner}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${className} bg-transparent border-none cursor-pointer p-0`}
      >
        {inner}
      </button>
    );
  }

  return (
    <span className={`${className} cursor-default`}>{inner}</span>
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
      className="group flex h-8 w-8 items-center justify-center transition-colors duration-200 cursor-pointer"
      style={{
        border: "1px solid #484c58",
        borderRadius: 0,
        background: "transparent",
        color: "#7a7f8d",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#22C55E";
        e.currentTarget.style.borderColor = "#22C55E";
        e.currentTarget.style.color = "#080a0f";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "#484c58";
        e.currentTarget.style.color = "#7a7f8d";
      }}
    >
      <span className="text-sm leading-none font-mono">&uarr;</span>
    </button>
  );
}

export default function FooterSection({
  navigate,
}: {
  navigate: (r: "home" | "docs" | "dashboard") => void;
}) {
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.2 });

  return (
    <motion.footer
      ref={footerRef}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="bg-forge-bg"
    >
      {/* ---- TOP BORDER ---- */}
      <div className="w-full h-[1px] bg-forge-border" />

      {/* ---- MAIN CONTENT ---- */}
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {/* ---- LEFT: MONOGRAM + TAGLINE ---- */}
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-3xl font-bold leading-none font-sans text-forge-text">
                AF
              </span>
              <div className="mt-1 text-[10px] tracking-[0.3em] uppercase font-mono text-forge-muted">
                AGENTFORGE
              </div>
            </div>
            <p className="text-xs italic leading-relaxed font-mono text-forge-muted">
              Built for builders who refuse to write JSON.
            </p>
          </div>

          {/* ---- CENTER: LINKS ---- */}
          <div className="flex flex-col gap-3">
            {LINKS.map((link) => {
              if (link.label === "GITHUB" && "href" in link && link.href) {
                return (
                  <FooterLink
                    key={link.label}
                    label={link.label}
                    href={link.href}
                  />
                );
              }
              if ("action" in link && link.action) {
                return (
                  <FooterLink
                    key={link.label}
                    label={link.label}
                    onClick={() => navigate(link.action as "home" | "docs" | "dashboard")}
                  />
                );
              }
              return (
                <FooterLink key={link.label} label={link.label} />
              );
            })}
          </div>

          {/* ---- RIGHT: STATUS ---- */}
          <div className="flex flex-col gap-2">
            {STATUS_ROWS.map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-4 text-xs font-mono"
              >
                <span className="w-16 shrink-0 tracking-wider text-forge-dim">
                  {row.label}
                </span>
                <span className="flex items-center gap-2 text-forge-text">
                  {row.indicator && (
                    <span
                      className="inline-block h-1.5 w-1.5 shrink-0 bg-forge-cta"
                      style={{ borderRadius: 0 }}
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
      <div className="w-full h-[1px] bg-forge-border" />

      {/* ---- BOTTOM BAR ---- */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12 lg:px-20">
        <span className="text-[10px] tracking-wider uppercase font-mono text-forge-dim">
          &copy; 2026 AGENTFORGE
        </span>

        <div className="flex items-center gap-4">
          <span className="text-[10px] tracking-wider uppercase font-mono text-forge-muted">
            FORGE YOUR FUTURE
            <span
              className="animate-blink ml-0.5 inline-block"
              style={{
                width: "0.5em",
                height: "1em",
                background: "#22C55E",
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
