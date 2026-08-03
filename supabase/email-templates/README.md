# Plantillas de correo

Los correos que envía Supabase Auth. Se pegan **a mano** en el dashboard: Supabase no las lee de este repositorio, aquí están para versionarlas y no perderlas.

## Dónde se pegan

Authentication → **Emails** → pestaña Templates → elige la plantilla → pega en el campo *Message body*.

| Fichero | Plantilla de Supabase | Cuándo se envía |
|---|---|---|
| `confirmacion.html` | Confirm signup | Alguien crea una cuenta desde `/auth/login` |

Las demás (Invite user, Magic Link, Reset password, Change email) siguen con el texto por defecto en inglés.

## Cómo están escritas

Con **tablas y estilos en línea**, que es lo único que soportan todos los clientes de correo: nada de flexbox, grid ni hojas de estilo externas. Los colores son los mismos tokens de `src/app/globals.css`, copiados como literales porque aquí no hay variables CSS que valgan.

Detalles que conviene no romper al editarlas:

- **El botón es una tabla con `bgcolor`**, no un `<div>` con fondo. Es lo que hace que también se vea en Outlook.
- **El enlace aparece dos veces**: en el botón y como texto copiable. Hay clientes y filtros corporativos que desactivan los botones.
- **El primer `<div>` oculto** es el texto de vista previa que se lee en la bandeja de entrada, antes de abrir el mensaje.
- La fuente es `Trebuchet MS` con alternativas: Nunito, la de la app, no está disponible en los clientes de correo.

## Variables disponibles

`{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`

## Aviso sobre el logo

La imagen apunta a `https://nido-xi.vercel.app/icon-192.png`. **Si cambias de dominio, hay que actualizarla en el dashboard**, o los correos ya enviados y los nuevos se quedarán sin logo. El texto alternativo dice "Nido", así que sin imagen el correo sigue entendiéndose.

## Ver una plantilla antes de subirla

Sustituye `{{ .ConfirmationURL }}` por cualquier URL y abre el fichero en el navegador. Conviene mirarla en móvil: la mayoría de estos correos se abren desde el teléfono.
