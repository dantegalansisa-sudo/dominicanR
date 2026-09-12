import { useEffect, useState } from 'react';
import { api } from '../api';
import { Field, useToast } from '../ui';

const FIELDS = [
  { key: 'phone', label: 'Teléfono', hint: 'Como se muestra en la web: +1 (829) 219-1573' },
  { key: 'whatsapp', label: 'WhatsApp', hint: 'Solo dígitos con el código de país: 18292191573' },
  { key: 'email', label: 'Correo de contacto', hint: 'El que se muestra en la web. Las reservas llegan al configurado en el servidor.' },
  { key: 'location', label: 'Ubicación', hint: 'Punta Cana, La Altagracia' },
] as const;

export default function SettingsPage({ email }: { email: string }) {
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ settings: { key: string; value: string }[] }>('/settings')
      .then((r) => setValues(Object.fromEntries(r.settings.map((s) => [s.key, s.value]))))
      .catch((e) => toast(e.message, true));
  }, [toast]);

  if (!values) return <p className="adm-empty">Cargando…</p>;

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', { settings: values });
      toast('Ajustes guardados.');
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw1.length < 10) {
      toast('La contraseña necesita 10 caracteres o más.', true);
      return;
    }
    if (pw1 !== pw2) {
      toast('Las dos contraseñas no coinciden.', true);
      return;
    }
    setPwBusy(true);
    try {
      await api.post('/users', { email, password: pw1 });
      setPw1('');
      setPw2('');
      toast('Contraseña cambiada.');
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <>
      <div className="adm__head">
        <div>
          <h1 className="adm__title">Ajustes</h1>
          <p className="adm__sub">Datos de contacto que aparecen en la web y acceso al panel.</p>
        </div>
      </div>

      <section className="adm__card">
        <h2 className="adm__card-title">Contacto</h2>
        <div className="adm-grid">
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              <input value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            </Field>
          ))}
        </div>
        <div className="adm-bar adm-bar--end">
          <button className="adm-btn adm-btn--primary" type="button" onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </section>

      <section className="adm__card">
        <h2 className="adm__card-title">Contraseña</h2>
        <p className="adm__sub" style={{ marginTop: -8, marginBottom: 12 }}>
          Sesión actual: <strong>{email}</strong>
        </p>
        <form onSubmit={changePassword} className="adm-grid">
          <Field label="Nueva contraseña" hint="Mínimo 10 caracteres.">
            <input type="password" autoComplete="new-password" value={pw1} onChange={(e) => setPw1(e.target.value)} />
          </Field>
          <Field label="Repetir contraseña">
            <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </Field>
          <div className="adm-bar adm-bar--end adm-field--full">
            <button className="adm-btn" type="submit" disabled={pwBusy}>
              {pwBusy ? 'Cambiando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
