/**
 * Teléfono con prefijo de país. El público es extranjero: sin el prefijo, un
 * número escrito a la manera de casa deja al operador adivinando desde dónde
 * llamar. Va por lista y no a mano para que no llegue en cinco formatos
 * distintos.
 */

import { useT } from '../i18n';

interface Country {
  /** Código ISO, que es lo único único: varios países comparten prefijo. */
  code: string;
  dial: string;
  flag: string;
  label: string;
}

/** República Dominicana primero, y después de dónde llegan los visitantes. */
export const COUNTRIES: Country[] = [
  { code: 'DO', dial: '+1', flag: '🇩🇴', label: 'República Dominicana' },
  { code: 'US', dial: '+1', flag: '🇺🇸', label: 'Estados Unidos' },
  { code: 'CA', dial: '+1', flag: '🇨🇦', label: 'Canadá' },
  { code: 'ES', dial: '+34', flag: '🇪🇸', label: 'España' },
  { code: 'FR', dial: '+33', flag: '🇫🇷', label: 'Francia' },
  { code: 'DE', dial: '+49', flag: '🇩🇪', label: 'Alemania' },
  { code: 'GB', dial: '+44', flag: '🇬🇧', label: 'Reino Unido' },
  { code: 'IT', dial: '+39', flag: '🇮🇹', label: 'Italia' },
  { code: 'PT', dial: '+351', flag: '🇵🇹', label: 'Portugal' },
  { code: 'NL', dial: '+31', flag: '🇳🇱', label: 'Países Bajos' },
  { code: 'RU', dial: '+7', flag: '🇷🇺', label: 'Rusia' },
  { code: 'MX', dial: '+52', flag: '🇲🇽', label: 'México' },
  { code: 'AR', dial: '+54', flag: '🇦🇷', label: 'Argentina' },
  { code: 'CO', dial: '+57', flag: '🇨🇴', label: 'Colombia' },
  { code: 'CL', dial: '+56', flag: '🇨🇱', label: 'Chile' },
  { code: 'BR', dial: '+55', flag: '🇧🇷', label: 'Brasil' },
];

export const DEFAULT_COUNTRY = 'DO';

export const dialOf = (code: string) =>
  COUNTRIES.find((c) => c.code === code)?.dial ?? '+1';

export default function PhoneField({
  id,
  country,
  onCountry,
  value,
  onChange,
}: {
  id: string;
  country: string;
  onCountry: (code: string) => void;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useT();
  return (
    <div className="form__field phone">
      <label htmlFor={id}>
        <span>{t.phone.label}</span>
      </label>
      <div className="phone__row">
        <select
          className="phone__code"
          value={country}
          onChange={(e) => onCountry(e.target.value)}
          aria-label={t.phone.countryAria}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>
        <input
          id={id}
          required
          type="tel"
          inputMode="tel"
          className="phone__number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="809 234 5678"
          autoComplete="tel-national"
        />
      </div>
    </div>
  );
}
