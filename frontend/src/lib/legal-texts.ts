// Términos y Condiciones y Política de Privacidad de la plataforma (marco legal peruano).
// El texto es fijo: si cambia, se actualiza aquí y en LEGAL_UPDATED_AT. Desde
// Superadmin → Configuración solo se cargan los datos del titular que exige la ley.
//
// Formato: "## " = título de sección, "- " = viñeta, cada línea = un párrafo.

/** Fecha de la versión vigente de ambos documentos. */
export const LEGAL_UPDATED_AT = "16 de octubre de 2026";

export interface LegalOwner {
  platformName: string;
  legalName: string | null;
  legalRuc: string | null;
  legalAddress: string | null;
}

/** "Juan Pérez, con RUC N.° 10…, con domicilio en …" (solo lo que esté configurado). */
function ownerLine(o: LegalOwner) {
  const name = o.legalName || `el titular de ${o.platformName}`;
  return [
    name,
    o.legalRuc ? `con RUC N.° ${o.legalRuc}` : null,
    o.legalAddress ? `con domicilio en ${o.legalAddress}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export function buildTerms(o: LegalOwner) {
  const P = o.platformName;
  return `## 1. Identificación del titular
${P} es una plataforma de comercio electrónico operada por ${ownerLine(o)} (en adelante, "${P}", "nosotros" o "la Plataforma"). Los canales de contacto figuran al final de este documento.

## 2. Objeto y alcance
Estos Términos y Condiciones regulan el acceso y uso de la Plataforma por parte de:
- Los Negocios: personas naturales o jurídicas que crean una tienda virtual para ofrecer productos o servicios (en adelante, "el Negocio").
- Los usuarios que el Negocio invita a administrar su tienda.
- Los Compradores: personas que visitan una tienda, realizan pedidos, reservan citas, contratan suscripciones o reciben ventas al crédito de un Negocio (en adelante, "el Comprador").

${P} brinda una herramienta tecnológica (software como servicio) que permite al Negocio publicar su catálogo, recibir pedidos por WhatsApp, registrar pagos, administrar inventario, citas, suscripciones, ventas al crédito y reportes, e integrarse con otros sistemas mediante una API.

${P} no es vendedor, fabricante, importador ni prestador de los productos o servicios publicados por cada Negocio. La relación de consumo se establece directamente entre el Negocio y el Comprador.

## 3. Aceptación
El registro en la Plataforma, el uso del panel o la realización de un pedido en cualquier tienda implica la lectura y aceptación de estos Términos y de la Política de Privacidad. La aceptación por medios electrónicos tiene plena validez conforme a la Ley N.° 27291, que permite la manifestación de voluntad a través de medios electrónicos.

Si no estás de acuerdo con estos Términos, debes abstenerte de usar la Plataforma.

## 4. Registro y cuenta del Negocio
- Para registrarse se requiere ser mayor de edad y tener capacidad legal para contratar. Quien registra una persona jurídica declara contar con facultades suficientes para representarla.
- El Negocio se obliga a proporcionar información veraz, exacta y actualizada, y responde por los daños derivados de datos falsos o de terceros usados sin autorización.
- Las credenciales de acceso son personales. El Negocio es responsable de su confidencialidad y de toda actividad realizada desde su cuenta y desde las cuentas de los usuarios que invite.
- La dirección de la tienda es única. ${P} puede negar o retirar nombres ofensivos, engañosos, que induzcan a confusión con terceros o que infrinjan derechos de propiedad intelectual.
- El Negocio debe comunicar de inmediato cualquier acceso no autorizado o incidente de seguridad del que tenga conocimiento.

## 5. Planes, periodo de prueba y pagos
- ${P} puede ofrecer un periodo de prueba o un acceso sin costo por tiempo limitado. Concluido ese periodo, el uso de las funciones de pago requiere contratar un plan.
- Los precios se expresan en soles (PEN) e incluyen los impuestos que correspondan, salvo indicación distinta. Toda modificación de precios se comunicará con una anticipación mínima de treinta (30) días calendario y se aplicará desde el siguiente periodo de facturación.
- El pago se acredita con el comprobante enviado desde el panel y se activa una vez verificado. ${P} emitirá el comprobante de pago que corresponda según la normativa de la SUNAT.
- Si la suscripción vence y no se renueva, las funciones pueden quedar limitadas o la tienda puede suspenderse hasta regularizar el pago. La información se conserva conforme a la Política de Privacidad.
- El Negocio puede dejar de usar la Plataforma en cualquier momento. Los periodos ya pagados no son reembolsables, salvo cobro indebido o falla del servicio imputable a ${P}.

## 6. Obligaciones del Negocio
El Negocio es el único responsable de su actividad comercial y, en particular, se obliga a:
- Ofrecer información veraz, suficiente y oportuna sobre sus productos y servicios: características, precio total, stock, condiciones de entrega, garantías y restricciones, conforme al Código de Protección y Defensa del Consumidor (Ley N.° 29571).
- Respetar los precios y condiciones publicados al momento de la compra.
- Emitir los comprobantes de pago que exige la SUNAT y cumplir sus obligaciones tributarias, municipales y sectoriales.
- Contar con las licencias, autorizaciones y registros sanitarios que su actividad requiera.
- Implementar su propio Libro de Reclamaciones cuando la ley lo exija y atender los reclamos, cambios, devoluciones y garantías de sus Compradores.
- Verificar en su propia cuenta de Yape, Plin o banco que los pagos informados se hayan recibido antes de entregar lo vendido.
- Tratar los datos personales de sus Compradores y clientes conforme a la Ley N.° 29733 y solo para atender sus pedidos, citas, suscripciones o créditos.
- En las ventas al crédito, registrar con exactitud lo entregado y los abonos recibidos, y no usar la información de deuda para fines distintos a la cobranza lícita.

## 7. Compras en las tiendas
- El Comprador realiza su pedido directamente al Negocio. El pedido queda sujeto a confirmación del Negocio, quien puede rechazarlo si el pago no se verifica o si no tiene disponibilidad.
- Los pagos se efectúan directamente al Negocio mediante los medios que este publica (por ejemplo, Yape o Plin). ${P} no recibe, administra ni retiene el dinero de las ventas.
- El comprobante de pago que sube el Comprador sirve únicamente para que el Negocio verifique la operación.
- Los reclamos sobre productos, servicios, entregas, cambios o devoluciones deben dirigirse al Negocio, cuyo número de WhatsApp figura en su tienda. ${P} podrá colaborar para facilitar la comunicación entre las partes.
- Nada de lo dispuesto en estos Términos limita los derechos que el Código de Protección y Defensa del Consumidor reconoce al Comprador frente al Negocio.

## 8. Usos prohibidos
Está prohibido utilizar la Plataforma para:
- Ofrecer bienes o servicios ilícitos o prohibidos por la ley peruana, tales como drogas, armas o municiones sin autorización, medicamentos o productos sanitarios sin registro, productos falsificados, de contrabando o de procedencia ilícita, contenido sexual explícito o cualquier bien o servicio que requiera autorización con la que no se cuente.
- Publicar información falsa o engañosa, o contenido que infrinja derechos de autor (Decreto Legislativo N.° 822), marcas u otros signos distintivos (Decreto Legislativo N.° 1075), o el derecho a la imagen e intimidad de terceros.
- Suplantar la identidad de personas o negocios, cometer fraude o captar pagos sin intención de cumplir.
- Enviar comunicaciones comerciales no solicitadas en contravención de la Ley N.° 28493.
- Acceder o intentar acceder sin autorización a cuentas, datos o sistemas; vulnerar medidas de seguridad; sobrecargar la Plataforma o extraer información de forma automatizada fuera de la API autorizada.

Ante un uso prohibido, ${P} podrá retirar el contenido, suspender o cancelar la cuenta sin previo aviso y poner los hechos en conocimiento de las autoridades competentes.

## 9. Propiedad intelectual
- El Negocio conserva la titularidad de sus marcas, logos, fotografías, textos y datos. Otorga a ${P} una licencia no exclusiva, gratuita y limitada a la vigencia de la cuenta para almacenarlos, reproducirlos y mostrarlos con el único fin de hacer funcionar su tienda.
- El Negocio declara contar con los derechos sobre el contenido que publica y mantendrá indemne a ${P} frente a reclamos de terceros por dicho contenido.
- La marca ${P}, el diseño, el código fuente y los demás elementos de la Plataforma son de titularidad de ${P} o de sus licenciantes. Queda prohibida su copia, modificación, reventa o ingeniería inversa sin autorización escrita.

## 10. API de integraciones
- Las credenciales de API (API Key y API Secret) se otorgan a solicitud del Negocio o de un sistema autorizado, con acceso limitado a los módulos asignados.
- El titular de las credenciales debe guardarlas en reserva, no exponerlas en aplicaciones públicas y usarlas solo para los fines autorizados. Responde por el uso que terceros hagan de ellas por su falta de diligencia.
- ${P} puede limitar el consumo, regenerar el secreto o revocar las credenciales ante un uso indebido, inseguro o que afecte el funcionamiento de la Plataforma.

## 11. Disponibilidad del servicio
${P} realiza esfuerzos razonables para mantener la Plataforma disponible y segura. Sin embargo, el servicio puede verse interrumpido por mantenimiento, actualizaciones, fallas de proveedores de internet, alojamiento o mensajería, ataques informáticos o causas de fuerza mayor o caso fortuito. En esos casos, ${P} procurará restablecer el servicio en el menor tiempo posible.

## 12. Limitación de responsabilidad
${P} no será responsable por:
- La existencia, calidad, idoneidad, legalidad, entrega o garantía de los productos y servicios ofrecidos por los Negocios.
- Los pagos realizados por los Compradores a los Negocios o a cuentas de terceros, ni por comprobantes de pago falsos.
- El incumplimiento de las obligaciones tributarias, sanitarias o de consumo de los Negocios.
- El uso que el Negocio dé a los datos de sus Compradores en contravención de la ley.
- Lucro cesante o ventas no concretadas por interrupciones temporales del servicio no imputables a ${P}.

Las limitaciones anteriores no aplican en casos de dolo o culpa inexcusable, conforme al artículo 1328 del Código Civil, ni afectan los derechos irrenunciables de los consumidores.

## 13. Suspensión y terminación
${P} puede suspender o dar por terminada una cuenta por incumplimiento de estos Términos, falta de pago, uso prohibido o riesgo para los Compradores, otros Negocios o la Plataforma. Salvo urgencia o mandato legal, se comunicará previamente al Negocio.

El Negocio puede solicitar la baja de su cuenta en cualquier momento. Dentro de los treinta (30) días calendario siguientes podrá pedir una copia de su información; luego, los datos se eliminarán o anonimizarán, salvo los que deban conservarse por obligación legal.

## 14. Modificaciones
${P} puede modificar estos Términos para reflejar cambios en el servicio o en la normativa. La versión vigente y su fecha se publican en esta página. Los cambios relevantes se comunicarán por el panel, correo electrónico o WhatsApp con una anticipación mínima de quince (15) días calendario. El uso de la Plataforma después de esa fecha implica la aceptación de la nueva versión.

## 15. Reclamos sobre el servicio de ${P}
Los Negocios y usuarios pueden presentar consultas, quejas o reclamos sobre el servicio de la Plataforma a través de los canales de contacto indicados al final de este documento. Serán atendidos en un plazo máximo de quince (15) días hábiles.

## 16. Ley aplicable y jurisdicción
Estos Términos se rigen por las leyes de la República del Perú. Las partes procurarán resolver cualquier controversia de manera directa y de buena fe. De no lograrse un acuerdo, se someterán a la competencia de los jueces y tribunales del Cercado de Lima, sin perjuicio del derecho de los consumidores a acudir al INDECOPI o a los órganos competentes de su domicilio.`;
}

export function buildPrivacy(o: LegalOwner) {
  const P = o.platformName;
  return `## 1. Titular del banco de datos
El responsable del tratamiento de los datos personales de los Negocios registrados y de sus usuarios es ${ownerLine(o)} (en adelante, "${P}"). Los canales de contacto figuran al final de este documento.

Esta Política se emite en cumplimiento de la Ley N.° 29733, Ley de Protección de Datos Personales, y de su Reglamento aprobado por Decreto Supremo N.° 016-2024-JUS.

## 2. Dos roles distintos: responsable y encargado
- Respecto de los datos de los Negocios y sus usuarios, ${P} es el responsable del tratamiento.
- Respecto de los datos de los Compradores y clientes de cada tienda (pedidos, citas, suscripciones y ventas al crédito), el responsable es el Negocio. ${P} actúa como encargado del tratamiento: procesa esos datos únicamente por cuenta del Negocio, para prestarle el servicio, con confidencialidad y sin usarlos para fines propios.

## 3. Datos que recopilamos
De los Negocios y sus usuarios:
- Identificación y contacto: nombre del responsable, correo electrónico y número de WhatsApp.
- Credenciales: la contraseña se almacena cifrada mediante una función de un solo sentido; nadie, ni siquiera ${P}, puede leerla.
- Datos del negocio: nombre comercial, rubro, dirección, logo, fotografías, productos, precios, número y código QR de Yape o Plin.
- Datos de la suscripción: plan contratado, comprobantes de pago y fechas de vencimiento.
- Registro de actividad: acciones realizadas en el panel, para seguridad y auditoría.

De los Compradores y clientes de las tiendas, por cuenta del Negocio:
- Nombre y número de celular.
- Dirección y referencia, cuando se elige entrega a domicilio.
- Detalle de pedidos, citas o suscripciones, y la imagen del comprobante de pago con su número de operación.
- En ventas al crédito: nombres, apellidos, DNI (opcional), celular, dirección, productos entregados, abonos y saldo.

Datos técnicos:
- Datos de sesión guardados en el almacenamiento local del navegador, necesarios para mantener la sesión iniciada en el panel. La Plataforma no utiliza cookies publicitarias ni de rastreo de terceros.

No solicitamos datos sensibles (salud, origen racial, creencias, datos biométricos, entre otros). Te pedimos no incluirlos en notas ni descripciones.

## 4. Finalidades del tratamiento
Finalidades necesarias para prestar el servicio:
- Crear y administrar la cuenta y la tienda del Negocio.
- Recibir, mostrar y gestionar pedidos, citas, suscripciones, ventas al crédito e inventario.
- Enviar notificaciones operativas por WhatsApp o correo (pedidos, pagos, vencimientos y credenciales).
- Verificar los pagos de la suscripción, emitir comprobantes y brindar soporte.
- Autocompletar y validar datos de RUC o DNI cuando el Negocio utiliza esa función.
- Prevenir fraudes, accesos no autorizados y usos prohibidos.
- Cumplir obligaciones legales y atender requerimientos de autoridades competentes.

Finalidad adicional, sujeta a tu consentimiento:
- Enviar al Negocio novedades, mejoras y ofertas de ${P}. Puedes oponerte en cualquier momento sin que ello afecte el servicio.

${P} no vende, alquila ni cede datos personales a terceros con fines comerciales.

## 5. Base legal
El tratamiento se sustenta en la relación contractual con el Negocio, en el consentimiento otorgado al registrarse o al realizar un pedido, y en el cumplimiento de obligaciones legales, conforme al artículo 14 de la Ley N.° 29733.

## 6. Destinatarios y transferencias internacionales
Para operar la Plataforma, los datos se alojan o procesan a través de proveedores que actúan como encargados, bajo obligaciones de confidencialidad y seguridad:
- Render y Vercel: alojamiento del servidor y de la web (Estados Unidos).
- Proveedor de base de datos en la nube donde se almacena la información de la Plataforma.
- Cloudinary: almacenamiento de imágenes, logos y comprobantes (Estados Unidos).
- Twilio: envío de notificaciones por WhatsApp (Estados Unidos).
- Servicio de consulta de RUC y DNI, cuando el Negocio utiliza esa función.

Algunos de estos proveedores se ubican fuera del Perú, por lo que se produce un flujo transfronterizo de datos personales, realizado conforme al Reglamento de la Ley N.° 29733 y a efectos exclusivos de prestar el servicio.

Los datos de un pedido se ponen a disposición del Negocio al que se le compra. La página pública de seguimiento de pedidos no muestra los datos personales completos del Comprador.

## 7. Plazo de conservación
- Datos de la cuenta del Negocio: mientras la cuenta esté activa y hasta treinta (30) días después de solicitada su baja.
- Pedidos, pagos, comprobantes y ventas al crédito: durante el tiempo necesario para atender reclamos y cumplir las obligaciones tributarias, contables y de protección al consumidor.
- Registro de actividad: el tiempo razonable para fines de seguridad y auditoría.

Vencidos estos plazos, los datos se eliminan o anonimizan de forma segura.

## 8. Medidas de seguridad
${P} aplica medidas técnicas y organizativas para proteger los datos, entre ellas:
- Conexión cifrada (HTTPS) en toda la Plataforma.
- Contraseñas almacenadas con cifrado de un solo sentido y secretos de API cifrados.
- Separación de la información: cada Negocio solo accede a los datos de su propia tienda.
- Permisos por rol y registro de las acciones administrativas.
- Acceso restringido a los comprobantes de pago.

Ningún sistema es completamente infalible. Ante un incidente de seguridad que afecte datos personales, ${P} adoptará las medidas para contenerlo y lo comunicará a los afectados y a la autoridad cuando corresponda.

## 9. Derechos del titular de los datos
Puedes ejercer en cualquier momento tus derechos de información, acceso, rectificación, cancelación y oposición (derechos ARCO), así como revocar tu consentimiento, de forma gratuita.

Para ello, envía una solicitud por los canales de contacto indicados al final de este documento, con:
- Tu nombre completo y una copia de tu documento de identidad (o el de tu representante, con el poder correspondiente).
- El derecho que deseas ejercer y una descripción clara de lo que solicitas.
- Un correo o número para responderte.

Atenderemos tu solicitud dentro de los plazos establecidos en el Reglamento de la Ley N.° 29733.

Si eres Comprador o cliente de una tienda, el responsable de tus datos es el Negocio; puedes dirigirte a él directamente, o a ${P}, que trasladará tu solicitud al Negocio.

Si consideras que tu solicitud no fue atendida, puedes presentar una reclamación ante la Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia y Derechos Humanos.

## 10. Menores de edad
La Plataforma está dirigida a personas mayores de edad. No recopilamos de manera intencional datos de menores de catorce (14) años sin el consentimiento de sus padres o tutores. Si se detecta un caso así, los datos serán eliminados.

## 11. Obligaciones del Negocio sobre los datos de sus clientes
Como responsable de los datos de sus Compradores y clientes, el Negocio se obliga a:
- Informarles la finalidad para la que usa sus datos y obtener su consentimiento cuando sea necesario.
- Usar los datos solo para atender pedidos, citas, suscripciones o créditos, y para la cobranza lícita de los saldos pendientes.
- No difundir públicamente las deudas ni los datos de sus clientes.
- Atender las solicitudes de derechos ARCO que reciba.

## 12. Cambios a esta Política
${P} puede actualizar esta Política para reflejar cambios en el servicio o en la normativa. La versión vigente y su fecha se publican en esta página. Los cambios relevantes se comunicarán por el panel, correo electrónico o WhatsApp.`;
}
