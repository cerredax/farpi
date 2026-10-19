# Publicar Farpi en Google Play

Farpi entra en Google Play como **TWA** (Trusted Web Activity): una app Android mínima que
abre `https://www.farpi.app` a pantalla completa, sin la barra del navegador. No hay otra
base de código: lo que se publica en Vercel es lo que se ve en la app. Esta guía es el
orden en que se hace, y lo que ya está hecho en el repositorio para que funcione.

## Estado actual (19-10-2026)

- El proyecto Android está en `../farpi-android`: paquete `farpi.app`, versión 2,
  destino `https://www.farpi.app/home`, SDK objetivo 36 y delegación de notificaciones activa.
- El app bundle 2 (2) ya está en la biblioteca de Play y añadido a la versión de producción,
  con notas en castellano. La distribución está configurada **solo para España**.
- Console ya muestra la última versión de producción **publicada al 100 %**, con la notificación
  «Se ha publicado la actualización de la aplicación». Hay otros cambios listos para enviar a
  revisión; esto no confirma que estén aplicados a la ficha pública.
- La ficha pública de `farpi.app` responde 200 y muestra Farpi; el propietario confirma la
  publicación. La nueva portada ofrece «Descárgala en Google Play» con el enlace directo.
- La declaración corregida de Seguridad de los datos está visible en la ficha pública:
  trece tipos de datos, audio compartido para el dictado, cifrado en tránsito y solicitud de
  borrado (19-10-2026). No se ha confirmado la conservación del audio por su proveedor.
- Las 24 capturas actuales de `google-play/capturas/` están subidas a la ficha: lo confirma el
  propietario (19-10-2026). Yo no he comprobado la ficha pública después de la subida.
- `/.well-known/assetlinks.json` responde 200 en producción con la huella que muestra Google
  Play para la firma de la app. La API Digital Asset Links confirma la asociación.

## Lo que ya está en el repositorio

- **`public/manifest.json`** con `id: "/home"` —el mismo que tenían por defecto las PWA
  ya instaladas, porque es su `start_url`, así que no las duplica—, `scope: "/"`, `lang`,
  `categories`, los iconos `any` y `maskable` y las nueve capturas de `public/capturas/`.
- **`/privacidad`**, **`/terminos`** y **`/borrar-cuenta`**, las tres sin sesión
  (`PUBLIC_ROUTES`). La última es la URL de borrado de cuenta que Play exige.
- **`public/.well-known/assetlinks.json`**, con la huella pública de firma de Google Play,
  y **`/.well-known/` fuera del proxy** (`src/proxy.ts`), para que se sirva sin redirigir
  al login. Archivo y asociación con Google comprobados en producción.

## 1. Decisiones que no tienen vuelta atrás

- **Package name: `farpi.app`** (decidido el 28-09-2026). Una vez publicada la app no se
  puede cambiar nunca: otro nombre es otra app, con otra ficha y sin sus usuarios.
- **La clave de subida** que se genera en el paso 2. Con Play App Signing, Google guarda
  la clave que firma de verdad, y la de subida se puede reponer si se pierde. Aun así, se
  guarda **fuera del repositorio**, con su contraseña, en un sitio del que haya copia.

## 2. Generar la app con Bubblewrap

Hace falta Node y, la primera vez, Bubblewrap descarga él mismo el JDK y el SDK de Android.

```bash
npm i -g @bubblewrap/cli
mkdir farpi-android && cd farpi-android     # fuera de este repositorio
bubblewrap init --manifest https://www.farpi.app/manifest.json
```

El asistente pregunta. Lo que hay que contestar:

| Pregunta | Respuesta |
|---|---|
| Domain | `www.farpi.app` (el principal; el ápice redirige) |
| URL path / start URL | `/home` |
| Application name / short name | `Farpi` |
| Application ID (package) | `farpi.app` |
| Display mode | `standalone` |
| Theme / background color | `#8BA888` / `#FAF7F2` (los del manifest) |
| Notificaciones (delegación de notificaciones) | **Sí**: los avisos de las siete son Web Push y dentro de la TWA los muestra Android como de la app |
| Ubicación, Play Billing | No |
| Signing key | Crear una nueva (es la clave de subida del paso 1) |

Comprueba en el `twa-manifest.json` que ha generado que el `packageId` es `farpi.app` y
que las notificaciones están activadas. Después:

```bash
bubblewrap build
```

Deja un `app-release-bundle.aab`, que es lo que se sube a Play.

## 3. Crear la app en Play Console

1. Cuenta de desarrollador (pago único de 25 $).
2. **Crear app** → nombre «Farpi», idioma predeterminado español (España), app gratuita.
3. **Integridad de la app**: dejar activado **Play App Signing** (es el valor por defecto).
4. Subir el `.aab` a la pista de **prueba cerrada** (paso 6).

## 4. `assetlinks.json`: que la app sea de este dominio

Sin este archivo, Android no se cree que la app y la web son la misma cosa y la TWA
enseña la barra del navegador arriba.

1. En Play Console → **Protegida con Play** → **Protección de Play Store** →
   **Gestiona la firma de aplicaciones de Play**, copia la **huella
   SHA-256 del certificado de firma de apps**. La de Google, no la de subida: la app que
   se instala la firma Google.
2. Créalo en `public/.well-known/assetlinks.json`:

   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "farpi.app",
       "sha256_cert_fingerprints": ["AA:BB:…la huella entera…"]
     }
   }]
   ```

   Si también se quiere instalar a mano el `.apk` que genera Bubblewrap para probarlo
   antes de Play, se añade a la lista la huella de la clave de subida, que se lee con
   `keytool -list -v -keystore android.keystore` en la carpeta de Bubblewrap.
3. Commit, push y despliegue. Comprueba que responde **200 con JSON** y sin redirigir:

   ```bash
   curl -i https://www.farpi.app/.well-known/assetlinks.json
   ```

   Y que Google lo acepta:
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.farpi.app&relation=delegate_permission/common.handle_all_urls`

## 5. La ficha de la tienda

- **Icono** 512×512 y **gráfico destacado** 1024×500: ya cargados en Console.
- **Capturas de la ficha**: `node scripts/gen-capturas-play.mjs` genera ocho por formato en
  `google-play/capturas/telefono/`, `tablet-7/` y `tablet-10/`. Teléfono y tablet de 7 pulgadas:
  1080×1920; tablet de 10 pulgadas en horizontal: 1920×1080. PNG RGB sin transparencia, con
  datos ficticios, reloj fijo y comprobaciones de carga, errores y desbordamiento. El orden
  numerado es Inicio, Calendario, Listas, Tareas, Comidas, Finanzas, Notas y Documentos.
  Hay que subir los PNG de cada carpeta a su sección en la ficha predeterminada, revisar y
  guardar los cambios. No se actualizan automáticamente al desplegar la web ni al subir un AAB.
  Las de la portada (`public/capturas/`) conservan su generador independiente.
- **Política de privacidad**: `https://www.farpi.app/privacidad`.
- **Borrado de cuenta**: `https://www.farpi.app/borrar-cuenta`. Si Play pregunta si se
  pueden borrar datos sin borrar la cuenta: sí, cada cosa se borra desde la app.
- **Clasificación de contenido**: el cuestionario de IARC. Sin violencia, sin juego, sin
  contenido generado que se comparta con desconocidos: todo queda dentro de la familia.
- **Público objetivo**: adultos. La app no está dirigida a menores (lo dice
  `/privacidad`), aunque guarde datos de los hijos que meten los padres.
- **Seguridad de los datos**. Lo que se recoge, sacado de `/privacidad`:
  - Información personal: correo y nombre. Para el funcionamiento de la app.
  - Información financiera: ingresos, gastos, nóminas si se apuntan. Sin datos bancarios.
  - Salud e identidad: documentos (DNI, informes médicos), cuyo archivo vive en el Google
    Drive de quien lo sube; en Farpi solo queda la ficha.
  - Calendario, tareas, notas, listas: contenido de la app.
  - Cifrados en tránsito: sí (HTTPS, HSTS). Se comparten con terceros: no; los
    proveedores (Supabase, Vercel, Google Drive) tratan datos por cuenta de Farpi, que no
    es «compartir» a efectos de Play. Se pueden borrar: sí, en `/borrar-cuenta`.
- **Acceso para revisión**: Play pide una cuenta con la que entrar. Hay que crearla en
  la base real, porque no hay otro entorno; una familia de prueba con datos inventados, y
  borrarla después de la revisión.

## 6. La prueba cerrada

Las cuentas personales de desarrollador creadas después del 13-11-2023 tienen que pasar
una **prueba cerrada con al menos 12 testers inscritos durante 14 días seguidos** antes de
poder pedir producción (comprobado en la ayuda de Play el 28-09-2026). Es lo que más
tarda del proceso:

1. Pista **Prueba cerrada** → lista de testers por correo (cuentas de Google).
2. Cada tester acepta la invitación desde el enlace de inscripción e instala la app.
3. Catorce días sin que ninguno se dé de baja. Después, **Solicitar acceso a producción**.

## 7. Al publicar

- Cambiar el «Próximamente en Google Play» de la portada por el enlace a la ficha.
- Actualizar `docs/project-status.md` y `docs/produccion.md`.
- Una versión nueva de la web **no** obliga a subir una versión nueva a Play: la TWA carga
  la web. Solo hace falta un `.aab` nuevo si cambia algo de la parte Android (el icono, el
  nombre, la huella, la versión de Bubblewrap).
