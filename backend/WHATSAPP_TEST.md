# Probar notificaciones de comprobantes por WhatsApp

La integración usa un único remitente central de MiTiendita. Cada tienda recibe la imagen en el número guardado en **Panel → Configuración → WhatsApp**.

## Datos necesarios de Meta

Desde la sección **WhatsApp → Configuración de la API** de la aplicación de Meta copia:

- versión de Graph API mostrada en el ejemplo de Meta;
- identificador del número de teléfono;
- token de acceso temporal para pruebas;
- agrega tu teléfono como destinatario de prueba.

No subas el token al repositorio ni lo envíes por chat.

## Configuración local

Agrega al archivo `backend/.env`:

```env
WHATSAPP_CLOUD_ENABLED=true
WHATSAPP_CLOUD_API_VERSION=v25.0
WHATSAPP_CLOUD_PHONE_NUMBER_ID=TU_PHONE_NUMBER_ID
WHATSAPP_CLOUD_ACCESS_TOKEN=TU_TOKEN
```

Usa la versión que Meta muestre en su ejemplo si es diferente. Reinicia el backend después de cambiar `.env`.

Para probar un mensaje de imagen sin una plantilla aprobada, primero envía cualquier mensaje desde el teléfono receptor al número de prueba de Meta. Esto abre la ventana de atención de 24 horas.

Después crea un pedido, sube el comprobante y espera la confirmación: **La imagen también fue enviada al WhatsApp del dueño**.

Si WhatsApp rechaza el envío, el comprobante no se pierde: permanece disponible en **Panel → Pedidos**.
