'use client'

import { useRef, useState } from 'react'
import { useIsClient } from './useIsClient'
import { useIdioma } from '@/lib/i18n/contexto'

/**
 * Lo mínimo de `SpeechRecognition` que se usa: TypeScript no trae el tipo porque
 * la API sigue siendo `webkitSpeechRecognition` en Chrome y Safari.
 */
interface Reconocimiento {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type ConstructorDeReconocimiento = new () => Reconocimiento

function constructorDelNavegador(): ConstructorDeReconocimiento | null {
  const w = window as unknown as {
    SpeechRecognition?: ConstructorDeReconocimiento
    webkitSpeechRecognition?: ConstructorDeReconocimiento
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Por qué no se pudo dictar, en una palabra que el componente traduce a texto. */
export type ErrorDeDictado = 'permiso' | 'nada' | 'otro'

/**
 * Dictar con el micrófono, con la voz que trae el navegador.
 *
 * En Chrome el audio lo transcribe Google, no Farpi: por eso `/privacidad` lo dice
 * y por eso la cabecera `Permissions-Policy` abre el micrófono solo a la propia
 * app. Necesita conexión. Si el navegador no la trae, `soportado` es `false` y
 * quien llama no enseña el botón.
 *
 * `onTexto` recibe lo dictado cuando acaba, una sola vez: no se va escribiendo
 * mientras se habla, porque un resultado a medias que se corrige solo es peor que
 * esperar un segundo.
 */
export function useDictado(onTexto: (texto: string) => void) {
  const idioma = useIdioma()
  const cliente = useIsClient()
  const [escuchando, setEscuchando] = useState(false)
  const [error, setError] = useState<ErrorDeDictado | null>(null)
  const actual = useRef<Reconocimiento | null>(null)

  const soportado = cliente && constructorDelNavegador() !== null

  function iniciar() {
    const Reconocedor = constructorDelNavegador()
    if (!Reconocedor) return
    setError(null)

    const r = new Reconocedor()
    r.lang = idioma === 'en' ? 'en-US' : 'es-ES'
    r.interimResults = false
    r.continuous = false
    r.onresult = e => {
      const texto = Array.from(e.results).map(res => res[0]?.transcript ?? '').join(' ').trim()
      if (texto) onTexto(texto)
    }
    r.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError('permiso')
      else if (e.error === 'no-speech') setError('nada')
      else if (e.error !== 'aborted') setError('otro')
    }
    r.onend = () => {
      setEscuchando(false)
      actual.current = null
    }
    actual.current = r
    setEscuchando(true)
    try {
      r.start()
    } catch {
      setEscuchando(false)
      setError('otro')
    }
  }

  function parar() {
    actual.current?.stop()
  }

  return { soportado, escuchando, error, iniciar, parar }
}
