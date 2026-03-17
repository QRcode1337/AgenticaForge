import Hero from '@/components/Hero'
import Manifesto from '@/components/Manifesto'
import Panels from '@/components/Panels'
import Architecture from '@/components/Architecture'
import GetStarted from '@/components/GetStarted'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main>
      <Hero />
      <Manifesto />
      <Panels />
      <Architecture />
      <GetStarted />
      <Footer />
    </main>
  )
}
