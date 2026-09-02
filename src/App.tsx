import { useCallback, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TrustBar from './components/TrustBar';
import Fleet from './components/Fleet';
import Excursions from './components/Excursions';
import WhyUs from './components/WhyUs';
import CtaBand from './components/CtaBand';
import Contact from './components/Contact';
import Footer from './components/Footer';
import FloatingCta from './components/FloatingCta';
import ExcursionDetail from './components/ExcursionDetail';
import type { Excursion } from './data/excursions';
import { FLEET } from './data/fleet';

/** What a CTA hands to the contact form when it sends the visitor there. */
export interface Prefill {
  topic: string;
  message: string;
  /** Changes on every request so repeating the same one still re-applies. */
  nonce: number;
}

export default function App() {
  const [detail, setDetail] = useState<Excursion | null>(null);
  const [prefill, setPrefill] = useState<Prefill | null>(null);

  // Every "reservar" across the page lands here: fill the form with the
  // context the visitor was looking at, then take them to it.
  const requestQuote = useCallback((topic: string, message: string) => {
    setPrefill({ topic, message, nonce: Date.now() });
    setDetail(null);
    requestAnimationFrame(() => {
      document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  const requestTransfer = useCallback(
    (vehicleSlug: string) => {
      const v = FLEET.find((x) => x.slug === vehicleSlug);
      requestQuote(
        'Traslado',
        v
          ? `Quiero cotizar un traslado en ${v.name} (${v.model}), para hasta ${v.maxPax} pasajeros.\n\nOrigen:\nDestino:\nFecha y hora:`
          : 'Quiero cotizar un traslado.',
      );
    },
    [requestQuote],
  );

  const requestExcursion = useCallback(
    (e: Excursion) => {
      requestQuote(
        'Excursión',
        `Quiero reservar "${e.name}" (${e.duration}).\n\nPersonas:\nFecha preferida:\nHotel de recogida:`,
      );
    },
    [requestQuote],
  );

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Fleet onRequest={requestTransfer} />
        <Excursions onSelect={setDetail} />
        <WhyUs />
        <CtaBand />
        <Contact prefill={prefill} />
      </main>
      <Footer />
      <FloatingCta />
      <ExcursionDetail
        item={detail}
        onClose={() => setDetail(null)}
        onReserve={requestExcursion}
      />
    </>
  );
}
