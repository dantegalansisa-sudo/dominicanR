import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TrustBar from './components/TrustBar';
import Excursions from './components/Excursions';
import WhyUs from './components/WhyUs';
import Fleet from './components/Fleet';
import CtaBand from './components/CtaBand';
import Contact from './components/Contact';
import Footer from './components/Footer';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import ExcursionDetail from './components/ExcursionDetail';
import type { Excursion } from './data/excursions';
import { FLEET } from './data/fleet';

const WHATSAPP = 'https://wa.me/18292191573';

export default function App() {
  const [detail, setDetail] = useState<Excursion | null>(null);

  const requestTransfer = (vehicleSlug: string) => {
    const vehicle = FLEET.find((v) => v.slug === vehicleSlug);
    const text = `Hola, quiero cotizar un traslado en ${vehicle?.name ?? vehicleSlug}.`;
    window.open(`${WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Excursions onSelect={setDetail} />
        <WhyUs />
        <Fleet onRequest={requestTransfer} />
        <CtaBand />
        <Contact />
      </main>
      <Footer />
      <FloatingWhatsApp />
      <ExcursionDetail item={detail} onClose={() => setDetail(null)} />
    </>
  );
}
