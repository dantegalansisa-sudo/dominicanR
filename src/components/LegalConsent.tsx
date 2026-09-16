import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import { LEGAL_PATHS } from '../legal/content';

/**
 * "Al pagar aceptas los Términos y la Política de privacidad", con los dos
 * enlaces metidos en la frase traducida. Va debajo de los botones de pago y
 * del envío sin pago.
 */
export default function LegalConsent({ className = '' }: { className?: string }) {
  const t = useT();
  const parts = t.legal.consent.split(/(\{terms\}|\{privacy\})/);
  return (
    <p className={`legal-consent ${className}`.trim()}>
      {parts.map((p, i) => {
        if (p === '{terms}')
          return (
            <Link key={i} to={LEGAL_PATHS.terms} target="_blank" rel="noopener">
              {t.legal.terms}
            </Link>
          );
        if (p === '{privacy}')
          return (
            <Link key={i} to={LEGAL_PATHS.privacy} target="_blank" rel="noopener">
              {t.legal.privacy}
            </Link>
          );
        return p;
      })}
    </p>
  );
}
