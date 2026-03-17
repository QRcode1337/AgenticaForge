import { useState } from 'react'
import { useAuth } from '../../hooks/use-auth.ts'

type Mode = 'login' | 'signup'

export default function LoginModal() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const action = mode === 'login' ? signIn : signUp
    const result = await action(email, password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, auth state change will unmount this modal
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080a0f]">
      <div className="w-full max-w-sm border border-[#252830] bg-[#0f1117] font-mono">
        {/* Header */}
        <div className="border-b border-[#252830] px-6 py-4">
          <h1 className="text-center text-sm font-bold uppercase tracking-[0.2em] text-[#e2e4e9]">
            AGENT<span className="text-forge-cta">FORGE</span>
          </h1>
          <p className="mt-1 text-center text-[10px] uppercase tracking-wider text-[#484c58]">
            {mode === 'login' ? 'AUTHENTICATE' : 'CREATE ACCOUNT'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#484c58]">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full border border-[#252830] bg-[#080a0f] px-3 py-2 text-xs text-[#e2e4e9] outline-none focus:border-forge-accent"
              placeholder="operator@forge.io"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#484c58]">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-[#252830] bg-[#080a0f] px-3 py-2 text-xs text-[#e2e4e9] outline-none focus:border-forge-accent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="border border-red-500/30 bg-red-500/5 px-3 py-2 text-[10px] uppercase tracking-wider text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-forge-cta bg-transparent py-2 text-xs font-semibold uppercase tracking-wider text-forge-cta transition-colors hover:bg-forge-cta/10 disabled:opacity-40"
          >
            {loading
              ? 'PROCESSING...'
              : mode === 'login'
                ? 'LOGIN'
                : 'CREATE ACCOUNT'}
          </button>
        </form>

        {/* Toggle */}
        <div className="border-t border-[#252830] px-6 py-3 text-center">
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError(null)
            }}
            className="text-[10px] uppercase tracking-wider text-[#484c58] transition-colors hover:text-forge-accent"
          >
            {mode === 'login'
              ? 'NO ACCOUNT? CREATE ONE'
              : 'HAVE ACCOUNT? LOGIN'}
          </button>
        </div>
      </div>
    </div>
  )
}
