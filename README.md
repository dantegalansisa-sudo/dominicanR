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

## Formulario de contacto

El formulario envía a la bandeja del cliente mediante una Vercel Function
(`api/contact.ts`) que llama a [Resend](https://resend.com) por HTTP. No hay SDK
ni dependencias añadidas.

### Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Obligatoria | Valor |
|---|---|---|
| `RESEND_API_KEY` | sí | La clave de la cuenta de Resend |
| `CONTACT_TO` | no | Destino. Por defecto `info@dominicanroutes.com` |
| `CONTACT_FROM` | no | Remitente. Por defecto el dominio de pruebas de Resend |

Sin `RESEND_API_KEY` el endpoint responde 503 y la web muestra un aviso claro
invitando a escribir por WhatsApp, en lugar de fingir que el mensaje se envió.

Para usar un remitente propio (`reservas@dominicanroutes.com`) hay que verificar
el dominio en Resend y poner ese valor en `CONTACT_FROM`. Mientras tanto funciona
con el remitente de pruebas.

El `reply_to` del correo es la dirección del visitante, así que el cliente
responde desde su bandeja y le llega directo a quien escribió.

### Anti-spam

Campo trampa (*honeypot*) oculto a personas y visible para bots. Si viene lleno,
el endpoint responde 200 sin enviar nada, para no darle señal al bot.

## Estado

| Sección | Estado |
|---|---|
| Navbar | ✅ |
| Hero + barra de búsqueda | ✅ |
| TrustBar | ✅ cifras derivadas del catálogo |
| ¿Por Qué Elegirnos? | ✅ |
| Flota | ✅ 6 vehículos reales, selector animado |
| Excursiones | ✅ 38 del catálogo real, filtrables |
| Banda CTA | ✅ |
| Footer | ✅ |
| WhatsApp flotante | ✅ |
| Contacto + mapa | ✅ formulario conectado a correo |

### Cifras

Ninguna estadística de la página está inventada. La TrustBar y los chips del hero
se **calculan** desde `excursions.ts` y `fleet.ts` en tiempo de render: 38 excursiones,
4.7 de promedio ponderado, 45.670 reseñas declaradas y 6 tipos de vehículo. Si el
catálogo cambia, las cifras cambian solas.

### Flota

`src/data/fleet.ts` lleva los 6 vehículos que el cliente confirmó por WhatsApp, con
modelo concreto (Hyundai Grand Starex, Toyota Hiace, Chevrolet Suburban, Toyota
Coaster). Toda la flota se opera en blanco o negro.

### Excursiones

`src/data/excursions.ts` lleva las 38 excursiones reales del cliente, extraídas de
las tres páginas de `dominicanroutes.com/excursiones`. Cada una tiene una categoría
asignada a mano para poder filtrar; el sitio actual solo pagina.

Las fotos las envía el cliente. Hasta entonces cada tarjeta muestra un marcador
diseñado (trama diagonal, marca de línea distinta por categoría y la etiqueta
"Imagen próximamente"), en lugar de una foto provisional que habría que recordar
cambiar.

## Notas de diseño

El hero **no** replica la composición del sitio actual (foto full-bleed + tarjeta
de reserva vertical a la derecha). En su lugar usa un fondo crema editorial donde
el lettering **PUNTA CANA** del cliente forma parte del propio `<h1>` — se lee
*"Descubre Punta Cana como se debe vivir"* — y los campos de reserva viven en una
barra horizontal que cruza el borde inferior del hero.

### El lettering animado

El paisaje dentro de las letras **se mueve**: es un video en loop enmascarado con la
silueta del lettering del cliente. Las letras quedan fijas y el mar y las palmeras
corren por dentro.

Para lograrlo hubo que separar en dos capas lo que venía horneado en un solo PNG:

1. **La máscara.** `punta-cana-mask.png` se genera desde el `heros.png` original con
   un flood fill desde el borde sobre el blanco puro (croma ≤ 5, mínimo ≥ 248), lo que
   evita comerse la arena blanca del interior de las letras. Las cuatro contraformas
   cerradas (la **P** y las tres **A**) se detectan como componentes conexos encerrados
   y se recortan aparte. Una transformada de distancia erosiona 7 px para eliminar la
   sombra paralela del artwork y deja el borde con antialias.
2. **El fondo.** Un plano de playa recortado a la proporción del lettering, con un
   crossfade de 1 s entre el final y el principio para que el loop no salte
   (25 dB de PSNR en la costura contra 17 dB entre dos frames cualquiera).

### Assets

| Archivo | Peso | Rol |
|---|---|---|
| `images/logo.png` | 290 KB | Logo oficial del cliente, recortado, con transparencia |
| `images/punta-cana-mask.png` | 44 KB | Silueta del lettering, usada como `mask-image` |
| `images/punta-cana-poster.jpg` | 54 KB | Primer frame; se ve mientras carga el video |
| `video/punta-cana-lg.mp4` | 1.7 MB | Loop 1600×448, escritorio |
| `video/punta-cana-sm.mp4` | 491 KB | Loop 900×252, ≤ 760 px |
| `images/punta-cana-lettering.webp` | 141 KB | Artwork plano, solo fallback sin `mask-image` |

Video de fondo: [Mixkit](https://mixkit.co/free-stock-video/) (licencia libre, sin
atribución obligatoria).

> **Cuidado al tocar el hero.** El fallback sin soporte de `mask-image` muestra el
> artwork plano, que no tiene canal alpha y depende de `mix-blend-mode: multiply` para
> que su fondo casi blanco desaparezca sobre el crema. Si algún ancestro del lettering
> anima `opacity` o `filter`, aísla el blend group y reaparece la caja blanca.

### Accesibilidad

- `prefers-reduced-motion` respetado: el video del lettering se queda en el póster.
- Cursor personalizado desactivado en punteros gruesos y con movimiento reducido.
- Foco de teclado visible (`outline` coral).

---

*NEXIX Tech Studio*
