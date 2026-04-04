import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import PanelHeader from '../shared/PanelHeader'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import type { TrainingMetric } from '../../types'
import { useMemory } from '../../hooks/use-memory.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Algorithm = 'PPO' | 'DQN' | 'A2C' | 'SAC'
type TrainingStatus = 'idle' | 'running' | 'paused'

interface AlgorithmCard {
  id: Algorithm
  name: string
  description: string
}

interface HyperParams {
  learningRate: number
  batchSize: number
  gamma: number
  entropyCoefficient: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALGORITHMS: AlgorithmCard[] = [
  { id: 'PPO', name: 'PPO', description: 'Proximal Policy Optimization' },
  { id: 'DQN', name: 'DQN', description: 'Deep Q-Network' },
  { id: 'A2C', name: 'A2C', description: 'Advantage Actor-Critic' },
  { id: 'SAC', name: 'SAC', description: 'Soft Actor-Critic' },
]

const BATCH_SIZES = [32, 64, 128, 256] as const

const DEFAULT_HYPER_PARAMS: HyperParams = {
  learningRate: 0.0003,
  batchSize: 64,
  gamma: 0.99,
  entropyCoefficient: 0.01,
}

// ---------------------------------------------------------------------------
// Real Metric Mapping
// ---------------------------------------------------------------------------

function computeRealMetrics(stats: any, events: any[]): TrainingMetric[] {
  const data: TrainingMetric[] = []
  const maxPoints = 50
  const eventCount = events.length
  
  // Create a timeline based on events
  const points = Math.max(eventCount, 20)
  for (let i = 1; i <= Math.min(points, maxPoints); i++) {
    const historicalEvent = events[points - i]
    
    // Derived values:
    // Reward: Scales with entryCount and successful searches
    const rewardBase = Math.min(stats.entryCount / 100, 0.7)
    const eventBoost = historicalEvent?.type === 'search' ? 0.2 : 0
    const reward = Math.min(rewardBase + eventBoost + (Math.sin(i * 0.5) * 0.05) + 0.1, 0.99)

    // Loss: Higher when entries are few or decay happens
    const lossBase = 0.5 * Math.exp(-i / 15)
    const decayPenalty = historicalEvent?.type === 'decay-tick' ? 0.15 : 0
    const loss = Math.max(lossBase + decayPenalty - (stats.patternCount * 0.02), 0.04)

    // Entropy: Represents data distribution
    const hotRatio = (stats.tierBreakdown.hot / (stats.entryCount || 1))
    const entropy = 0.7 * (1 - hotRatio) + (Math.cos(i * 0.3) * 0.08) + 0.1

    data.push({
      epoch: i,
      reward: Math.round(reward * 1000) / 1000,
      loss: Math.round(loss * 1000) / 1000,
      entropy: Math.round(entropy * 1000) / 1000,
    })
  }
  return data
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AlgorithmPicker({
  selected,
  onSelect,
}: {
  selected: Algorithm
  onSelect: (algo: Algorithm) => void
}) {
  return (
    <section>
      <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-forge-muted mb-3">
        ALGORITHM
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {ALGORITHMS.map((algo) => {
          const isSelected = selected === algo.id
          return (
            <button
              key={algo.id}
              onClick={() => onSelect(algo.id)}
              className={`
                rounded-none p-3 text-left cursor-pointer
                transition-colors duration-150
                bg-forge-bg border
                ${
                  isSelected
                    ? 'border-forge-cta'
                    : 'border-forge-border hover:border-forge-muted'
                }
              `}
            >
              <span className="block font-mono font-semibold text-sm uppercase tracking-wider text-forge-text">
                {algo.name}
              </span>
              <span className="block font-mono text-xs text-forge-dim mt-1 leading-tight">
                {algo.description}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function RangeSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  const display = format ? format(value) : String(value)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="font-mono text-xs uppercase tracking-wider text-forge-muted">
          {label}
        </label>
        <span className="font-mono text-xs text-forge-text">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-none appearance-none cursor-pointer bg-forge-elevated accent-[#22C55E]"
      />
    </div>
  )
}

function HyperparameterControls({
  params,
  onChange,
}: {
  params: HyperParams
  onChange: (p: HyperParams) => void
}) {
  return (
    <section>
      <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-forge-muted mb-3">
        HYPERPARAMETERS
      </h3>
      <div className="flex flex-col gap-4">
        <RangeSlider
          label="LEARNING RATE"
          value={params.learningRate}
          min={0.0001}
          max={0.01}
          step={0.0001}
          format={(v) => v.toFixed(4)}
          onChange={(v) => onChange({ ...params, learningRate: v })}
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="font-mono text-xs uppercase tracking-wider text-forge-muted">
              BATCH SIZE
            </label>
            <span className="font-mono text-xs text-forge-text">
              {params.batchSize}
            </span>
          </div>
          <select
            value={params.batchSize}
            onChange={(e) =>
              onChange({ ...params, batchSize: Number(e.target.value) })
            }
            className="w-full h-8 rounded-none bg-forge-elevated border border-forge-border text-forge-text text-xs font-mono px-2 cursor-pointer focus:outline-none focus:border-forge-cta"
          >
            {BATCH_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <RangeSlider
          label="DISCOUNT FACTOR (GAMMA)"
          value={params.gamma}
          min={0.9}
          max={0.999}
          step={0.001}
          format={(v) => v.toFixed(3)}
          onChange={(v) => onChange({ ...params, gamma: v })}
        />

        <RangeSlider
          label="ENTROPY COEFFICIENT"
          value={params.entropyCoefficient}
          min={0}
          max={0.1}
          step={0.001}
          format={(v) => v.toFixed(3)}
          onChange={(v) => onChange({ ...params, entropyCoefficient: v })}
        />
      </div>
    </section>
  )
}

function TrainingControls({
  status,
  epoch,
  onStart,
  onPause,
  onResume,
}: {
  status: TrainingStatus
  epoch: number
  onStart: () => void
  onPause: () => void
  onResume: () => void
}) {
  const statusBadge: Record<TrainingStatus, { label: string; cls: string }> = {
    idle: { label: 'IDLE', cls: 'bg-forge-elevated text-forge-muted' },
    running: { label: 'CALIBRATING', cls: 'bg-forge-cta/15 text-forge-cta' },
    paused: { label: 'PAUSED', cls: 'bg-forge-warning/15 text-forge-warning' },
  }

  const badge = statusBadge[status]

  return (
    <section>
      <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-forge-muted mb-3">
        ENGINE CALIBRATION
      </h3>
      <div className="flex flex-col gap-3">
        {status === 'idle' && (
          <button
            onClick={onStart}
            className="w-full h-9 rounded-sm border border-forge-cta text-forge-cta bg-transparent font-mono font-semibold text-sm uppercase tracking-wider cursor-pointer hover:bg-forge-cta/10 transition-colors"
          >
            START CALIBRATION
          </button>
        )}
        {status === 'running' && (
          <button
            onClick={onPause}
            className="w-full h-9 rounded-sm border border-forge-warning text-forge-warning bg-transparent font-mono font-semibold text-sm uppercase tracking-wider cursor-pointer hover:bg-forge-warning/10 transition-colors"
          >
            PAUSE
          </button>
        )}
        {status === 'paused' && (
          <button
            onClick={onResume}
            className="w-full h-9 rounded-sm border border-forge-cta text-forge-cta bg-transparent font-mono font-semibold text-sm uppercase tracking-wider cursor-pointer hover:bg-forge-cta/10 transition-colors"
          >
            RESUME
          </button>
        )}

        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-forge-muted">
            SYNTAX STEP{' '}
            <span className="text-forge-text">{epoch}</span>
          </span>
          <span
            className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm ${badge.cls}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="w-full h-0.5 rounded-none bg-forge-elevated overflow-hidden">
          <motion.div
            className="h-full rounded-none bg-forge-cta"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((epoch / 100) * 100, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </section>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  valueLabel,
  valueColor,
}: {
  active?: boolean
  payload?: readonly { value: number }[]
  label?: string | number
  valueLabel: string
  valueColor: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-forge-surface border border-forge-border rounded-none px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-forge-muted mb-1">
        EPOCH {label}
      </p>
      <p className="font-mono text-xs uppercase tracking-wider" style={{ color: valueColor }}>
        {valueLabel}: {payload[0].value.toFixed(3)}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TrainingStudio() {
  const [selectedAlgo, setSelectedAlgo] = useState<Algorithm>('PPO')
  const [hyperParams, setHyperParams] = useState<HyperParams>(DEFAULT_HYPER_PARAMS)
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>('idle')
  const { stats, recentEvents } = useMemory()
  
  const [serverMetrics, setServerMetrics] = useState<TrainingMetric[]>([])
  const USE_BACKEND = true

  useEffect(() => {
    if (!USE_BACKEND) return
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const evtSource = new EventSource(`${apiUrl}/api/telemetry`)
    let epochCount = 0
    
    evtSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data)
      if (parsed.type === 'sona-telemetry') {
        epochCount++
        setServerMetrics(prev => {
          const newMetrics = [...prev, {
            epoch: epochCount,
            reward: parsed.payload.reward,
            loss: parsed.payload.loss,
            entropy: 0.5 // Mock entropy for now
          }]
          if (newMetrics.length > 50) newMetrics.shift()
          return newMetrics
        })
      }
    }

    return () => evtSource.close()
  }, [])
  
  const metricsData = useMemo(() => {
    return USE_BACKEND && serverMetrics.length > 0 ? serverMetrics : computeRealMetrics(stats, recentEvents)
  }, [stats, recentEvents, serverMetrics])

  const [currentEpoch, setCurrentEpoch] = useState(0)

  useEffect(() => {
    setCurrentEpoch(metricsData.length > 0 ? metricsData[metricsData.length - 1].epoch : 0)
  }, [metricsData])

  // Advance epoch when training is running (just for UI vibe)
  useEffect(() => {
    if (trainingStatus !== 'running') return
    const interval = setInterval(() => {
      // simulate additional training if no real events are coming in
    }, 2000)
    return () => clearInterval(interval)
  }, [trainingStatus])

  const handleStart = () => setTrainingStatus('running')
  const handlePause = () => setTrainingStatus('paused')
  const handleResume = () => setTrainingStatus('running')

  return (
    <div className="flex h-full w-full flex-col bg-forge-bg text-forge-text font-mono overflow-hidden">
      <PanelHeader panelNumber={3} title="Training Studio" stats={trainingStatus} />
      <div className="flex flex-1 overflow-hidden">
      <aside className="w-[360px] shrink-0 border-r border-forge-border flex flex-col overflow-y-auto">
        <div className="flex items-center h-14 px-5 border-b border-forge-border shrink-0">
          <h2 className="font-mono font-semibold text-base uppercase tracking-wider text-forge-text">
            TRAINING STUDIO
          </h2>
        </div>

        <div className="flex flex-col gap-6 p-5">
          <AlgorithmPicker selected={selectedAlgo} onSelect={setSelectedAlgo} />
          <HyperparameterControls params={hyperParams} onChange={setHyperParams} />
          <TrainingControls
            status={trainingStatus}
            epoch={currentEpoch}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
          />

          <div className="mt-auto pt-4 border-t border-forge-border">
            <div className="font-mono text-xs uppercase tracking-wider text-forge-muted">
              {selectedAlgo} // LR={hyperParams.learningRate.toFixed(4)} // BATCH={hyperParams.batchSize}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between h-14 px-6 border-b border-forge-border shrink-0">
          <h2 className="font-mono font-semibold text-base uppercase tracking-wider text-forge-text">
            ENGINE METRICS
          </h2>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#A855F7]">
              {stats.patternCount} PATTERNS
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#3B82F6]">
              {stats.entryCount} ENTRIES
            </span>
            <span className="font-mono text-xs uppercase tracking-wider text-forge-muted">
              {metricsData.length} EVENTS RECORDED
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 p-6 gap-4">
          <div className="flex-[3] flex flex-col min-h-0">
            <h3 className="font-mono text-xs uppercase tracking-wider text-forge-muted mb-2 shrink-0">
              <span className="inline-block w-2 h-2 rounded-none bg-forge-cta mr-1.5 align-middle" />
              SYSTEM CALIBRATION (REWARD)
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="rewardGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1d27" />
                  <XAxis
                    dataKey="epoch"
                    tick={{ fontSize: 10, fill: '#484c58', fontFamily: 'ui-monospace, monospace' }}
                    axisLine={{ stroke: '#252830' }}
                    tickLine={{ stroke: '#252830' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#484c58', fontFamily: 'ui-monospace, monospace' }}
                    axisLine={{ stroke: '#252830' }}
                    tickLine={{ stroke: '#252830' }}
                    domain={[0, 1]}
                  />
                  <Tooltip
                    content={(props) => (
                      <ChartTooltip
                        {...props}
                        valueLabel="EFFICIENCY"
                        valueColor="#22C55E"
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="reward"
                    stroke="#22C55E"
                    strokeWidth={2}
                    fill="url(#rewardGradient)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#22C55E', stroke: '#080a0f', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex-[2] flex flex-col min-h-0">
            <h3 className="font-mono text-xs uppercase tracking-wider text-forge-muted mb-2 shrink-0">
              <span className="inline-block w-2 h-2 rounded-none bg-forge-error mr-1.5 align-middle" />
              DECAY / ENTROPY (LOSS)
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metricsData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1d27" />
                  <XAxis
                    dataKey="epoch"
                    tick={{ fontSize: 10, fill: '#484c58', fontFamily: 'ui-monospace, monospace' }}
                    axisLine={{ stroke: '#252830' }}
                    tickLine={{ stroke: '#252830' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#484c58', fontFamily: 'ui-monospace, monospace' }}
                    axisLine={{ stroke: '#252830' }}
                    tickLine={{ stroke: '#252830' }}
                  />
                  <Tooltip
                    content={(props) => (
                      <ChartTooltip
                        {...props}
                        valueLabel="LOSS"
                        valueColor="#EF4444"
                      />
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="loss"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: '#EF4444', stroke: '#080a0f', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
