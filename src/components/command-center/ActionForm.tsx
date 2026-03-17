import { useState } from 'react'
import type { ActionType, FieldSchema } from './types.ts'
import { ACTION_REGISTRY, validatePayload } from './schemas.ts'

const TXT = {
  fg:     '#ebdbb2',
  fg4:    '#a89984',
  gray:   '#928374',
  dim:    '#665c54',
  red:    '#fb4934',
  orange: '#fe8019',
}

interface ActionFormProps {
  action: ActionType
  onSubmit: (action: ActionType, payload: Record<string, unknown>) => void
  onCancel: () => void
}

function FormField({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldSchema
  value: string
  error: string | null
  onChange: (val: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider" style={{ color: TXT.gray }}>
        {field.label}
        {field.required && <span style={{ color: TXT.red }}> *</span>}
      </label>

      {field.type === 'select' && field.options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border bg-[#080a0f] px-3 py-2 font-mono text-xs outline-none"
          style={{ borderColor: error ? TXT.red : '#252830', color: TXT.fg }}
        >
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full border bg-[#080a0f] px-3 py-2 font-mono text-xs outline-none focus:border-forge-accent"
          style={{ borderColor: error ? TXT.red : '#252830', color: TXT.fg }}
        />
      )}

      {error && (
        <span className="mt-0.5 block font-mono text-[10px]" style={{ color: TXT.red }}>
          {error}
        </span>
      )}
    </div>
  )
}

export default function ActionForm({ action, onSubmit, onCancel }: ActionFormProps) {
  const schema = ACTION_REGISTRY.get(action)
  const fields = schema?.fields ?? []

  // Initialize draft with defaults
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of fields) {
      init[f.name] = f.default ?? ''
    }
    return init
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (name: string, value: string) => {
    setDraft((prev) => ({ ...prev, [name]: value }))
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleSubmit = () => {
    // Build payload (strip empty optional fields)
    const payload: Record<string, unknown> = {}
    for (const f of fields) {
      const val = draft[f.name]?.trim()
      if (val) {
        payload[f.name] = f.type === 'number' ? Number(val) : val
      }
    }

    const validation = validatePayload(action, payload)
    if (!validation.valid) {
      // Map errors to field names
      const fieldErrors: Record<string, string> = {}
      for (const err of validation.errors) {
        // Try to match error to field
        const matched = fields.find((f) => err.includes(f.label))
        if (matched) {
          fieldErrors[matched.name] = err
        } else {
          fieldErrors['_general'] = err
        }
      }
      setErrors(fieldErrors)
      return
    }

    onSubmit(action, payload)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md border border-[#252830] bg-[#0f1117] font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252830] px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: TXT.fg }}>
              {action.replace(/_/g, ' ')}
            </h3>
            {schema && (
              <span className="text-[10px]" style={{ color: TXT.gray }}>
                {schema.description}
              </span>
            )}
          </div>
          <button
            onClick={onCancel}
            className="transition-colors hover:text-[#e2e4e9]"
            style={{ color: TXT.dim }}
          >
            &times;
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-3 px-5 py-4">
          {fields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={draft[field.name] ?? ''}
              error={errors[field.name] ?? null}
              onChange={(val) => handleChange(field.name, val)}
            />
          ))}

          {errors['_general'] && (
            <div className="font-mono text-[11px]" style={{ color: TXT.red }}>
              {errors['_general']}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#252830] px-5 py-3">
          <button
            onClick={onCancel}
            className="border border-[#252830] bg-transparent px-4 py-1.5 text-xs uppercase tracking-wider transition-colors hover:bg-[#1a1d27]"
            style={{ color: TXT.fg4 }}
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            className="border border-forge-cta bg-transparent px-4 py-1.5 text-xs uppercase tracking-wider text-forge-cta transition-colors hover:bg-forge-cta/10"
          >
            EXECUTE
          </button>
        </div>
      </div>
    </div>
  )
}
