import { motion, AnimatePresence } from 'framer-motion'
import type { RunLogEntry } from './types.ts'

const TXT = {
  fg:     '#ebdbb2',
  fg2:    '#d5c4a1',
  fg4:    '#a89984',
  gray:   '#928374',
  dim:    '#665c54',
  red:    '#fb4934',
  green:  '#b8bb26',
  yellow: '#fabd2f',
  blue:   '#83a598',
  aqua:   '#8ec07c',
  orange: '#fe8019',
}

const STATUS_COLORS: Record<string, string> = {
  ok:      TXT.green,
  error:   TXT.red,
  partial: TXT.yellow,
}

const MSG_COLORS: Record<string, string> = {
  INFO:     TXT.fg,
  ERROR:    TXT.red,
  MEMORY:   TXT.aqua,
  TOOL:     TXT.green,
  DECISION: TXT.yellow,
  REWARD:   TXT.orange,
}

interface RunDetailDrawerProps {
  entry: RunLogEntry | null
  onClose: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(60, 56, 54, 0.3)' }}>
      <h4
        className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider"
        style={{ color: TXT.fg4 }}
      >
        {title}
      </h4>
      {children}
    </div>
  )
}

function DataRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between font-mono text-[11px]">
      <span style={{ color: TXT.gray }}>{label}</span>
      <span style={{ color: color ?? TXT.fg }}>{value}</span>
    </div>
  )
}

export default function RunDetailDrawer({ entry, onClose }: RunDetailDrawerProps) {
  return (
    <AnimatePresence>
      {entry && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed top-0 right-0 z-50 flex h-full w-[420px] flex-col overflow-hidden border-l bg-forge-surface font-mono"
            style={{ borderColor: 'rgba(60, 56, 54, 0.5)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div
              className="flex flex-shrink-0 items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(60, 56, 54, 0.4)' }}
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: TXT.fg }}>
                  RUN DETAIL
                </span>
                <div className="mt-0.5 text-[10px]" style={{ color: TXT.blue }}>
                  {entry.envelope.run_id}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-lg transition-colors hover:text-white"
                style={{ color: TXT.dim }}
              >
                &times;
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Request */}
              <Section title="REQUEST">
                <div className="space-y-1">
                  <DataRow label="Action" value={entry.envelope.action} color={TXT.orange} />
                  <DataRow label="Source" value={entry.envelope.source} />
                  <DataRow
                    label="Timestamp"
                    value={new Date(entry.envelope.timestamp).toLocaleTimeString()}
                  />
                  <DataRow
                    label="Destructive"
                    value={entry.envelope.policy.confirm_required ? 'YES' : 'NO'}
                    color={entry.envelope.policy.confirm_required ? TXT.red : TXT.dim}
                  />
                </div>

                {Object.keys(entry.envelope.payload).length > 0 && (
                  <div className="mt-2">
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: TXT.gray }}>
                      Payload
                    </span>
                    <pre
                      className="mt-1 overflow-x-auto border p-2 text-[11px] leading-relaxed"
                      style={{
                        color: TXT.fg2,
                        borderColor: 'rgba(60, 56, 54, 0.3)',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                      }}
                    >
                      {JSON.stringify(entry.envelope.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </Section>

              {/* Response */}
              <Section title="RESPONSE">
                <div className="mb-2">
                  <span
                    className="inline-block border px-2 py-0.5 text-[10px] font-bold uppercase"
                    style={{
                      color: STATUS_COLORS[entry.result.status] ?? TXT.fg,
                      borderColor: STATUS_COLORS[entry.result.status] ?? TXT.dim,
                    }}
                  >
                    {entry.result.status}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {entry.result.messages.map((m, i) => (
                    <div key={i}>
                      <div className="flex items-start gap-2 text-[11px]">
                        <span
                          className="flex-shrink-0 text-[9px] font-bold"
                          style={{ color: MSG_COLORS[m.type] ?? TXT.fg, minWidth: '48px' }}
                        >
                          {m.type}
                        </span>
                        <span style={{ color: MSG_COLORS[m.type] ?? TXT.fg }}>
                          {m.text}
                        </span>
                      </div>
                      {m.data && (
                        <pre
                          className="ml-14 mt-1 overflow-x-auto border p-2 text-[10px] leading-relaxed"
                          style={{
                            color: TXT.fg2,
                            borderColor: 'rgba(60, 56, 54, 0.3)',
                            backgroundColor: 'rgba(0,0,0,0.2)',
                          }}
                        >
                          {JSON.stringify(m.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </Section>

              {/* Timing */}
              <Section title="TIMING">
                <DataRow
                  label="Latency"
                  value={`${entry.result.metrics.latency_ms}ms`}
                  color={
                    entry.result.metrics.latency_ms < 10 ? TXT.green
                      : entry.result.metrics.latency_ms < 100 ? TXT.yellow
                      : TXT.red
                  }
                />
                {/* Latency bar */}
                <div className="mt-2 h-1.5 w-full overflow-hidden bg-forge-elevated">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.min(100, entry.result.metrics.latency_ms / 2)}%`,
                      backgroundColor:
                        entry.result.metrics.latency_ms < 10 ? TXT.green
                          : entry.result.metrics.latency_ms < 100 ? TXT.yellow
                          : TXT.red,
                    }}
                  />
                </div>
              </Section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
