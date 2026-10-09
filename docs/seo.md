# Référencement : à faire après la mise en ligne

Côté code, tout est en place : titres qui commencent par « Mathis Boulais », descriptions, canonical et
hreflang, Open Graph et Twitter (image avec alt), données structurées JSON-LD (`WebSite` nommé « Mathis
Boulais » à la racine, `ProfessionalService` avec logo, `Person`, fil d'Ariane), icônes (`favicon.ico`,
PNG 48 et 96 px, SVG, `apple-touch-icon`, manifeste), `robots.txt` avec le lien vers le sitemap. Détail
technique : `src/app/head.ts` et `src/app/structuredData.ts`.

Il reste ce que seul Mathis peut faire, avec ses comptes.

## 1. Google Search Console (le jour de la mise en ligne)

1. <https://search.google.com/search-console> → **Ajouter une propriété** → type **Domaine** →
   `mathisboulais.com` (une seule propriété couvre https, http, www et les sous-domaines).
2. Google affiche un enregistrement TXT `google-site-verification=…` : le copier.
3. Chez alwaysdata (<https://admin.alwaysdata.com>) : menu **Domaines** → sur la ligne de
   `mathisboulais.com`, bouton **Enregistrements DNS** → **Ajouter un enregistrement** :
   - type : `TXT` ;
   - nom (hôte) : laisser vide (racine du domaine) ;
   - valeur : la chaîne copiée, telle quelle ;
   - TTL : par défaut.

   Si les DNS du domaine ne sont pas gérés par alwaysdata (serveurs autres que `dns1/dns2.alwaysdata.net`),
   ajouter ce TXT chez le gestionnaire DNS réel.
4. Retour dans Search Console → **Valider**. La propagation prend de quelques minutes à quelques heures ;
   en cas d'échec, réessayer plus tard. Ne jamais supprimer ce TXT ensuite.
5. **Sitemaps** → saisir `sitemap.xml` → **Envoyer**.
6. **Inspection de l'URL** → `https://mathisboulais.com/` → **Tester l'URL en ligne** (vérifie que Google
   voit la page) → **Demander une indexation**. Même chose pour `https://mathisboulais.com/en/` et pour
   chaque page d'atterrissage.

## 2. Bing Webmaster Tools (5 minutes, une fois Search Console validée)

<https://www.bing.com/webmasters> → se connecter → **Importer depuis Google Search Console** → autoriser →
cocher la propriété. Le site et le sitemap sont repris, sans autre vérification. Bing alimente aussi
DuckDuckGo, Ecosia, Qwant (en partie) et la recherche de ChatGPT.

## 3. Google Business Profile (le plus efficace pour les recherches locales)

1. <https://business.google.com> → **Ajouter votre établissement** → nom : `Mathis Boulais` ;
   catégorie : **Concepteur de sites Web** (catégories secondaires possibles : « Service de conception
   d'applications », « Développeur de logiciels »).
2. Pas d'accueil de clients sur place : choisir **zone desservie** (Paris, Île-de-France) et masquer
   l'adresse.
3. Téléphone, site (`https://mathisboulais.com`), horaires, description courte, photos (captures de
   projets). Garder exactement le même nom et le même téléphone que sur le site.
4. Valider la fiche (vidéo, courrier ou appel, selon ce que Google propose).
5. Demander un avis à chaque client satisfait (lien « Demander des avis » de la fiche).
6. Une fois la fiche publiée, transmettre son URL : on l'ajoutera au JSON-LD (`sameAs`) pour relier le
   site et la fiche.

## 4. Vérifier les données structurées

- **Test des résultats enrichis** : <https://search.google.com/test/rich-results> → URL
  `https://mathisboulais.com/`. Attendu : « Entreprises locales » et « Organisation » valides, sans
  erreur. Sur `/mentions-legales/` : « Fil d'Ariane ». Le nom du site (`WebSite`) n'apparaît pas dans ce
  test, c'est normal.
- **Validateur schema.org** : <https://validator.schema.org> → même URL → 0 erreur, 0 avertissement.
- Aperçu de partage (facultatif) : <https://www.linkedin.com/post-inspector/> avec l'URL de l'accueil.

## 5. Quand le nom remplace l'URL dans Google

- Google n'affiche « Mathis Boulais » (et la favicon) qu'après avoir exploré et indexé l'accueil, puis
  recalculé le nom du site. Compter **de quelques jours à 3 ou 4 semaines** après l'indexation de
  l'accueil, parfois plus pour un domaine neuf. La demande d'indexation (étape 1.6) accélère la première
  exploration, pas le calcul du nom.
- Entre-temps, Google affiche le domaine (`mathisboulais.com`) : ce n'est pas une erreur.
- Ne pas changer le nom, le titre de l'accueil ni la favicon pendant ce temps : chaque changement relance
  l'attente.
- Le nom vaut pour tout le domaine : `/en/` affichera le même.
- Si au bout de 6 semaines Google affiche un autre nom, vérifier dans Search Console que l'accueil est
  bien indexé, puis le signaler via le lien « Envoyer des commentaires » sous le résultat.
