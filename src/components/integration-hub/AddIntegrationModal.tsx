import { useState } from 'react'

interface AddIntegrationModalProps {
  onAdd: (integration: { name: string; endpoint: string; method: string; auth: string }) => void
  onClose: () => void
}

export default function AddIntegrationModal({ onAdd, onClose }: AddIntegrationModalProps) {
  const [name, setName] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [method, setMethod] = useState('GET')
  const [auth, setAuth] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!endpoint.trim()) {
      setError('Endpoint URL is required')
      return
    }
    if (!/^https?:\/\//.test(endpoint.trim())) {
      setError('Endpoint must start with http:// or https://')
      return
    }
    setError('')
    onAdd({ name: name.trim(), endpoint: endpoint.trim(), method, auth: auth.trim() })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border border-[#252830] bg-[#0f1117] font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252830] px-5 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#e2e4e9]">
            ADD CUSTOM INTEGRATION
          </h3>
          <button
            onClick={onClose}
            className="text-[#484c58] transition-colors hover:text-[#e2e4e9]"
          >
            &times;
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-3 px-5 py-4">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#484c58]">
              NAME *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My API Service"
              className="w-full border border-[#252830] bg-[#080a0f] px-3 py-2 text-xs text-[#e2e4e9] placeholder-[#484c58] outline-none focus:border-forge-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#484c58]">
              ENDPOINT URL *
            </label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.example.com/health"
              className="w-full border border-[#252830] bg-[#080a0f] px-3 py-2 text-xs text-[#e2e4e9] placeholder-[#484c58] outline-none focus:border-forge-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#484c58]">
              HTTP METHOD
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border border-[#252830] bg-[#080a0f] px-2 py-2 text-xs text-[#e2e4e9] outline-none focus:border-forge-accent"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#484c58]">
              AUTH HEADER (optional)
            </label>
            <input
              type="password"
              value={auth}
              onChange={(e) => setAuth(e.target.value)}
              placeholder="Bearer sk-..."
              className="w-full border border-[#252830] bg-[#080a0f] px-3 py-2 text-xs text-[#e2e4e9] placeholder-[#484c58] outline-none focus:border-forge-accent"
            />
          </div>

          {error && (
            <div className="border-l-2 border-[#EF4444] bg-[#080a0f] px-3 py-1.5 text-[11px] text-[#EF4444]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#252830] px-5 py-3">
          <button
            onClick={onClose}
            className="border border-[#252830] bg-transparent px-4 py-1.5 text-xs uppercase tracking-wider text-[#7a7f8d] transition-colors hover:bg-[#1a1d27]"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            className="border border-forge-cta bg-transparent px-4 py-1.5 text-xs uppercase tracking-wider text-forge-cta transition-colors hover:bg-forge-cta/10"
          >
            ADD
          </button>
        </div>
      </div>
    </div>
  )
}
