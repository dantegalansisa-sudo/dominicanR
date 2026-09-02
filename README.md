# Dominican Routes — Premium Redesign Demo

Demo animada de una sola página para **Dominican Routes** (traslados turísticos y
excursiones en Punta Cana, República Dominicana), construida por **NEXIX Tech Studio**
para mostrar el salto visual antes del build completo.

> Referencia del sitio actual: https://dominicanroutes.com

## Stack

- React + TypeScript
- Vite
- Framer Motion
- **CSS vanilla** — sin Tailwind, a propósito
- Deploy: Vercel

## Correr en local

```bash
npm install
npm run dev
```

Build de producción:

```bash
npm run build
npm run preview
```

## Estado

| Sección | Estado |
|---|---|
| Navbar | ✅ |
| Hero + barra de búsqueda | ✅ |
| TrustBar | ⏳ |
| ¿Por Qué Elegirnos? | ⏳ |
| Flota | ⏳ |
| Excursiones | ⏳ |
| Banda CTA | ⏳ |
| Footer | ⏳ |
| WhatsApp flotante | ⏳ |

## Notas de diseño

El hero **no** replica la composición del sitio actual (foto full-bleed + tarjeta
de reserva vertical a la derecha). En su lugar usa un fondo crema editorial donde
el lettering **PUNTA CANA** del cliente forma parte del propio `<h1>` — se lee
*"Descubre Punta Cana como se debe vivir"* — y los campos de reserva viven en una
barra horizontal que cruza el borde inferior del hero.

### Assets

- `public/images/logo.png` — logo oficial del cliente, recortado, con transparencia.
- `public/images/punta-cana-lettering.webp` — lettering del cliente, recortado a los
  límites de la tinta. No tiene canal alpha: se integra con `mix-blend-mode: multiply`
  sobre el fondo crema. **Ningún ancestro debe animar `opacity` o `filter`**, porque eso
  aísla el blend group y reaparece la caja blanca.

### Accesibilidad

- `prefers-reduced-motion` respetado.
- Cursor personalizado desactivado en punteros gruesos y con movimiento reducido.
- Foco de teclado visible (`outline` coral).

---

*NEXIX Tech Studio*
