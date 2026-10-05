# Storyboard — À propos et Mentions légales (Phase 4)

## 1. Intention

À propos : rassurer en 10 s (une personne réelle, basée en Île-de-France, qui livre du début à la fin et qui est disponible). Mentions légales : conformes LCEN et RGPD, sobres, générées depuis `identity`.

## 2. Storyboard scroll (About)

Progress `about` (timeline 3 → 4, Contact passe à 4 → 5), ScrollTrigger `start: 'top bottom'`, `end: 'bottom bottom'`, `scrub: true`. Pas de pin. La 3D reste calme : les rayons sont rétractés, le prisme est hors cadre et ne redescend qu'avec Contact.

| about | Caméra | 3D             | DOM                                                                                             |
| ----- | ------ | -------------- | ----------------------------------------------------------------------------------------------- |
| 0.0   | fixe   | rien à l'écran | « 03 / À propos », titre                                                                        |
| 0.3   | fixe   | —              | 4 lignes de texte (`data-reveal`, stagger)                                                      |
| 0.6   | fixe   | —              | Stack en chips mono (déduite des projets, sans doublon), badge « Disponible pour des missions » |
| 1.0   | fixe   | —              | Contact arrive                                                                                  |

## 3. Arborescence

| Fichier                                  | Propriétaire | Rôle                                                       |
| ---------------------------------------- | ------------ | ---------------------------------------------------------- |
| `src/content/site.ts`                    | contrat      | `site.about` (4 lignes, libellés), `site.legal` (sections) |
| `src/content/services.ts`                | contrat      | `identity` : + `status`, `address` (TODO), `host`          |
| `src/lib/stack.ts` (+ test)              | ui-dev       | `uniqueStack(projects)` : stack dédupliquée, ordre stable  |
| `src/sections/About.tsx` + `.module.css` | ui-dev       | Section About                                              |
| `src/app/LegalPage.tsx` + `.module.css`  | ui-dev       | Mentions légales complètes                                 |
| `src/scene/cameraPath.ts`                | motion-3d    | Décalage des clés de Contact (+1)                          |

## 4. Contenu (aucun fait inventé)

- About, 4 lignes, à valider par Mathis :
  1. Développeur full stack basé à Choisy-le-Roi, en Île-de-France.
  2. Je construis mes propres produits : une app de navigation publiée sur l'App Store, un gestionnaire de mods open source, une ROM Android, une chaîne de création de jeux par agents IA.
  3. Et des sites pour des commerces, comme Meme Rina, pizzeria à Chatou.
  4. Un seul interlocuteur, du design au déploiement. Disponible pour des missions.
- Mentions légales :
  - **Éditeur** : Mathis Boulais, entrepreneur individuel (micro-entreprise), SIREN 130 737 356, adresse `TODO: adresse professionnelle`, email, téléphone. **Directeur de la publication** : Mathis Boulais.
  - **Hébergeur** : Netlify, Inc. (adresse à vérifier sur le site de Netlify au moment de la rédaction).
  - **Données personnelles** : le formulaire collecte nom, email et message, utilisés uniquement pour répondre ; stockage chez Netlify (Forms) ; droits d'accès, de rectification et de suppression par email ; durée de conservation `TODO: à valider (proposition : 12 mois)`.
  - **Cookies** : aucun cookie ni traceur.
  - **Propriété intellectuelle et crédits** : contenus et modèles 3D © Mathis Boulais ; polices Instrument Serif, Inter et JetBrains Mono sous licence SIL OFL 1.1.

## 5. Budget

Aucun asset, aucune dépendance. La page mentions légales ne charge ni la scène, ni Lenis, ni GSAP (`HomePage` seulement).

## 6. Risques

1. **Mentions incomplètes** (adresse) → `TODO:` visible et listé ; à renseigner avant la mise en ligne.
2. **Hébergeur** : si Mathis choisit alwaysdata, changer `identity.host` (alwaysdata, 91 rue du Faubourg Saint-Honoré, 75008 Paris, à vérifier).

## 7. Décisions

- Stack de l'About calculée depuis `projects.ts` : une seule source, aucun doublon à maintenir.
- Mentions légales générées depuis `identity` et `site.legal` : aucun texte en dur dans le composant.
