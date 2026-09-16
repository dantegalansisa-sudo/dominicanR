import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon } from '../components/ExcursionCard';
import { useLang } from '../i18n';
import { useSettings } from '../catalog/CatalogProvider';
import { LEGAL, LEGAL_PATHS, type LegalKind } from '../legal/content';

const SITE = 'dominicanroutes.com';

/**
 * Política de privacidad y Términos y condiciones. El texto vive en
 * src/legal/content.ts; aquí solo se pinta y se rellenan los datos de
 * contacto con lo que haya en Ajustes, para que un cambio de correo o de
 * teléfono no obligue a tocar los textos legales.
 */
export default function LegalPage({ kind }: { kind: LegalKind }) {
  const { lang, t } = useLang();
  const s = useSettings();
  const doc = LEGAL[lang][kind];

  useEffect(() => {
    document.title = `${doc.title} — Dominican Routes`;
    window.scrollTo({ top: 0 });
  }, [doc.title]);

  const fill = (text: string) =>
    text.replace('{email}', s.email).replace('{phone}', s.phone).replace('{site}', SITE);

  const other: LegalKind = kind === 'privacy' ? 'terms' : 'privacy';

  return (
    <section className="section catalogue legal">
      <div className="container legal__wrap">
        <Link className="catalogue__back" to="/">
          <ArrowIcon dir="left" />
          {t.catalogue.back}
        </Link>

        <p className="eyebrow catalogue__eyebrow">{t.legal.eyebrow}</p>
        <h1 className="h1 catalogue__title">{doc.title}</h1>
        <p className="legal__updated">{doc.updated}</p>
        <p className="legal__intro">{fill(doc.intro)}</p>

        {doc.sections.map((sec) => (
          <section key={sec.heading} className="legal__section">
            <h2 className="legal__h2">{sec.heading}</h2>
            {sec.body.map((b, i) =>
              Array.isArray(b) ? (
                <ul key={i} className="legal__list">
                  {b.map((li) => (
                    <li key={li}>{fill(li)}</li>
                  ))}
                </ul>
              ) : (
                <p key={i}>{fill(b)}</p>
              ),
            )}
          </section>
        ))}

        <p className="legal__other">
          <Link to={LEGAL_PATHS[other]}>{t.legal[other]}</Link>
        </p>
      </div>
    </section>
  );
}
