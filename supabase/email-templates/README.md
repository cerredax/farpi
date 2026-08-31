# Plantillas de correo

Los correos que envía Supabase Auth. Se pegan **a mano** en el dashboard: Supabase no las lee de este repositorio, aquí están para versionarlas y no perderlas.

## Dónde se pegan

Authentication → **Emails** → pestaña *Templates* → elige la plantilla → rellena *Subject heading* y pega el fichero en *Message body*.

| Plantilla de Supabase | Fichero | Asunto |
|---|---|---|
| Confirm signup | `confirmacion.html` | `Confirma tu correo para entrar en Farpi` |
| Invite user | `invitacion.html` | `Te han invitado a Farpi` |
| Magic Link | `magic-link.html` | `Tu enlace para entrar en Farpi` |
| Change Email Address | `cambio-email.html` | `Confirma tu nueva dirección de correo` |
| Reset Password | `recuperar-password.html` | `Restablece tu contraseña de Farpi` |
| Reauthentication | `reautenticacion.html` | `Tu código de Farpi: {{ .Token }}` |

En el asunto también se pueden usar variables, y en el de reautenticación compensa: se lee el código sin abrir el mensaje.

## Cómo están escritas

Con **tablas y estilos en línea**, que es lo único que soportan todos los clientes de correo: nada de flexbox, grid ni hojas de estilo externas. Parece HTML antiguo porque es lo que funciona en todas partes. Los colores son los tokens de `src/app/globals.css`, copiados como literales porque aquí no hay variables CSS que valgan.

Detalles que conviene no romper al editarlas:

- **El logo no es una imagen.** Es una celda de tabla con fondo y la letra `N`. Los clientes de correo bloquean las imágenes externas por defecto, así que un `<img>` desaparecería justo en la primera impresión, que es cuando más importa.
- **El botón es una tabla con `bgcolor`**, no un `<div>` con fondo. Es lo que hace que también se vea en Outlook.
- **El enlace aparece dos veces**: en el botón y como texto copiable. Hay clientes y filtros corporativos que desactivan los botones.
- **El primer `<div>` oculto** es el texto de vista previa que se lee en la bandeja de entrada, antes de abrir el mensaje.
- La fuente es `Trebuchet MS` con alternativas: Nunito, la de la app, no está disponible en los clientes de correo.

## Variables

`{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .Email }}`, `{{ .SiteURL }}`, y `{{ .NewEmail }}` solo en el cambio de dirección.

`reautenticacion.html` es la única que **no** lleva enlace: muestra el código de un solo uso, que es como funciona esa operación.

## Ver una plantilla antes de subirla

Sustituye las variables por valores de ejemplo y abre el fichero en el navegador. Conviene mirarla en móvil: la mayoría de estos correos se abren desde el teléfono.

Las seis se generan desde un esqueleto común. Si hay que cambiar el diseño de todas a la vez, edita el generador en lugar de tocarlas una por una — está descrito en el commit que las introdujo.
