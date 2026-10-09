import type { PageKind } from '../content/locales'
import { HomePage } from './HomePage'
import { LegalPage } from './LegalPage'

/** Quatre pages statiques (accueil et mentions légales, en français et en anglais), pas de routeur. */
export function App({ kind }: { kind: PageKind }) {
  return kind === 'legal' ? <LegalPage /> : <HomePage />
}
