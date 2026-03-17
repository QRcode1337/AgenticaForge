import { useState } from 'react'
import DocsSidebar from './docs/DocsSidebar'
import DocsContent from './docs/DocsContent'

export default function DocsPage() {
  const [activeSectionId, setActiveSectionId] = useState('getting-started')

  return (
    <div className="min-h-screen bg-forge-bg">
      <DocsSidebar activeSectionId={activeSectionId} onSectionChange={setActiveSectionId} />
      <div className="ml-60">
        <DocsContent activeSectionId={activeSectionId} />
      </div>
    </div>
  )
}
