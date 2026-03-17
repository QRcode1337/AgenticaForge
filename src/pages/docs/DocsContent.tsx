import GettingStarted from './sections/GettingStarted'
import ArchitectureDoc from './sections/ArchitectureDoc'

interface DocsContentProps {
  activeSectionId: string
}

const sectionComponents: Record<string, React.ComponentType> = {
  'getting-started': GettingStarted,
  'architecture': ArchitectureDoc,
}

function ComingSoon({ sectionId }: { sectionId: string }) {
  const label = sectionId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return (
    <section className="space-y-4">
      <h2 className="font-sans text-2xl font-bold text-forge-text">{label}</h2>
      <div className="bg-forge-surface border border-forge-border p-8 rounded-none">
        <p className="text-forge-dim font-mono text-sm">
          // Section under construction. Check back soon.
        </p>
      </div>
    </section>
  )
}

export default function DocsContent({ activeSectionId }: DocsContentProps) {
  const Section = sectionComponents[activeSectionId]

  return (
    <div className="pt-20 px-8 max-w-4xl pb-24">
      {Section ? <Section /> : <ComingSoon sectionId={activeSectionId} />}
    </div>
  )
}
