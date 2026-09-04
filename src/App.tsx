import { useCallback, useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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
import ExcursionsPage from './pages/ExcursionsPage';
import BookingPage from './pages/BookingPage';
import type { Excursion } from './data/excursions';
import { FLEET } from './data/fleet';

/** What a CTA hands to the contact form when it sends the visitor there. */
export interface Prefill {
  topic: string;
  message: string;
  /** Changes on every request so repeating the same one still re-applies. */
  nonce: number;
}

function Home({
  prefill,
  onSelect,
  onRequestTransfer,
  onSearch,
}: {
  prefill: Prefill | null;
  onSelect: (e: Excursion) => void;
  onRequestTransfer: (slug: string) => void;
  onSearch: (topic: string, message: string) => void;
}) {
  useEffect(() => {
    document.title = 'Dominican Routes — Traslados y Excursiones en Punta Cana';
  }, []);

  return (
    <>
      <Hero onSearch={onSearch} />
      <TrustBar />
      <Fleet onRequest={onRequestTransfer} />
      <Excursions onSelect={onSelect} />
      <WhyUs />
      <CtaBand />
      <Contact prefill={prefill} />
    </>
  );
}

export default function App() {
  const [detail, setDetail] = useState<Excursion | null>(null);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Every "reservar" across the site lands here: fill the form with the
  // context the visitor was looking at, then take them to it. From the
  // catalogue page that means routing home first.
  const requestQuote = useCallback(
    (topic: string, message: string) => {
      setPrefill({ topic, message, nonce: Date.now() });
      setDetail(null);
      if (location.pathname !== '/') {
        navigate('/');
        // wait for the home route to mount before looking for the form
        window.setTimeout(() => {
          document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      } else {
        requestAnimationFrame(() => {
          document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
        });
      }
    },
    [location.pathname, navigate],
  );

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
        <Routes>
          <Route
            path="/"
            element={
              <Home
                prefill={prefill}
                onSelect={setDetail}
                onRequestTransfer={requestTransfer}
                onSearch={requestQuote}
              />
            }
          />
          <Route
            path="/excursiones"
            element={<ExcursionsPage onSelect={setDetail} />}
          />
          <Route path="/reservar" element={<BookingPage />} />
        </Routes>
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
