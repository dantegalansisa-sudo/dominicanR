/**
 * Textos legales del sitio: Política de privacidad y Términos y condiciones,
 * en español e inglés. Son datos, no componentes: la página los recorre y
 * sustituye {email}, {phone} y {site} por los valores de Ajustes.
 *
 * Borrador redactado para una empresa dominicana de traslados y excursiones
 * que cobra por PayPal/tarjeta y en efectivo y se anuncia en Google Ads. Los
 * plazos de cancelación y reembolso son valores razonables por defecto; el
 * cliente debe revisarlos (y todo el texto) con su asesor legal.
 */

import type { Lang } from '../i18n';

export interface LegalSection {
  heading: string;
  /** Párrafos; un array dentro es una lista con viñetas. */
  body: (string | string[])[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalKind = 'privacy' | 'terms';

const es: Record<LegalKind, LegalDoc> = {
  privacy: {
    title: 'Política de privacidad',
    updated: 'Última actualización: 15 de septiembre de 2026',
    intro:
      'En Dominican Routes ("nosotros") tratamos tus datos personales con el cuidado que exigen la Ley 172-13 sobre Protección de Datos de Carácter Personal de la República Dominicana y, cuando aplica, el Reglamento General de Protección de Datos de la Unión Europea (RGPD). Esta política explica qué datos recogemos en {site}, para qué los usamos, con quién los compartimos y qué derechos tienes.',
    sections: [
      {
        heading: '1. Responsable del tratamiento',
        body: [
          'Dominican Routes, empresa de traslados privados y excursiones con sede en Punta Cana, La Altagracia, República Dominicana.',
          ['Correo: {email}', 'WhatsApp / teléfono: {phone}', 'Sitio web: {site}'],
        ],
      },
      {
        heading: '2. Qué datos recogemos',
        body: [
          'Solo pedimos los datos necesarios para prestar el servicio que solicitas:',
          [
            'Datos de contacto: nombre, correo electrónico y número de teléfono.',
            'Datos de la reserva: fecha y hora, lugar de recogida y destino, número de vuelo, número de pasajeros (adultos y niños), vehículo, extras y los comentarios que escribas.',
            'Datos del pago: si pagas con PayPal o tarjeta, PayPal nos comunica el identificador de la transacción, el importe y el estado del pago. Nunca vemos ni guardamos el número de tu tarjeta ni las credenciales de tu cuenta de PayPal.',
            'Datos técnicos: dirección IP, tipo de navegador, idioma y páginas visitadas, recogidos por los registros del servidor y por las herramientas de medición descritas en el apartado de cookies.',
          ],
        ],
      },
      {
        heading: '3. Para qué usamos tus datos',
        body: [
          [
            'Gestionar tu reserva y prestarte el servicio: confirmar el precio, coordinar al chofer o al operador de la excursión y localizarte el día del servicio.',
            'Procesar y verificar los pagos, emitir comprobantes y atender devoluciones.',
            'Responder a tus consultas por correo, teléfono o WhatsApp.',
            'Cumplir obligaciones legales, fiscales y contables.',
            'Medir el rendimiento del sitio y de nuestra publicidad (ver cookies).',
          ],
          'La base que legitima el tratamiento es la ejecución del contrato de servicio que solicitas, el cumplimiento de obligaciones legales y, para la medición y publicidad, tu consentimiento.',
        ],
      },
      {
        heading: '4. Con quién compartimos tus datos',
        body: [
          'No vendemos tus datos. Solo los compartimos con los proveedores imprescindibles para prestar el servicio, que actúan bajo sus propias políticas de privacidad:',
          [
            'PayPal (PayPal, Inc. y filiales): procesamiento de pagos con cuenta de PayPal o tarjeta.',
            'Google (Google LLC): autocompletado de direcciones y cálculo de rutas (Google Maps Platform) y, cuando hay campañas activas, medición de conversiones y anuncios (Google Ads).',
            'Proveedor de envío de correo transaccional, para hacerte llegar la confirmación de tu reserva.',
            'Proveedor de alojamiento del sitio y de la base de datos.',
            'Choferes y operadores de excursiones asociados, que reciben únicamente los datos necesarios para prestar el servicio contratado (nombre, teléfono, punto de recogida, pasajeros).',
            'Autoridades públicas, cuando la ley lo exija.',
          ],
          'Algunos de estos proveedores están fuera de la República Dominicana (por ejemplo, en Estados Unidos o la Unión Europea). En esos casos la transferencia se ampara en las garantías contractuales que ofrece cada proveedor.',
        ],
      },
      {
        heading: '5. Cookies y publicidad',
        body: [
          'El sitio usa el almacenamiento del navegador para recordar el idioma que eliges. No hace falta ninguna cookie para navegar ni para reservar.',
          'Cuando anunciamos el sitio en Google Ads, Google puede instalar cookies de medición de conversiones y de remarketing para saber si un anuncio dio lugar a una reserva y para mostrarte anuncios relevantes en otros sitios. Puedes desactivar la personalización de anuncios en adssettings.google.com y gestionar o borrar las cookies desde la configuración de tu navegador.',
          'Al reservar, PayPal puede instalar cookies propias necesarias para la seguridad del pago.',
        ],
      },
      {
        heading: '6. Cuánto tiempo conservamos los datos',
        body: [
          'Guardamos los datos de las reservas y los pagos durante el tiempo necesario para prestar el servicio, atender reclamaciones y cumplir las obligaciones fiscales y contables (en general, hasta 10 años desde la operación). Los mensajes de consulta que no derivan en reserva se conservan hasta 12 meses. Los registros técnicos del servidor se conservan un máximo de 90 días.',
        ],
      },
      {
        heading: '7. Cómo protegemos tus datos',
        body: [
          'El sitio se sirve exclusivamente con conexión cifrada (HTTPS). El acceso a las reservas está restringido a personal autorizado con contraseña. Los pagos se procesan íntegramente en la plataforma de PayPal, que cumple el estándar PCI DSS; por eso nunca tratamos datos de tarjeta.',
        ],
      },
      {
        heading: '8. Tus derechos',
        body: [
          'Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, cancelación y oposición (y, cuando aplique el RGPD, los de limitación, portabilidad y retirada del consentimiento) escribiéndonos a {email} desde el correo que usaste al reservar, o indicándonos tu nombre y la fecha del servicio para poder identificarte. Te responderemos en un plazo máximo de 15 días hábiles.',
          'Si consideras que no hemos atendido correctamente tu solicitud, puedes reclamar ante la autoridad de protección de datos que te corresponda.',
        ],
      },
      {
        heading: '9. Menores de edad',
        body: [
          'Las reservas solo pueden hacerlas personas mayores de 18 años. Los datos de los menores que viajan (edad o número) los aporta el adulto responsable únicamente para calcular el precio y preparar el servicio.',
        ],
      },
      {
        heading: '10. Cambios en esta política',
        body: [
          'Podemos actualizar esta política para reflejar cambios legales o en nuestros servicios. Publicaremos siempre la versión vigente en esta página con su fecha de actualización.',
        ],
      },
    ],
  },

  terms: {
    title: 'Términos y condiciones',
    updated: 'Última actualización: 15 de septiembre de 2026',
    intro:
      'Estos términos regulan la contratación de traslados privados y excursiones a través de {site}, operado por Dominican Routes (Punta Cana, República Dominicana). Al enviar una solicitud de reserva o realizar un pago aceptas estas condiciones. Léelas con atención; si tienes dudas, escríbenos a {email} o al {phone} antes de reservar.',
    sections: [
      {
        heading: '1. Los servicios',
        body: [
          [
            'Traslados privados: transporte en vehículo privado con chofer entre los puntos de recogida y destino indicados en la reserva, para el número de pasajeros y equipaje habitual del vehículo elegido.',
            'Excursiones: actividades turísticas organizadas por Dominican Routes o por operadores locales asociados. Cada excursión describe en su ficha qué incluye, su duración aproximada y si admite niños.',
            'Adicionales: sillas infantiles, bebidas o paradas intermedias, según se ofrezcan en el formulario de reserva.',
          ],
        ],
      },
      {
        heading: '2. Reservas y confirmación',
        body: [
          'Puedes reservar de dos maneras:',
          [
            'Pagando en línea: la reserva queda confirmada al instante en cuanto PayPal aprueba el pago. Recibirás un correo con el detalle y el comprobante.',
            'Enviando una solicitud sin pagar: te confirmamos disponibilidad y precio cerrado por correo o WhatsApp, normalmente en menos de 24 horas. La reserva no está confirmada hasta que recibas nuestra confirmación expresa.',
          ],
          'Es tu responsabilidad que los datos de la reserva (fecha, hora, vuelo, direcciones, número de pasajeros y teléfono de contacto) sean correctos. Revisa el correo de confirmación y avísanos de inmediato de cualquier error.',
          'Debes ser mayor de 18 años para reservar.',
        ],
      },
      {
        heading: '3. Precios y qué incluyen',
        body: [
          'Todos los precios se expresan en dólares estadounidenses (USD). Al total de lo que eliges (traslado y adicionales, o entradas de la excursión) se añade un 5 % de impuestos, que se muestra desglosado en el resumen antes de pagar. El precio del traslado se calcula según la ruta y el vehículo; el de las excursiones, por persona (adulto o niño).',
          'El precio que muestra la web es el que se cobra al pagar en línea. Si envías una solicitud sin pagar, el precio cerrado es el que te confirmamos por correo. Los precios pueden cambiar sin previo aviso, pero nunca después de confirmada tu reserva.',
          'Salvo que la reserva indique lo contrario, no están incluidos: propinas, comidas y bebidas no especificadas, entradas a lugares no mencionados, esperas prolongadas o paradas no contratadas.',
        ],
      },
      {
        heading: '4. Formas de pago',
        body: [
          [
            'PayPal o tarjeta de crédito/débito a través de PayPal: pago seguro procesado íntegramente por PayPal. Dominican Routes no accede a los datos de tu tarjeta.',
            'Efectivo el día del servicio: disponible en la mayoría de traslados y excursiones, en USD o su equivalente en pesos dominicanos a la tasa del día. Algunas excursiones con entradas de terceros solo se venden con pago anticipado; la web lo indica en el momento de reservar.',
          ],
          'El pago en línea se realiza en su totalidad al reservar. No aplicamos recargos por pagar con PayPal o tarjeta.',
        ],
      },
      {
        heading: '5. Cancelaciones y reembolsos',
        body: [
          'Puedes cancelar escribiendo a {email} o al WhatsApp {phone} indicando tu nombre y la fecha del servicio.',
          [
            'Traslados: cancelación gratuita hasta 24 horas antes de la hora de recogida. Con menos de 24 horas, o si no te presentas, se cobra el 100 % del servicio.',
            'Excursiones: cancelación gratuita hasta 48 horas antes del inicio. Entre 48 y 24 horas antes se reembolsa el 50 %. Con menos de 24 horas, o si no te presentas, no hay reembolso. Las excursiones con entradas de terceros (por ejemplo, espectáculos o parques) pueden tener condiciones más estrictas fijadas por el operador, que te comunicaremos al confirmar.',
            'Cambios de fecha u hora: gratuitos con más de 24 horas de antelación, sujetos a disponibilidad.',
          ],
          'Los reembolsos se realizan por el mismo medio de pago en un plazo de 5 a 10 días hábiles desde la aprobación. Los pagos en efectivo no reservados con antelación no generan reembolso alguno.',
          'Si Dominican Routes cancela un servicio por causas propias, te reembolsamos el 100 % de lo pagado o te ofrecemos una alternativa equivalente, a tu elección.',
        ],
      },
      {
        heading: '6. Recogidas, vuelos y esperas',
        body: [
          [
            'En el aeropuerto, el chofer te espera con un cartel identificativo en la salida de llegadas. Hacemos seguimiento de tu vuelo: los retrasos de la aerolínea no tienen coste adicional. Incluimos 60 minutos de espera desde el aterrizaje; a partir de ahí se aplican US$15 por cada 30 minutos adicionales, pagaderos al chofer.',
            'En hoteles y domicilios incluimos 15 minutos de espera. Si no te presentas ni contestas al teléfono en ese tiempo, el servicio se considera no presentado.',
            'Si cambias de vuelo, avísanos lo antes posible por WhatsApp; haremos todo lo posible por adaptarnos, sujeto a disponibilidad.',
          ],
        ],
      },
      {
        heading: '7. Pasajeros, equipaje y niños',
        body: [
          'La capacidad de cada vehículo (pasajeros y maletas) es la indicada en su ficha. Si viajan más personas o más equipaje de lo reservado, el chofer puede negarse a realizar el servicio o proponer un vehículo mayor con la diferencia de precio.',
          'Los niños deben viajar con las sillas adecuadas a su edad y peso según la normativa dominicana; puedes solicitarlas como adicional al reservar. Los menores viajan siempre acompañados de un adulto responsable. Las excursiones que admiten niños indican su precio infantil; las que no lo admiten no permiten el acceso de menores.',
        ],
      },
      {
        heading: '8. Conducta a bordo',
        body: [
          'Está prohibido fumar en los vehículos y transportar sustancias ilegales o materiales peligrosos. El chofer puede interrumpir el servicio, sin derecho a reembolso, si un pasajero pone en riesgo la seguridad o adopta una conducta agresiva o inapropiada. Los daños causados al vehículo por los pasajeros serán facturados a quien hizo la reserva.',
        ],
      },
      {
        heading: '9. Responsabilidad',
        body: [
          'Dominican Routes se compromete a prestar los servicios con la diligencia y seguridad de un operador profesional. Nuestros vehículos cuentan con los seguros que exige la legislación dominicana.',
          'No respondemos de retrasos o incumplimientos debidos a causas ajenas a nuestro control: condiciones meteorológicas, tráfico, accidentes de terceros, cierres de vías, huelgas, decisiones de autoridades, fallos de aerolíneas u otros supuestos de fuerza mayor. En esos casos haremos lo razonable por reprogramar el servicio o reembolsarte.',
          'Las excursiones operadas por terceros se rigen además por las condiciones del operador correspondiente, que actúa como responsable de la actividad. Recomendamos contratar un seguro de viaje que cubra cancelaciones, asistencia médica y equipaje.',
          'En la medida que permita la ley, nuestra responsabilidad total frente a ti por un servicio se limita al importe que pagaste por él.',
        ],
      },
      {
        heading: '10. Reclamaciones',
        body: [
          'Si algo no ha salido como esperabas, escríbenos a {email} en un plazo de 7 días desde el servicio, con el detalle de lo ocurrido. Responderemos en un máximo de 10 días hábiles. Los consumidores tienen además los derechos que reconoce la Ley 358-05 de Protección de los Derechos del Consumidor de la República Dominicana.',
        ],
      },
      {
        heading: '11. Propiedad intelectual y uso del sitio',
        body: [
          'Los textos, fotografías, vídeos, logotipos y el diseño de {site} son propiedad de Dominican Routes o se usan con autorización, y no pueden reproducirse sin permiso. No está permitido usar el sitio con fines fraudulentos ni interferir en su funcionamiento.',
        ],
      },
      {
        heading: '12. Privacidad',
        body: [
          'El tratamiento de tus datos personales se describe en nuestra Política de privacidad, que forma parte de estos términos.',
        ],
      },
      {
        heading: '13. Ley aplicable y modificaciones',
        body: [
          'Estos términos se rigen por las leyes de la República Dominicana. Cualquier controversia se someterá a los tribunales competentes de la provincia La Altagracia, sin perjuicio de los derechos que la ley reconozca al consumidor en su lugar de residencia.',
          'Podemos modificar estos términos en cualquier momento; la versión aplicable a tu reserva es la vigente en la fecha en que la realizaste.',
        ],
      },
    ],
  },
};

const en: Record<LegalKind, LegalDoc> = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: September 15, 2026',
    intro:
      'Dominican Routes ("we", "us") handles your personal data with the care required by Law 172-13 on Personal Data Protection of the Dominican Republic and, where it applies, the EU General Data Protection Regulation (GDPR). This policy explains what data we collect on {site}, why, who we share it with and what your rights are.',
    sections: [
      {
        heading: '1. Who is responsible',
        body: [
          'Dominican Routes, a private transfer and excursion company based in Punta Cana, La Altagracia, Dominican Republic.',
          ['Email: {email}', 'WhatsApp / phone: {phone}', 'Website: {site}'],
        ],
      },
      {
        heading: '2. What we collect',
        body: [
          'We only ask for what we need to provide the service you request:',
          [
            'Contact details: name, email address and phone number.',
            'Booking details: date and time, pick-up and drop-off locations, flight number, number of passengers (adults and children), vehicle, extras and any comments you write.',
            'Payment details: if you pay with PayPal or card, PayPal sends us the transaction ID, the amount and the payment status. We never see or store your card number or your PayPal credentials.',
            'Technical data: IP address, browser type, language and pages visited, collected by server logs and by the measurement tools described under cookies.',
          ],
        ],
      },
      {
        heading: '3. Why we use it',
        body: [
          [
            'To manage your booking and deliver the service: confirm the price, coordinate the driver or tour operator and find you on the day.',
            'To process and verify payments, issue receipts and handle refunds.',
            'To answer your enquiries by email, phone or WhatsApp.',
            'To meet legal, tax and accounting obligations.',
            'To measure how the site and our advertising perform (see cookies).',
          ],
          'The legal bases are the performance of the service contract you request, compliance with legal obligations and, for measurement and advertising, your consent.',
        ],
      },
      {
        heading: '4. Who we share it with',
        body: [
          'We do not sell your data. We only share it with the providers essential to deliver the service, each under its own privacy policy:',
          [
            'PayPal (PayPal, Inc. and affiliates): payment processing with a PayPal account or card.',
            'Google (Google LLC): address autocomplete and route calculation (Google Maps Platform) and, when campaigns are running, conversion measurement and advertising (Google Ads).',
            'Our transactional email provider, to send you the booking confirmation.',
            'Our website and database hosting provider.',
            'Partner drivers and tour operators, who receive only what they need to deliver the booked service (name, phone, pick-up point, passengers).',
            'Public authorities, when required by law.',
          ],
          'Some of these providers are located outside the Dominican Republic (for example in the United States or the European Union). Such transfers rely on the contractual safeguards each provider offers.',
        ],
      },
      {
        heading: '5. Cookies and advertising',
        body: [
          'The site uses browser storage to remember the language you choose. No cookies are needed to browse or to book.',
          'When we advertise on Google Ads, Google may set conversion-measurement and remarketing cookies to learn whether an ad led to a booking and to show you relevant ads on other sites. You can turn off ad personalisation at adssettings.google.com and manage or delete cookies in your browser settings.',
          'When you book, PayPal may set its own cookies required for payment security.',
        ],
      },
      {
        heading: '6. How long we keep it',
        body: [
          'We keep booking and payment data for as long as needed to deliver the service, handle claims and meet tax and accounting obligations (generally up to 10 years from the transaction). Enquiries that do not become bookings are kept for up to 12 months. Server logs are kept for a maximum of 90 days.',
        ],
      },
      {
        heading: '7. How we protect it',
        body: [
          'The site is served only over encrypted connections (HTTPS). Access to bookings is restricted to authorised, password-protected staff. Payments are processed entirely on PayPal’s PCI DSS-compliant platform, which is why we never handle card data.',
        ],
      },
      {
        heading: '8. Your rights',
        body: [
          'You may at any time exercise your rights of access, rectification, erasure and objection (and, where the GDPR applies, restriction, portability and withdrawal of consent) by writing to {email} from the address you used to book, or by giving us your name and the service date so we can identify you. We will reply within 15 business days.',
          'If you believe we have not handled your request properly, you may lodge a complaint with your competent data protection authority.',
        ],
      },
      {
        heading: '9. Minors',
        body: [
          'Only people aged 18 or over may make a booking. Details about travelling minors (age or number) are provided by the responsible adult solely to calculate the price and prepare the service.',
        ],
      },
      {
        heading: '10. Changes to this policy',
        body: [
          'We may update this policy to reflect legal changes or changes to our services. The current version, with its update date, will always be published on this page.',
        ],
      },
    ],
  },

  terms: {
    title: 'Terms & Conditions',
    updated: 'Last updated: September 15, 2026',
    intro:
      'These terms govern the booking of private transfers and excursions through {site}, operated by Dominican Routes (Punta Cana, Dominican Republic). By sending a booking request or making a payment you accept these terms. Please read them carefully; if you have any questions, write to {email} or {phone} before booking.',
    sections: [
      {
        heading: '1. The services',
        body: [
          [
            'Private transfers: transport in a private vehicle with driver between the pick-up and drop-off points stated in the booking, for the number of passengers and the usual luggage of the chosen vehicle.',
            'Excursions: tourist activities run by Dominican Routes or by partner local operators. Each excursion page states what is included, its approximate duration and whether children are admitted.',
            'Extras: child seats, drinks or intermediate stops, as offered in the booking form.',
          ],
        ],
      },
      {
        heading: '2. Bookings and confirmation',
        body: [
          'You can book in two ways:',
          [
            'Paying online: the booking is confirmed instantly once PayPal approves the payment. You receive an email with the details and receipt.',
            'Sending a request without paying: we confirm availability and a fixed price by email or WhatsApp, usually within 24 hours. The booking is not confirmed until you receive our express confirmation.',
          ],
          'You are responsible for the accuracy of the booking details (date, time, flight, addresses, number of passengers and contact phone). Check the confirmation email and let us know of any error immediately.',
          'You must be 18 or over to book.',
        ],
      },
      {
        heading: '3. Prices and what they include',
        body: [
          'All prices are in US dollars (USD). A 5% tax is added to the total of what you choose (transfer and extras, or excursion tickets) and is itemised in the summary before you pay. Transfer prices depend on the route and vehicle; excursion prices are per person (adult or child).',
          'The price shown on the website is the price charged when paying online. If you send a request without paying, the fixed price is the one we confirm by email. Prices may change without notice, but never after your booking is confirmed.',
          'Unless stated in the booking, the following are not included: tips, meals and drinks not specified, entrance fees to places not mentioned, extended waiting or stops not booked.',
        ],
      },
      {
        heading: '4. Payment methods',
        body: [
          [
            'PayPal or credit/debit card via PayPal: secure payment processed entirely by PayPal. Dominican Routes has no access to your card details.',
            'Cash on the day of service: available for most transfers and excursions, in USD or the equivalent in Dominican pesos at the day’s rate. Some excursions with third-party tickets are sold on a prepaid basis only; the website says so at the time of booking.',
          ],
          'Online payment is made in full when booking. We add no surcharge for paying with PayPal or card.',
        ],
      },
      {
        heading: '5. Cancellations and refunds',
        body: [
          'You can cancel by writing to {email} or WhatsApp {phone} with your name and the service date.',
          [
            'Transfers: free cancellation up to 24 hours before the pick-up time. With less than 24 hours’ notice, or if you do not show up, 100% of the service is charged.',
            'Excursions: free cancellation up to 48 hours before the start. Between 48 and 24 hours before, 50% is refunded. With less than 24 hours’ notice, or if you do not show up, there is no refund. Excursions with third-party tickets (for example shows or parks) may carry stricter conditions set by the operator, which we tell you on confirmation.',
            'Date or time changes: free with more than 24 hours’ notice, subject to availability.',
          ],
          'Refunds are made to the original payment method within 5 to 10 business days of approval. Cash payments not made in advance are not refundable.',
          'If Dominican Routes cancels a service for reasons of its own, we refund 100% of what you paid or offer an equivalent alternative, at your choice.',
        ],
      },
      {
        heading: '6. Pick-ups, flights and waiting time',
        body: [
          [
            'At the airport your driver waits with a name sign at the arrivals exit. We track your flight: airline delays cost nothing extra. We include 60 minutes of waiting from landing; after that, US$15 applies per additional 30 minutes, payable to the driver.',
            'At hotels and private addresses we include 15 minutes of waiting. If you do not show up or answer the phone within that time, the service counts as a no-show.',
            'If you change flights, tell us as soon as possible on WhatsApp; we will do our best to adapt, subject to availability.',
          ],
        ],
      },
      {
        heading: '7. Passengers, luggage and children',
        body: [
          'Each vehicle’s capacity (passengers and bags) is stated on its card. If more people or luggage than booked turn up, the driver may decline the service or offer a larger vehicle for the price difference.',
          'Children must travel in seats appropriate to their age and weight under Dominican regulations; you can request them as an extra when booking. Minors always travel with a responsible adult. Excursions that admit children show a child price; those that do not admit minors.',
        ],
      },
      {
        heading: '8. Conduct on board',
        body: [
          'Smoking in the vehicles and carrying illegal substances or hazardous materials is prohibited. The driver may stop the service, with no refund, if a passenger endangers safety or behaves aggressively or inappropriately. Damage caused to the vehicle by passengers is billed to the person who made the booking.',
        ],
      },
      {
        heading: '9. Liability',
        body: [
          'Dominican Routes undertakes to deliver its services with the diligence and safety of a professional operator. Our vehicles carry the insurance required by Dominican law.',
          'We are not liable for delays or failures due to causes beyond our control: weather, traffic, third-party accidents, road closures, strikes, decisions of the authorities, airline failures or other force majeure events. In such cases we will do what is reasonable to reschedule the service or refund you.',
          'Excursions run by third parties are additionally governed by the operator’s conditions, the operator being responsible for the activity. We recommend travel insurance covering cancellations, medical assistance and luggage.',
          'To the extent permitted by law, our total liability to you for a service is limited to the amount you paid for it.',
        ],
      },
      {
        heading: '10. Complaints',
        body: [
          'If something did not go as expected, write to {email} within 7 days of the service with the details. We will reply within 10 business days. Consumers also enjoy the rights granted by Law 358-05 on Consumer Protection of the Dominican Republic.',
        ],
      },
      {
        heading: '11. Intellectual property and use of the site',
        body: [
          'The texts, photographs, videos, logos and design of {site} belong to Dominican Routes or are used with permission and may not be reproduced without consent. Using the site for fraudulent purposes or interfering with its operation is not allowed.',
        ],
      },
      {
        heading: '12. Privacy',
        body: [
          'How we handle your personal data is described in our Privacy Policy, which forms part of these terms.',
        ],
      },
      {
        heading: '13. Governing law and changes',
        body: [
          'These terms are governed by the laws of the Dominican Republic. Any dispute is submitted to the competent courts of La Altagracia province, without prejudice to the rights the law grants consumers in their place of residence.',
          'We may change these terms at any time; the version that applies to your booking is the one in force on the date you made it.',
        ],
      },
    ],
  },
};

export const LEGAL: Record<Lang, Record<LegalKind, LegalDoc>> = { es, en };

/** Rutas de cada documento; la misma en ambos idiomas para no duplicar enlaces. */
export const LEGAL_PATHS: Record<LegalKind, string> = {
  privacy: '/privacidad',
  terms: '/terminos',
};
