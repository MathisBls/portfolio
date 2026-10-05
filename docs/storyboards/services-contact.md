# Storyboard — Services et Contact (Phase 3)

## 1. Intention

Services : en 10 s, le visiteur sait ce qu'il peut commander, pour qui, et à partir de quel prix. Contact : écrire, appeler ou envoyer un message en moins de 30 s. Le prisme revient, recomposé, sous une lumière blanche seule : la boucle est bouclée.

## 2. Storyboard scroll

Progress de section : `services` (timeline 2 → 3) et `contact` (timeline 3 → 4), ScrollTrigger `start: 'top bottom'`, `end: 'bottom bottom'`, `scrub: true`. Pas de pin.

| Timeline | Caméra                       | 3D                                                                                                    | DOM                                                                                   |
| -------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 2.0      | (0, −1.5, 12) → (0, −1.5, 0) | Fin des projets : prisme hors cadre en haut, rayons au repos                                          | « 02 / Services », titre, intro                                                       |
| 2.3      | idem                         | Les rayons se rétractent vers le prisme (longueur → 0, `services` 0 → 0.4)                            | 3 colonnes (`data-reveal`, stagger 60 ms) : titre, « à partir de », pour qui, inclus  |
| 2.7      | idem                         | Scène vide, fond noir (pas de rendu continu)                                                          | CTA « Discuter d'un projet » → `#contact`                                             |
| 3.0      | (0, 0, 9) → (0, 0, 0)        | Le prisme redescend au centre (y +3.4 → 0), rotation z −π/2 → 0 (`contact` 0 → 0.5)                   | « 04 / Contact » (À propos s'insère entre les deux en Phase 4 : timeline décalée d'1) |
| 3.5      | (1.2, 0, 8) → (1.2, 0, 0)    | Le faisceau blanc revient par la gauche, aucun rayon coloré : lumière blanche seule. Flottement lent. | Coordonnées (email, téléphone, SIREN) à gauche, formulaire à droite                   |
| 4.0      | idem                         | État final, statique en reduced-motion                                                                | Footer                                                                                |

Note : en Phase 4, About s'insère entre Services et Contact ; la timeline devient services [2, 3], about [3, 4], contact [4, 5]. Les clés caméra de Contact sont alors décalées d'1.

## 3. Arborescence

| Fichier                                     | Propriétaire | Rôle                                                                                     |
| ------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `src/content/site.ts`                       | contrat      | Textes Services (intro, CTA) et Contact (intro, libellés, messages d'état, consentement) |
| `src/sections/Services.tsx` + `.module.css` | ui-dev       | 3 colonnes depuis `services.ts`, ScrollTrigger `services`                                |
| `src/sections/Contact.tsx` + `.module.css`  | ui-dev       | Coordonnées + `ContactForm`, ScrollTrigger `contact`                                     |
| `src/ui/ContactForm.tsx` + `.module.css`    | ui-dev       | Formulaire Netlify Forms, envoi en `fetch`, états (envoi, succès, erreur) avec motion    |
| `src/lib/form.ts` (+ test)                  | ui-dev       | `encodeForm(data)` (urlencoded avec `form-name`), validation pure                        |
| `src/scene/objects/Prism.tsx`               | motion-3d    | Rétractation des rayons (services), retour au centre et lumière blanche seule (contact)  |
| `src/scene/cameraPath.ts`                   | motion-3d    | Clés à 3 et 3.5 (puis décalées d'1 en Phase 4)                                           |

## 4. Contrats

- **Formulaire** : `<form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field">`, avec `<input type="hidden" name="form-name" value="contact">`, un honeypot caché (`bot-field`, `aria-hidden`, hors tabulation), et les champs nom, email, message (`required`, `autocomplete`). Il est présent dans le HTML prérendu, donc Netlify le détecte au déploiement. Sans JS, POST natif. Avec JS : `fetch('/', { method: 'POST', body: encodeForm(...) })`, message de statut en `aria-live="polite"`, et le focus va sur le message de succès.
- **Coordonnées** : `mailto:` de `identity.email` ; `tel:` via `telHref(identity.phone)`, seulement si `isFilled(identity.phone)` ; « SIREN 130 737 356 » en petit ; ville.
- **CTA Services** : lien `#contact` via `scrollToTarget`.
- **Hébergement** : Netlify (Formulaires natifs). Pour alwaysdata : basculer l'action vers Formspree (documenté dans le README en Phase 5).

## 5. Budget

- Aucun asset en plus, ni de dépendance. Le formulaire et les états tiennent dans le JS initial (environ 3 Ko).
- 3D : prisme seul (transmission) pendant le contact, pas d'objets projets montés (`visible = false`).

## 6. Risques

1. **Spam** → honeypot Netlify, sans CAPTCHA (accessibilité).
2. **Détection du formulaire par Netlify** → le formulaire doit être dans le HTML prérendu (c'est le cas) ; vérifier `dist/index.html` au build.
3. **Contraste des champs** → bordures `--fg-2` au repos, `--accent` au focus, libellés toujours visibles (pas de placeholder seul).

## 7. Décisions

- Netlify Forms plutôt que Formspree : aucune clé, aucun script tiers, le formulaire marche sans JS.
- Pas de CAPTCHA : honeypot seul. On ajoutera une protection si le spam devient réel.
- Le téléphone s'affiche puisqu'il est renseigné (`07 82 07 17 88`).
