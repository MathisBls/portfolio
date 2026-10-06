import { isLegalPath } from './head'
import { HomePage } from './HomePage'
import { LegalPage } from './LegalPage'

/** Deux pages statiques (index.html et legal/index.html), pas de routeur. */
export function App({ path }: { path: string }) {
  return isLegalPath(path) ? <LegalPage /> : <HomePage />
}
