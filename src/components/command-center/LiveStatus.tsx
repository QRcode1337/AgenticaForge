import { useMemo } from 'react'
import type { EngineStats, TierBreakdown } from '../../engine/types.ts'
import type { SwarmSnapshot } from '../../hooks/use-swarm.ts'
import type { RunLogEntry } from './types.ts'

const TXT = {
  fg:     '#ebdbb2',
  fg4:    '#a89984',
  gray:   '#928374',
  dim:    '#665c54',
  green:  '#b8bb26',
  yellow: '#fabd2f',
  aqua:   '#8ec07c',
  orange: '#fe8019',
}

interface LiveStatusProps {
  stats: EngineStats
  tierBreakdown: TierBreakdown
  swarm: SwarmSnapshot
  lastAction: RunLogEntry | undefined
}

export default function LiveStatus({ stats, tierBreakdown, swarm, lastAction }: LiveStatusProps) {
  const byStatus = useMemo(() => {
    const s = { pending: 0, active: 0, completed: 0, error: 0 }
    for (const a of swarm.agents) s[a.status]++
    return s
  }, [swarm.agents])

  const tierTotal = tierBreakdown.total || 1
  const hotPct = Math.round((tierBreakdown.hot.length / tierTotal) * 100)
  const warmPct = Math.round((tierBreakdown.warm.length / tierTotal) * 100)
  const coldPct = 100 - hotPct - warmPct

  return (
    <div className="border p-3" style={{ borderColor: 'rgba(60, 56, 54, 0.4)' }}>
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: TXT.fg4 }}>
        LIVE STATUS
      </span>

      {/* Engine */}
      <div className="mt-3 space-y-1">
        <div className="flex justify-between font-mono text-[11px]">
          <span style={{ color: TXT.gray }}>Entries</span>
          <span style={{ color: TXT.fg }}>{stats.entryCount}</span>
        </div>
        <div className="flex justify-between font-mono text-[11px]">
          <span style={{ color: TXT.gray }}>HNSW Layers</span>
          <span style={{ color: TXT.fg }}>{stats.hnswLayers}</span>
        </div>
        <div className="flex justify-between font-mono text-[11px]">
          <span style={{ color: TXT.gray }}>Patterns</span>
          <span style={{ color: TXT.fg }}>{stats.patternCount}</span>
        </div>
        <div className="flex justify-between font-mono text-[11px]">
          <span style={{ color: TXT.gray }}>Vectors</span>
          <span style={{ color: TXT.fg }}>{stats.vectorDimensions}</span>
        </div>
      </div>

      {/* Tier bar */}
      <div className="mt-3">
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: TXT.gray }}>
          Tier Distribution
        </span>
        <div className="mt-1 flex h-2 w-full overflow-hidden">
          <div style={{ width: `${hotPct}%`, backgroundColor: TXT.green }} />
          <div style={{ width: `${warmPct}%`, backgroundColor: TXT.yellow }} />
          <div style={{ width: `${coldPct}%`, backgroundColor: TXT.gray }} />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[9px]">
          <span style={{ color: TXT.green }}>HOT {tierBreakdown.hot.length}</span>
          <span style={{ color: TXT.yellow }}>WARM {tierBreakdown.warm.length}</span>
          <span style={{ color: TXT.gray }}>COLD {tierBreakdown.cold.length}</span>
        </div>
      </div>

      {/* Swarm */}
      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(60, 56, 54, 0.3)' }}>
        <div className="flex justify-between font-mono text-[11px]">
          <span style={{ color: TXT.gray }}>Swarm</span>
          <span style={{ color: swarm.running ? TXT.green : TXT.dim }}>
            {swarm.running ? 'RUNNING' : 'IDLE'}
          </span>
        </div>
        <div className="flex justify-between font-mono text-[11px]">
          <span style={{ color: TXT.gray }}>Phase</span>
          <span style={{ color: TXT.fg }}>{swarm.phase}</span>
        </div>
        <div className="flex justify-between font-mono text-[11px]">
          <span style={{ color: TXT.gray }}>Active</span>
          <span style={{ color: byStatus.active > 0 ? TXT.aqua : TXT.dim }}>
            {byStatus.active}/{swarm.agents.length}
          </span>
        </div>
        <div className="flex justify-between font-mono text-[11px]">
          <span style={{ color: TXT.gray }}>Completed</span>
          <span style={{ color: TXT.fg }}>{byStatus.completed}/{swarm.agents.length}</span>
        </div>
      </div>

      {/* Last Action */}
      {lastAction && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(60, 56, 54, 0.3)' }}>
          <div className="flex justify-between font-mono text-[11px]">
            <span style={{ color: TXT.gray }}>Last Action</span>
            <span
              className="text-[10px] font-bold"
              style={{
                color: lastAction.result.status === 'ok' ? TXT.green
                  : lastAction.result.status === 'error' ? TXT.orange
                  : TXT.yellow,
              }}
            >
              {lastAction.result.status.toUpperCase()}
            </span>
          </div>
          <div className="mt-0.5 truncate font-mono text-[10px]" style={{ color: TXT.fg4 }}>
            {lastAction.envelope.action}
          </div>
          <div className="font-mono text-[9px]" style={{ color: TXT.dim }}>
            {new Date(lastAction.envelope.timestamp).toLocaleTimeString()}
            {' \u00b7 '}
            {lastAction.result.metrics.latency_ms}ms
          </div>
        </div>
      )}
    </div>
  )
}
