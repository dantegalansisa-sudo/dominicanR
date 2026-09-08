import { useCallback, useEffect, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
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
import ExcursionBookingPage from './pages/ExcursionBookingPage';
import type { Excursion } from './data/excursions';

function Home({
  onSelect,
  onRequestTransfer,
}: {
  onSelect: (e: Excursion) => void;
  onRequestTransfer: (slug: string) => void;
}) {
  useEffect(() => {
    document.title = 'Dominican Routes — Traslados y Excursiones en Punta Cana';
  }, []);

  return (
    <>
      <Hero />
      <TrustBar />
      <Fleet onRequest={onRequestTransfer} />
      <Excursions onSelect={onSelect} />
      <WhyUs />
      <CtaBand />
      <Contact />
    </>
  );
}

export default function App() {
  const [detail, setDetail] = useState<Excursion | null>(null);
  const navigate = useNavigate();

  const requestTransfer = useCallback(
    (vehicleSlug: string) => {
      navigate('/reservar', { state: { vehicle: vehicleSlug } });
    },
    [navigate],
  );

  // Antes esto precargaba el formulario de contacto con un texto suelto. Las
  // excursiones tienen ahora su propia pagina, igual que los traslados, para
  // poder pedir los tramos de edad de los que depende el precio.
  const requestExcursion = useCallback(
    (e: Excursion) => {
      setDetail(null);
      navigate('/reservar-excursion', { state: { slug: e.slug } });
    },
    [navigate],
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
                onSelect={setDetail}
                onRequestTransfer={requestTransfer}
              />
            }
          />
          <Route
            path="/excursiones"
            element={<ExcursionsPage onSelect={setDetail} />}
          />
          <Route path="/reservar" element={<BookingPage />} />
          <Route path="/reservar-excursion" element={<ExcursionBookingPage />} />
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
