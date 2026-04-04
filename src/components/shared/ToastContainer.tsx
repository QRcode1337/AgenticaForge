import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast, dismissToast, type Toast, type ToastType } from '../../hooks/use-toast'

const TYPE_CONFIG: Record<ToastType, { label: string; color: string }> = {
  success: { label: 'CONFIRMED', color: '#22C55E' },
  error:   { label: 'ERROR',     color: '#EF4444' },
  warning: { label: 'WARNING',   color: '#F59E0B' },
  info:    { label: 'INFO',      color: '#3B82F7' },
}

function ToastItem({ toast: t }: { toast: Toast }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const config = TYPE_CONFIG[t.type]
  const time = new Date(t.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  useEffect(() => {
    timerRef.current = setTimeout(() => dismissToast(t.id), t.duration)
    return () => clearTimeout(timerRef.current)
  }, [t.id, t.duration])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      onClick={() => dismissToast(t.id)}
      className="cursor-pointer border border-forge-border bg-[#0f1117] p-3 font-mono min-w-[300px] max-w-[380px]"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
        <span className="text-[10px] text-forge-dim ml-auto">{time}</span>
      </div>
      <div className="text-xs text-forge-soft">{t.message}</div>
      <div
        className="h-0.5 mt-2"
        style={{
          background: `linear-gradient(90deg, ${config.color}, transparent)`,
        }}
      />
    </motion.div>
  )
}

export default function ToastContainer() {
  const { toasts } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
