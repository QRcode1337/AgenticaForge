export default function GettingStarted() {
  return (
    <section className="space-y-10">
      <div>
        <h2 className="font-sans text-2xl font-bold text-forge-text mb-4">
          Getting Started
        </h2>
        <p className="text-forge-text-soft text-sm leading-relaxed">
          AgentForge is an in-browser memory engine and swarm simulation dashboard
          built with React, TypeScript, and Tailwind. Follow the steps below to get
          a local development environment running.
        </p>
      </div>

      <div>
        <h3 className="font-sans text-lg font-semibold text-forge-text mb-3">
          Prerequisites
        </h3>
        <ul className="list-disc list-inside text-forge-text-soft text-sm space-y-1">
          <li>
            <span className="font-mono text-forge-muted">Node.js 18+</span>
          </li>
          <li>
            <span className="font-mono text-forge-muted">npm</span> or{' '}
            <span className="font-mono text-forge-muted">pnpm</span>
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-sans text-lg font-semibold text-forge-text mb-3">
          Installation
        </h3>
        <pre className="bg-forge-elevated border-l-2 border-forge-cta p-6 font-mono text-sm text-forge-text-soft overflow-x-auto rounded-none">
{`git clone https://github.com/agentforge/agentforge.git
cd agentforge
npm install
npm run dev`}
        </pre>
      </div>

      <div>
        <h3 className="font-sans text-lg font-semibold text-forge-text mb-3">
          Project Structure
        </h3>
        <pre className="bg-forge-elevated border-l-2 border-forge-cta p-6 font-mono text-sm text-forge-text-soft overflow-x-auto rounded-none">
{`agentforge/
├── src/
│   ├── components/    # UI panels
│   ├── engine/        # Memory engine core
│   ├── hooks/         # React hooks
│   ├── pages/         # Route pages
│   └── types/         # TypeScript types
├── site/              # Marketing prototype
└── package.json`}
        </pre>
      </div>

      <div>
        <h3 className="font-sans text-lg font-semibold text-forge-text mb-3">
          Development Server
        </h3>
        <p className="text-forge-text-soft text-sm leading-relaxed">
          After running{' '}
          <span className="font-mono text-forge-muted bg-forge-elevated px-1.5 py-0.5">
            npm run dev
          </span>
          , navigate to{' '}
          <span className="font-mono text-forge-cta">
            http://localhost:3001
          </span>{' '}
          to see the dashboard. The development server supports hot module replacement
          so changes appear instantly in the browser.
        </p>
      </div>
    </section>
  )
}
