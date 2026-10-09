// Heure de Paris pour la ligne de disponibilité (ui/AvailabilityLine.tsx) : « Paris, 14:32 ».
// - Rendu serveur et hydratation : aucune heure (getServerSnapshot vaut null), l'heure est posée par
//   React juste après l'hydratation. Pas d'écart entre le HTML prérendu et le premier rendu client.
// - Mise à jour à chaque changement de minute (pas un intervalle de 60 s : l'affichage change pile à
//   hh:mm:00), et au retour sur l'onglet (les minuteurs des onglets cachés sont ralentis).
import { useSyncExternalStore } from 'react'
import type { Locale } from '../content/locales'

const TIME_ZONE = 'Europe/Paris'

/** 24 h dans les deux langues : « 14:32 ». */
const INTL_LOCALE: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB' }

const formatters = new Map<Locale, Intl.DateTimeFormat>()

function formatterFor(locale: Locale): Intl.DateTimeFormat {
  let formatter = formatters.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      timeZone: TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    formatters.set(locale, formatter)
  }
  return formatter
}

/** Heure de Paris au format « 14:32 ». Null si le navigateur ne connaît pas Intl ou le fuseau. */
export function formatParisTime(date: Date, locale: Locale): string | null {
  try {
    return formatterFor(locale).format(date)
  } catch {
    return null
  }
}

/** Millisecondes jusqu'au prochain changement de minute (toujours dans ]0, 60000]). */
export function msUntilNextMinute(now: number): number {
  return 60_000 - (now % 60_000)
}

function subscribe(onChange: () => void): () => void {
  let timer = 0
  const schedule = () => {
    // +50 ms : on se réveille après le changement de minute, jamais juste avant
    timer = window.setTimeout(
      () => {
        onChange()
        schedule()
      },
      msUntilNextMinute(Date.now()) + 50,
    )
  }
  const onVisible = () => {
    if (document.visibilityState === 'visible') onChange()
  }
  schedule()
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    window.clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisible)
  }
}

const noTime = () => null

/** Heure de Paris, ou null au rendu serveur, à l'hydratation et si Intl échoue. */
export function useParisTime(locale: Locale): string | null {
  return useSyncExternalStore(subscribe, () => formatParisTime(new Date(), locale), noTime)
}
