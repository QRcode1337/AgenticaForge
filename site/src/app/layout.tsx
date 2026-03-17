import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentForge — Command Your AI Army",
  description:
    "Visual command center for AI agent squads, memory systems, reinforcement learning, and vector embeddings. Built for builders who refuse to write JSON.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
