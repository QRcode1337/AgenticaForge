import type {
  ActionType,
  ActionSource,
  ActionEnvelope,
  ActionResult,
  ActionHandler,
  RunLogEntry,
  ResultMessage,
} from './types.ts'
import { validatePayload, DESTRUCTIVE_ACTIONS } from './schemas.ts'

const MAX_LOG = 200

let counter = 0
function generateRunId(): string {
  return `run_${Date.now()}_${++counter}`
}

export class ActionBus {
  private handlers = new Map<ActionType, ActionHandler>()
  private runLog: RunLogEntry[] = []
  private pendingConfirmations = new Map<string, ActionEnvelope>()
  private subscribers = new Set<() => void>()

  register(action: ActionType, handler: ActionHandler): void {
    this.handlers.set(action, handler)
  }

  dispatch(
    action: ActionType,
    payload: Record<string, unknown>,
    source: ActionSource,
  ): ActionResult {
    const run_id = generateRunId()
    const isDestructive = DESTRUCTIVE_ACTIONS.has(action)

    const envelope: ActionEnvelope = {
      action,
      run_id,
      timestamp: new Date().toISOString(),
      source,
      payload,
      policy: { confirm_required: isDestructive },
    }

    // Validate payload
    const validation = validatePayload(action, payload)
    if (!validation.valid) {
      const result: ActionResult = {
        run_id,
        status: 'error',
        messages: validation.errors.map((e) => ({ type: 'ERROR' as const, text: e })),
        metrics: { latency_ms: 0 },
      }
      this.log(envelope, result)
      return result
    }

    // If destructive, return partial — needs confirmation
    if (isDestructive) {
      this.pendingConfirmations.set(run_id, envelope)
      const result: ActionResult = {
        run_id,
        status: 'partial',
        messages: [{ type: 'INFO', text: `Action "${action}" requires confirmation` }],
        metrics: { latency_ms: 0 },
      }
      this.log(envelope, result)
      return result
    }

    return this.execute(envelope)
  }

  dispatchConfirmed(run_id: string): ActionResult {
    const envelope = this.pendingConfirmations.get(run_id)
    if (!envelope) {
      return {
        run_id,
        status: 'error',
        messages: [{ type: 'ERROR', text: `No pending action found for ${run_id}` }],
        metrics: { latency_ms: 0 },
      }
    }

    this.pendingConfirmations.delete(run_id)
    return this.execute(envelope)
  }

  cancelPending(run_id: string): void {
    this.pendingConfirmations.delete(run_id)
  }

  getRunLog(): readonly RunLogEntry[] {
    return this.runLog
  }

  getRunById(run_id: string): RunLogEntry | undefined {
    return this.runLog.find((e) => e.envelope.run_id === run_id)
  }

  getLastAction(): RunLogEntry | undefined {
    return this.runLog[this.runLog.length - 1]
  }

  subscribe(cb: () => void): () => void {
    this.subscribers.add(cb)
    return () => { this.subscribers.delete(cb) }
  }

  private execute(envelope: ActionEnvelope): ActionResult {
    const handler = this.handlers.get(envelope.action)
    if (!handler) {
      const result: ActionResult = {
        run_id: envelope.run_id,
        status: 'error',
        messages: [{ type: 'ERROR', text: `No handler for action: ${envelope.action}` }],
        metrics: { latency_ms: 0 },
      }
      this.log(envelope, result)
      return result
    }

    const t0 = performance.now()
    let result: ActionResult

    try {
      result = handler(envelope)
      result.metrics.latency_ms = Math.round((performance.now() - t0) * 100) / 100
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result = {
        run_id: envelope.run_id,
        status: 'error',
        messages: [{ type: 'ERROR', text: `Handler error: ${msg}` }],
        metrics: { latency_ms: Math.round((performance.now() - t0) * 100) / 100 },
      }
    }

    // Ensure run_id is set
    result.run_id = envelope.run_id

    this.log(envelope, result)
    return result
  }

  private log(envelope: ActionEnvelope, result: ActionResult): void {
    this.runLog.push({ envelope, result })
    if (this.runLog.length > MAX_LOG) {
      this.runLog.shift()
    }
    this.notify()
  }

  private notify(): void {
    for (const cb of this.subscribers) cb()
  }
}

// ── Helper: build messages from text array ──────────────────

export function msg(type: ResultMessage['type'], text: string, data?: Record<string, unknown>): ResultMessage {
  return data ? { type, text, data } : { type, text }
}
