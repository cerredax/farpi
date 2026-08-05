#!/usr/bin/env node
/**
 * Genera el par de claves VAPID que firma las notificaciones push.
 *
 * Las claves identifican al servidor ante el servicio de push del navegador. No
 * caducan y no hay que rotarlas: si se cambian, todas las suscripciones que ya
 * existen dejan de valer y cada persona tiene que volver a activar los avisos.
 *
 *   node scripts/gen-vapid.cjs
 *
 * La pública puede ir en el cliente (por eso lleva NEXT_PUBLIC_). La privada
 * es un secreto: en Vercel y en `.env.local`, nunca en el repositorio.
 */
const webpush = require('web-push')

const { publicKey, privateKey } = webpush.generateVAPIDKeys()

console.log(`
Claves VAPID generadas. Ponlas en Vercel (Project → Settings → Environment
Variables, los tres entornos) y en tu .env.local para probar en local:

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}
VAPID_SUBJECT=mailto:cerredax@gmail.com

Después de guardarlas hay que volver a desplegar: NEXT_PUBLIC_* se incrusta en
el build, así que sin redeploy el botón de activar avisos sigue sin aparecer.

Guarda la privada donde guardes las contraseñas. Si se pierde, se generan otras
y todo el mundo tiene que volver a activar las notificaciones.
`)
