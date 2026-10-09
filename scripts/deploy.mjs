// Affiche les commandes d'envoi de dist/ vers alwaysdata (docs/deploy-alwaysdata.md). N'envoie rien,
// ne lit aucun secret. Identifiant : variable ALWAYSDATA_ACCOUNT, sinon le placeholder <compte>.
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const required = [
  'index.html',
  'en/index.html',
  'mentions-legales/index.html',
  'en/legal/index.html',
  'contact.php',
  '.htaccess',
]
const missing = required.filter((file) => !existsSync(join(root, 'dist', file)))

if (missing.length > 0) {
  console.error(`[deploy] absent de dist/ : ${missing.join(', ')}. Lancer d'abord npm run build.`)
  process.exit(1)
}

const account = process.env.ALWAYSDATA_ACCOUNT ?? '<compte>'
const host = `${account}@ssh-${account}.alwaysdata.net`

console.log(`[deploy] dist/ est prêt. Depuis la racine du projet :

ssh ${host} "rm -rf www-new"
scp -r dist ${host}:www-new
ssh ${host} "rm -rf www-old && mv www www-old && mv www-new www"

Ou avec rsync (WSL) : rsync -avz --delete dist/ ${host}:www/`)
