# Integración Google Places — notas de trabajo

Estado: **integracion construida y verificada en local.**
Falta poner la variable en Vercel y regenerar la key. Ver secciones 8 y 9.
Última actualización: 2026-09-06

---

## 1. Qué pidió el cliente

Mensaje del cliente (vía WhatsApp, resumido): quiere integración con Google para
capturar **el destino exacto** al que se dirige el pasajero y **el punto exacto
del que sale**, limitado al **mapa de República Dominicana**.

El problema real que resuelve: hoy el campo de origen/destino es una lista fija
de 7 aeropuertos + 16 zonas hoteleras, con texto libre como respaldo. Cuando
alguien escribe "Hotel Riu, calle X" a mano, el conductor no tiene un punto
concreto al que ir. Con Places guardamos coordenadas.

El tema del **panel de administración** quedó **despriorizado** por decisión de
Dante — no se trabaja por ahora.

---

## 2. Qué necesitamos del cliente (esto bloquea todo)

| # | Requisito | Estado |
|---|---|---|
| 1 | Cuenta de Google Cloud **con facturación activa** (tarjeta del cliente, no nuestra) | Pendiente |
| 2 | Habilitar **Places API (New)** en el proyecto | Pendiente |
| 3 | Crear la API key con las restricciones de abajo | Pendiente |
| 4 | Enviarnos la key | Pendiente |

La cuenta tiene que ser del cliente: la key queda ligada a su tarjeta y él debe
poder ver el consumo y revocarla sin depender de nosotros.

### Restricciones obligatorias de la key

| Restricción | Valor |
|---|---|
| Referentes HTTP | `dominicanroutes.com/*`, `*.vercel.app/*` |
| APIs permitidas | Solo **Places API (New)** |

**No es opcional.** Una key sin restringir se copia del bundle de la web y la
factura le llega al cliente igual. Es el error más común y el más caro.

### Qué NO hace falta habilitar

- **Maps JavaScript API** — no vamos a poner un mapa interactivo en el buscador,
  solo el autocompletado. Menos peso y menos costo.
- El widget oficial de Google Autocomplete — trae su propio estilo y rompe el
  diseño ya aprobado. Usamos REST contra nuestro combobox existente.

---

## 3. Costo

- Google da alrededor de **10.000 llamadas gratis al mes por producto**. Para el
  tráfico de esta web eso sobra con holgura.
- Aun así **la tarjeta hay que ponerla** para activar la API.
- El modelo de cobro usa **session tokens**: las pulsaciones de teclado de una
  búsqueda se agrupan en una sesión y se cobran como una, no una por tecla. Hay
  que implementarlo bien o el consumo se dispara.
- **Pendiente de confirmar**: la tarifa exacta por llamada una vez pasada la
  cuota gratuita. La página de precios de Google muestra planes de suscripción
  (Essentials ~US$275/mes con 100.000 llamadas) pero no encontré la tarifa
  pay-as-you-go por millar. Confirmar al crear la cuenta.

---

## 4. Plan técnico

### Punto de integración

`src/components/PlaceField.tsx` ya es un combobox accesible con interfaz
`groups: PlaceGroup[]` + `value` / `onChange`. **Solo cambia de dónde vienen las
opciones.** La UI, el teclado y los estilos no se tocan, así que no se rompe
nada de lo ya aprobado.

Se usa en dos sitios:

1. `src/components/SearchBar.tsx` — Origen / Destino (traslados) y Punto de
   recogida (excursiones), en el hero.
2. `src/pages/BookingPage.tsx` — campos `#bk-origin` y `#bk-dest`, en `/reservar`.

La fuente actual es `src/data/places.ts` (`AIRPORTS`, `ZONES`, exportados como
`TRANSFER_PLACES` y `PICKUP_PLACES`).

### Comportamiento

- Autocompletado restringido a RD: `includedRegionCodes: ["do"]`.
- Aplica a **origen y destino** por igual.
- Se guarda **`place_id` + coordenadas**, no solo el texto. Ese es el punto
  central del pedido del cliente.
- El correo al negocio incluye un **enlace de Google Maps** al punto exacto de
  recogida y de destino.
- **Texto libre se mantiene como respaldo**, para casas particulares o lugares
  que Google no tenga indexados.
- Session tokens para el cobro por sesión.

### Endpoints (Places API New, vía REST)

- `POST https://places.googleapis.com/v1/places:autocomplete` — sugerencias.
- `POST https://places.googleapis.com/v1/places/{place_id}` — detalles, para
  obtener coordenadas. Cierra la sesión del token.

---

## 5. Decisiones — recomendadas, pendientes de confirmar por Dante

Estas tres las planteé y **todavía no están respondidas**:

**1. ¿Dónde vive la key?**
Recomendación: **proxy por nuestra función de Vercel** (`api/places.ts`), no en
el navegador. Aun con restricción de dominio, una key en el bundle es visible.
Proxied queda invisible y de paso podemos cachear búsquedas repetidas. Cuesta
unas horas más de trabajo.

**2. ¿Conservamos los atajos de aeropuertos?**
Recomendación: **sí**, como fila de accesos rápidos encima de los resultados de
Google. La mayoría de traslados salen del PUJ y tocar un botón es más rápido que
escribir.

**3. ¿Aplica también al punto de recogida de excursiones?**
Recomendación: **sí**. Hoy ahí hay una lista de zonas hoteleras; con Places el
cliente pone su hotel exacto, que también le sirve al conductor.

---

## 6. Estimación

**Un día de trabajo desde que llegue la key.** Nada más depende de eso.

Se puede adelantar la función proxy y dejar la integración detrás de un
interruptor (env var), de modo que al llegar la key solo haya que pegarla en
Vercel y encender. **Pendiente de que Dante decida si adelantamos o esperamos.**

---

## 7. Variables de entorno que habrá que añadir en Vercel

| Variable | Uso |
|---|---|
| `GOOGLE_PLACES_API_KEY` | La key del cliente. Solo servidor si vamos por proxy. |
| `VITE_PLACES_ENABLED` | Interruptor para encender la integración sin redeploy de código. |

Ya existentes y **también pendientes de configurar por el cliente**:
`RESEND_API_KEY`, `CONTACT_TO` (`dominicanroutes@gmail.com`), `CONTACT_FROM`.

---

## 8. Evaluacion de la key recibida (2026-09-06)

El cliente envio una key por chat. La probe contra la API real.

### Funciona, y es lo que necesitamos

- **Places API (New)** habilitada. `places:autocomplete` devuelve `placeId`,
  texto estructurado (`mainText` / `secondaryText`) y tipos.
- **Place Details (New)** devuelve coordenadas. Ejemplo real: Hotel Riu Naiboa
  -> `18.717606, -68.455939`.
- `includedRegionCodes: ["do"]` filtra a RD correctamente.
- La facturacion esta activa (si no, las llamadas fallarian).

Conclusion tecnica: se puede construir la integracion ya.

### Problema bloqueante: la key no tiene NINGUNA restriccion

Probada desde curl, sin navegador y sin cabecera `Referer`. Todas respondieron:

| API probada | Resultado |
|---|---|
| Places API (New) — Autocomplete | OK |
| Places API (New) — Details | OK |
| Geocoding API | OK |
| Places API legacy — Autocomplete | OK |
| Directions API | OK |
| Distance Matrix API | OK |

Implicacion: quien copie la key del bundle de la web puede facturarle a la
tarjeta del cliente **cualquier** producto de Google Maps, no solo el nuestro.
Directions y Distance Matrix estan entre los mas caros.

Agravante: la key viajo por chat en texto plano, asi que ya no puede
considerarse privada.

### Acciones requeridas antes de publicar

1. **El cliente borra esta key y genera una nueva.** No basta con restringir la
   actual: ya circulo sin proteccion.
2. La nueva va **server-side, detras de `api/places.ts`** — esto resuelve la
   decision 1 de la seccion 5. Motivo concreto: una key en el navegador es
   visible aunque se restrinja por dominio, y las restricciones por `Referer` se
   falsifican mandando la cabecera a mano. Detras del proxy no se expone nunca.
3. Restriccion de API en la key nueva: **solo Places API (New)**.
4. **Cuotas diarias por API + alerta de presupuesto** en Google Cloud. Es lo
   unico que de verdad frena una factura desbocada.

### Nota de costo

En Place Details conviene pedir solo la mascara `id,location,formattedAddress`.
Esos campos caen en el tramo **Essentials**, el mas barato; pedir campos de los
tramos Pro o Enterprise sube el precio por llamada sin darnos nada que
necesitemos.

### Higiene del repo

`.gitignore` ya cubre `.env` y `.env.*`, y no hay ningun fichero de entorno
rastreado por git. La key va en `.env.local` para desarrollo y en las variables
de entorno de Vercel para produccion — nunca en el codigo.

---

## 9. Lo construido (2026-09-06)

### Decisiones tomadas

Las tres de la seccion 5 quedaron resueltas asi:

1. **La key vive en el servidor.** Confirmado por grep sobre el bundle de
   produccion: `AIzaSy` no aparece en `dist/`. El navegador solo habla con
   `/api/places`.
2. **Se conservan los atajos.** El desplegable muestra primero *Aeropuertos* y
   *Zonas y ciudades* (lista fija, gratis) y debajo *Direcciones y hoteles*
   (Google).
3. **Excursiones:** el punto de recogida si consulta Google; el selector de
   excursion no, porque es nuestro catalogo cerrado. Verificado: 0 llamadas.

### Ficheros

| Fichero | Papel |
|---|---|
| `api/_places.ts` | Manejador compartido. Autocomplete + Details contra Places API (New). |
| `api/places.ts` | Funcion de Vercel. Una ruta, dos operaciones segun `op`. |
| `vite.config.ts` | Middleware de desarrollo con el mismo manejador + `loadEnv`. |
| `src/utils/googlePlaces.ts` | Cliente del proxy y tokens de sesion. |
| `src/data/places.ts` | Tipo `PlaceValue` y `placeMapsUrl`, ademas de la lista fija. |
| `src/components/PlaceField.tsx` | Combobox con atajos + Google + texto libre. |
| `src/pages/BookingPage.tsx` | Direccion y enlace de Maps en el correo. |
| `.env.example` | Plantilla de variables. |

### Verificado de punta a punta (Playwright, Chromium real)

- Autocompletado devuelve hoteles reales de RD en espanol.
- "hotel cancun mexico" devuelve vacio: el filtro `includedRegionCodes: ["do"]`
  funciona.
- Consultas de menos de 3 caracteres no llegan a Google.
- **21 pulsaciones seguidas producen 1 sola llamada** de autocompletado.
- Elegir un resultado dispara exactamente 1 llamada de detalle.
- El correo al operador incluye, por origen y por destino: nombre, direccion
  formateada de Google y enlace de Maps con `place_id`.
- El desplegable se desmonta del DOM al cerrarse; no queda nada capturando clics.
- Navegacion con flechas sobre los resultados de Google.
- Movil (390 px): el desplegable cabe y no provoca desbordamiento horizontal.
- La atribucion "Powered by Google" se muestra siempre que hay resultados suyos.

### Nota sobre la verificacion

El panel de navegador integrado deja el documento en `hidden`, y ahi
`requestAnimationFrame` no corre: las animaciones de salida de Framer Motion no
terminan y los desplegables parecen quedarse pegados en el DOM. Es un artefacto
del entorno de prueba, no del sitio. En Chromium real se desmontan bien. Si en
el futuro algo parece "no cerrarse" al probar por ese panel, mirar esto antes de
tocar el codigo.

### Comportamiento sin key

Si `GOOGLE_PLACES_API_KEY` no esta definida, el proxy responde `suggestions: []`
con `disabled: true`. La web no se rompe: sigue funcionando con la lista fija de
aeropuertos y zonas y con texto libre. Por eso se puede desplegar antes de
configurar la variable.

### Lo que falta

1. **El cliente regenera la key** y le pone restriccion de API (solo Places API
   New). Sigue pendiente: la actual circulo sin proteccion por chat.
2. **Poner `GOOGLE_PLACES_API_KEY` en Vercel.** Sin eso, en produccion el campo
   se queda en la lista fija.
3. Cuotas diarias y alerta de presupuesto en Google Cloud.
4. Resend: `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`, y probar el
   formulario ya desplegado.
