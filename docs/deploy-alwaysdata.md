# Déploiement chez alwaysdata

Site statique (`dist/`) + `contact.php`, servis par Apache/PHP. `.htaccess` et `contact.php` sont dans `public/`, copiés dans `dist/` par `npm run build`.

## Mise en place (une fois, admin alwaysdata)

1. **Domaine** : Domaines > Ajouter `mathisboulais.com` (DNS chez alwaysdata, ou enregistrements A/AAAA indiqués par alwaysdata chez le registrar).
2. **Site** : Web > Sites > Ajouter. Adresses `mathisboulais.com` et `www.mathisboulais.com`, type **PHP**, répertoire racine `/www/` : le dossier où l'on dépose le contenu de `dist/`.
3. **PHP** : 8.3 ou plus récent (`contact.php` exige 8.1+).
4. **SSL** : Let's Encrypt pour les deux adresses (Web > Sites > SSL, automatique une fois le DNS en place), puis cocher **Forcer HTTPS**.
5. **Email** : Emails > Adresses > créer `contact@mathisboulais.com` (vérifier SPF et DKIM du domaine, sinon les mails de `noreply@` partent en spam). Reporter l'adresse dans `RECIPIENT` (`public/contact.php`) et `identity.email` (`src/content/services.ts`).
6. **SSH** : Accès distant > SSH, activer l'accès pour l'utilisateur `<compte>`.

## Envoi depuis Windows (PowerShell, OpenSSH intégré)

`npm run build`, puis (`npm run deploy` affiche ces commandes, n'envoie rien) :

```
ssh <compte>@ssh-<compte>.alwaysdata.net "rm -rf www-new"
scp -r dist <compte>@ssh-<compte>.alwaysdata.net:www-new
ssh <compte>@ssh-<compte>.alwaysdata.net "rm -rf www-old && mv www www-old && mv www-new www"
```

`www-old` sert de retour arrière. Avec rsync (WSL) : `rsync -avz --delete dist/ <compte>@ssh-<compte>.alwaysdata.net:www/`.

## Test en production

- `http://` et `www.` redirigent vers `https://mathisboulais.com/` ; `/legal/` s'affiche ; `curl -i https://mathisboulais.com/contact.php` répond 405 en JSON.
- Envoyer un vrai message : réception, `Reply-To` = le visiteur. Six envois en 10 min : erreur 429 attendue.
- Erreur 500 partout : commenter `Options -Indexes` du `.htaccess`. Boucle de redirection : commenter le bloc https (Forcer HTTPS suffit).

## Avant mise en ligne

- [ ] Vraie adresse pro (domiciliation) dans `identity.address` : l'adresse actuelle est fictive.
- [ ] Email pro créé et reporté (voir 5).
- [ ] Durée de conservation des messages : `TODO` dans `site.legal.data` (`src/content/site.ts`).
- [ ] HSTS à décommenter dans `.htaccess` une fois HTTPS validé sur les deux adresses.
