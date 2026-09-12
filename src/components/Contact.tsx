import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import RevealText from './RevealText';
import MagneticButton from './MagneticButton';
import { EASINGS } from '../utils/easings';
import { useT } from '../i18n';

/** Lo que recibe el operador: siempre en español, elija lo que elija el visitante. */
const TOPIC_KEYS = ['Traslado', 'Excursión', 'Grupo o evento', 'Otro'] as const;

// Keyless Google embed centred on Punta Cana — no API key, no billing account.
const MAP_SRC =
  'https://www.google.com/maps?q=Punta+Cana,+La+Altagracia,+Rep%C3%BAblica+Dominicana&z=11&output=embed';
const MAP_LINK = 'https://www.google.com/maps/place/Punta+Cana';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const Ico = ({ d }: { d: string }) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const PIN = 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z';
const PHONE =
  'M21 16.5v2.6a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3A19.3 19.3 0 0 1 4.4 12 19.6 19.6 0 0 1 1.4 3.4 2 2 0 0 1 3.4 1.2H6a2 2 0 0 1 2 1.7c.1 1 .3 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.1 9a15.5 15.5 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2Z';
const MAIL = 'M3.5 6.5h17v11h-17zM3.7 7l7.3 5.2a2 2 0 0 0 2 0L20.3 7';

export default function Contact() {
  const t = useT();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [topic, setTopic] = useState<string>(TOPIC_KEYS[0]);
  const formRef = useRef<HTMLFormElement>(null);

  const DETAILS = [
    { icon: PIN, label: t.contact.location, value: 'Punta Cana, La Altagracia', href: MAP_LINK },
    { icon: PHONE, label: t.contact.phoneLabel, value: '+1 (829) 219-1573', href: 'tel:+18292191573' },
    {
      icon: MAIL,
      label: t.contact.emailLabel,
      value: 'dominicanroutes@gmail.com',
      href: 'mailto:dominicanroutes@gmail.com',
    },
  ];

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'sending') return;

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    setStatus('sending');
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (res.ok && body.ok) {
        setStatus('sent');
        form.reset();
        setTopic(TOPIC_KEYS[0]);
      } else {
        setStatus('error');
        setError(t.contact.failed);
      }
    } catch {
      setStatus('error');
      setError(t.contact.offline);
    }
  };

  return (
    <section className="section contact" id="contacto">
      <div className="container">
        <div className="contact__head">
          <p className="eyebrow">{t.contact.eyebrow}</p>
          <RevealText key={t.code} tag="h2" className="h2 contact__title">
            {t.contact.title}
          </RevealText>
          <p className="contact__sub">{t.contact.sub}</p>
        </div>

        <div className="contact__layout">
          <motion.form
            className="form"
            ref={formRef}
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, ease: EASINGS.premium }}
            noValidate
          >
            {/* honeypot — hidden from people, irresistible to bots */}
            <div className="form__trap" aria-hidden="true">
              <label>
                {t.contact.trap}
                <input name="company" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <div className="form__row">
              <label className="form__field">
                <span>{t.contact.name}</span>
                <input name="name" required placeholder={t.contact.namePh} autoComplete="name" />
              </label>
              <label className="form__field">
                <span>{t.contact.email}</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder={t.contact.emailPh}
                  autoComplete="email"
                />
              </label>
            </div>

            <div className="form__row">
              <label className="form__field">
                <span>{t.contact.phone}</span>
                <input name="phone" placeholder={t.contact.optional} autoComplete="tel" />
              </label>
              <label className="form__field">
                <span>{t.contact.travelDate}</span>
                <input name="date" type="date" />
              </label>
            </div>

            <div className="form__field">
              <span>{t.contact.need}</span>
              <div className="form__chips" role="radiogroup" aria-label={t.contact.needAria}>
                {TOPIC_KEYS.map((key, i) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={topic === key}
                    className={`form__chip${topic === key ? ' is-on' : ''}`}
                    onClick={() => setTopic(key)}
                  >
                    {topic === key && (
                      <motion.span
                        layoutId="topic-pill"
                        className="form__chip-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    {t.contact.topics[i]}
                  </button>
                ))}
              </div>
              <input type="hidden" name="topic" value={topic} />
              {/* El operador sabe en que idioma contestar. */}
              <input type="hidden" name="lang" value={t.code} />
            </div>

            <label className="form__field">
              <span>{t.contact.message}</span>
              <textarea
                name="message"
                rows={4}
                required
                placeholder={t.contact.messagePh}
              />
            </label>

            <div className="form__submit">
              <MagneticButton
                className="btn btn--primary btn--block"
                block
                magnetStrength={0.16}
                type="submit"
                disabled={status === 'sending'}
              >
                {status === 'sending' ? t.contact.sending : t.contact.send}
                {status !== 'sending' && (
                  <Ico d="M5 12h13m0 0-5.5-5.5M18 12l-5.5 5.5" />
                )}
              </MagneticButton>
            </div>

            <AnimatePresence mode="wait">
              {status === 'sent' && (
                <motion.p
                  key="sent"
                  className="form__note form__note--ok"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Ico d="M20 6 9 17l-5-5" />
                  {t.contact.sent}
                </motion.p>
              )}
              {status === 'error' && (
                <motion.p
                  key="error"
                  className="form__note form__note--bad"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Ico d="M12 8v5m0 3h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.form>

          <motion.div
            className="contact__aside"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, delay: 0.12, ease: EASINGS.premium }}
          >
            <div className="map">
              <iframe
                title={t.contact.mapTitle}
                src={MAP_SRC}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <div className="map__veil" aria-hidden="true" />
              <a
                className="map__open"
                href={MAP_LINK}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.contact.openMap}
                <Ico d="M5 12h13m0 0-5.5-5.5M18 12l-5.5 5.5" />
              </a>
            </div>

            <ul className="contact__details">
              {DETAILS.map((d) => (
                <li key={d.label}>
                  <a href={d.href} target={d.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                    <span className="contact__ico">
                      <Ico d={d.icon} />
                    </span>
                    <span className="contact__text">
                      <span className="contact__label">{d.label}</span>
                      <strong>{d.value}</strong>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
