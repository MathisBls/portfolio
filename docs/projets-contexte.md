# Contexte réel des projets et contributions open source

Recherche du 2026-10-09, en lecture seule, pour rédiger les fiches projet (panneau au clic, pages
`/realisations/<slug>/`) et une éventuelle section « Contributions ».

Sources : dépôts locaux (chemins cités), historique git, `gh` authentifié sur le compte `MathisBls`,
API publique GitHub, API App Store (`itunes.apple.com/lookup`), API Thunderstore, en-têtes HTTP des sites.
Les chiffres GitHub sont ceux du 2026-10-09 et bougent.

Légende : tout ce qui n'est pas marqué est vérifié dans la source citée. **[à confirmer par Mathis]** =
non vérifiable depuis le disque ou GitHub, ou contradictoire entre deux sources.

---

## 0. Écarts entre le portfolio actuel et les sources

À lire avant de réécrire `src/content/projects.ts`, `fr.ts` et `en.ts`.

| Projet | Ce que dit le portfolio | Ce que disent les sources |
| --- | --- | --- |
| Zephyr | « module de tirage aléatoire » | C'est un **randomizer multijoueur Archipelago** (génération de seeds, hébergement de parties), pas un tirage au sort. |
| Zephyr | Rien sur l'origine | **Fork de Gale** (`Kesomannen/gale`, 814 étoiles, GPL-3.0), renommé le 2026-03-29. Le README de Zephyr ne cite pas Gale dans ses crédits. |
| Wegir | Stack : NestJS | Pas de NestJS : serveur **Node/Express + Prisma + MySQL + Socket.IO**. NestJS est dans l'app fitness. |
| Wegir | « Mon produit » | L'app est publiée sur l'App Store sous le compte développeur **d'un tiers** (le porteur du projet, auteur du prototype web d'origine). **[à confirmer par Mathis : associé, prestataire, cofondateur ?]** |
| Fitness | « Mon produit » | Le dépôt est rangé dans `perso\Client\` et le cahier des charges parle d'une coach cliente : **projet client**. **[à confirmer par Mathis]** |
| Fitness | « Abonnement premium via l'App Store et Google Play » | Pas encore : l'app n'est sur aucun store, l'iOS n'a jamais été compilé, RevenueCat attend le compte de la cliente (`docs/RESTE-A-FAIRE.md`, 2026-09-07). |
| Fitness | Stack : React Native, Expo | Plus large : Expo + **NestJS 11, Prisma 6, MySQL, Socket.IO**, back-office React. |
| Meme Rina | « J'ai conçu et développé son site » (`seo/meme-rina.ts`) | Le dépôt appartient à un autre compte GitHub ; 3 commits sur 5 viennent d'un autre auteur. **[à confirmer par Mathis : répartition du travail]** |
| Meme Rina | Hébergé sur Netlify | Vérifié : en-tête `Server: Netlify`, `X-Powered-By: Next.js`. Le pied de page du site client indique pourtant OVHcloud (note dans `seo/meme-rina.ts`). |

---

## 1. Zephyr — gestionnaire de mods open source

### Problème et public
Les joueurs PC qui moddent leurs jeux jonglent entre plusieurs sites (Thunderstore, CurseForge, Nexus),
des dossiers BepInEx et des fichiers de configuration à éditer à la main. Zephyr réunit tout dans une
application de bureau : chercher, installer, mettre à jour, ranger par profils, configurer. Public : joueurs
PC moddeurs (Lethal Company, R.E.P.O., Risk of Rain 2…), et auteurs de mods qui veulent publier sans compte
Thunderstore.

### Origine
- Fork de **Gale** (`Kesomannen/gale`, 814 étoiles, GPL-3.0). L'historique git de Gale est importé :
  1 483 commits au total dans `perso\fork\Zephyr`, dont environ 910 de l'auteur de Gale, avant 2026-03.
- Premier commit Prismo : 2026-03-29, « Rebrand project from Gale to Zephyr by Prismo Studio » (Mathis).
- Recommandation : dire « basé sur Gale » sur la fiche. C'est honnête, c'est conforme à l'esprit de la GPL,
  et un recruteur technique le verra de toute façon dans l'historique.

### Ce que Mathis a construit (depuis le fork)
Depuis le 2026-03-28 : **431 commits, dont 351 de Mathis** et 79 de `thefable1` (deuxième membre actif de
l'organisation Prismo-Studio). Attribution par dossier, d'après `git log` :

- **Architecture multi-source** (`src-tauri/src/source/` : adaptateurs Thunderstore, CurseForge, NexusMods,
  registre communautaire) : 13 commits Mathis sur 15. PR #16 « v0.8 multi-source integration (NexusMods +
  CurseForge adapters, Browse source switcher, 4500+ NexusMods games) », fusionnée le 2026-04-03.
  Le README actuel ne cite que Thunderstore et CurseForge dans Browse. **[à confirmer par Mathis : NexusMods
  est-il actif pour les utilisateurs ?]**
- **Randomizer Archipelago** (`src-tauri/src/randomizer/`, runtime Python embarqué, génération de seeds,
  parties locales ou distantes, gestion des joueurs) : 23 commits Mathis, 13 thefable1. Serveur associé
  `Prismo-Studio/randomizer-server` (fork d'Archipelago, MIT) : wrapper HTTP pour l'envoi de seeds et
  l'hébergement distant (commits Mathis du 2026-04-16 et 17, local `perso\fork\archipelago-server`).
- **Synchronisation cloud des profils** : API `zephyr-api` (Express + TypeScript, MySQL, WebSocket, JWT,
  connexion Discord OAuth), 3 commits, tous de Mathis (`perso\SAAS\Zephyr\Prismo-website\zephyr-api\`).
- **Système de plugins** (v1.3.0 du 2026-05-14) : plugins dans une iframe isolée, pont `postMessage`, SDK
  `@zephyr-plugin/sdk` (composants Svelte, jetons de design, client typé), mode développeur avec rechargement
  à chaud, bus d'événements, enregistrement d'écran natif. Dépôt `Zephyr-plugin` : 9 commits Mathis, 12
  thefable1. PR #5 « Add SDK package, scaffold Captures plugin » (Mathis). Le plugin « Captures »
  (enregistrement automatique des parties) est signé MathisBls dans `registry.json`.
- **Registre de mods `zephyr-mods`** : assistant en ligne de commande, empreinte SHA-256 de chaque version,
  CI qui vérifie que l'auteur d'une PR est bien propriétaire du mod. 17 commits Mathis sur 19.
- **Releases multiplateformes** : Windows (NSIS), macOS (dmg), Linux (AppImage, deb, rpm), mise à jour
  automatique. PR #13 « add release manual pipeline ». Dépôt privé `installer-zephyr` (12 commits Mathis).
- **Site vitrine** Nuxt (`Prismo-website`, privé) : 21 commits Mathis sur 24 ; site de documentation (`docs/`).
- Éditeur de configuration BepInEx, profils, 4 thèmes, 7 langues (`messages/` : ar, en, es-ES, fr, pt-BR,
  ru, zh-CN). Une partie vient de Gale. **[à confirmer par Mathis : ce qui est hérité de Gale et ce qui est
  à lui dans ces trois points]**

### Stack réelle
Tauri 2, Rust (édition 2021), SvelteKit 2 + Svelte 5, TypeScript, Paraglide (i18n), Vitest. Back-ends
annexes : Express + MySQL + WebSocket (sync), Python/Archipelago (randomizer), Nuxt (sites).

### Rôle
Mainteneur principal et principal contributeur depuis le fork (81 % des commits), au sein de l'organisation
**Prismo Studios** (4 membres GitHub : MathisBls, thefable1, thomas370, LuluH19).
**[à confirmer par Mathis : intitulé exact du rôle, place de thefable1]**

### Dates
- Fork et renommage : 2026-03-29. Première release publique : 0.7.0 le 2026-04-03.
- Dernière release : v1.3.3 le 2026-08-11. Dernier commit : 2026-08-11.

### Chiffres vérifiables
- **26 étoiles**, 1 fork, licence GPL-3.0 (`gh api repos/Prismo-Studio/Zephyr`).
- **29 releases** publiées, de 0.7.0 à 1.3.3.
- Téléchargements d'installeurs (exe, dmg, deb, rpm, AppImage) cumulés sur toutes les releases : **1 366**,
  dont 817 pour l'installeur Windows (compteur GitHub). Le fichier `latest.json` a été demandé 3 340 fois,
  mais ce sont des vérifications de mise à jour, pas des utilisateurs : ne pas l'afficher comme tel.
- Listé dans **awesome-svelte** (2,2k étoiles), PR #198 fusionnée le 2026-05-30.
- Thunderstore : une fiche `PrismoStudios-Zephyr` existe (créée le 2026-05-06), mais elle est **refusée par la
  modération** dans toutes les communautés. Ne pas écrire « disponible sur Thunderstore ».
- Contributeurs GitHub du dépôt (historique Gale compris) : Kesomannen 910, MathisBls 337, thefable1 79.

### Visuels sur le disque
- `perso\fork\Zephyr\screenshots\` : `dashboard.png`, `browse.png`, `mods.png`, `config.png`, `profile.png`,
  `randomizer.png`, `showgrid.png` ; `screenshots\1.3.0\plugin_page.png`, `button_load_plugin.png`.
- `perso\fork\Zephyr\images\banner.png`, `images\icons\`, `static\logo.png`.
- Portfolio : `public/textures/zephyr/logo.png`.

### Liens publics
- Code : https://github.com/Prismo-Studio/Zephyr (releases : `/releases`)
- Site : https://zephyr.prismo-studios.dev/ · Documentation : https://docs.zephyr.prismo-studios.dev/
- Studio : https://prismo-studios.dev/ · Organisation : https://github.com/Prismo-Studio
- Plugins : https://github.com/Prismo-Studio/Zephyr-plugin · Mods : https://github.com/Prismo-Studio/zephyr-mods

---

## 2. Wegir — navigation GPS en convoi

### Problème et public
Partir à plusieurs véhicules est simple, arriver ensemble beaucoup moins : un feu rouge, une sortie ratée,
une pause carburant, et le groupe se disperse. Wegir garde le convoi groupé : le meneur crée le trajet, les
autres rejoignent avec un code, tout le monde suit le même itinéraire et voit les autres en direct.
Public : groupes en voiture ou à moto, sorties de clubs, départs en vacances à plusieurs.
(Reformulé d'après la description App Store et `CLAUDE.md` du dépôt.)

### Ce que Mathis a construit
- **Reconstruction complète en React Native** à partir d'un prototype web HTML/Leaflet : premier commit de
  Mathis le 2026-06-17, « Rebuild the app as a React Native (Expo) project ».
- Fonctionnalités présentes dans le code (`app/(main)/`, `src/features/`) : convoi (création, code, QR code),
  navigation guidée, positions en direct (Socket.IO), alertes de décrochage, signalements de dangers,
  **talkie-walkie** (LiveKit), cartes hors ligne, partage d'ETA, replay de trajet, amis et messagerie,
  points et succès, premium (RevenueCat), publicité (AdMob), CarPlay (dossier `src/features/carplay/`),
  modération, authentification (téléphone, double facteur).
- Moteur cartographique : MapLibre, style dérivé d'OpenFreeMap recoloré clair/sombre, calcul d'itinéraire par
  **Valhalla auto-hébergé**, avec repli OSRM puis ORS.
- Serveur (`server/`) : Node/Express, Prisma, MySQL (49 modèles), Socket.IO, hébergé chez AlwaysData
  (`api.wegir.com`). Site web Vite + React + MapLibre GL JS (`web/`), back-office Next.js (`admin/`), paquets
  internes `convoy-sync` et `dark-matter-gl-style`.
- 4 langues : fr, en, es, de, avec un test de parité des clés.
- Outil annexe **wegloc-web** (simulateur de trajet GPS pour tester la géolocalisation, `perso\SAAS\wegloc-web`) :
  surtout écrit par un autre contributeur (13 commits sur 15) ; Mathis : 3 commits. Ne pas le présenter comme
  son travail.

### Stack réelle
Mobile : Expo SDK 54, React Native 0.81, React 19.1, TypeScript strict, Expo Router 6, MapLibre React Native
v11, Zustand, TanStack Query, socket.io-client, LiveKit, RevenueCat, AdMob.
Serveur : Node, Express, Prisma, MySQL, Socket.IO. Web : Vite, React, MapLibre GL JS. Admin : Next.js.
Routage : Valhalla, OSRM, ORS.

### Rôle
Développeur principal : 754 des 812 commits locaux viennent des identités de Mathis (`git shortlog`), 652
commits attribués à MathisBls par GitHub sur 800. Trois autres contributeurs ponctuels.
L'app est publiée sous le compte développeur Apple du porteur du projet, pas sous celui de Mathis.
**[à confirmer par Mathis : statut exact (associé, prestataire, CTO), et s'il peut écrire « mon produit »]**

### Dates
- Prototype web : avant 2026-06-17 (commit initial du porteur du projet).
- Reconstruction React Native : depuis le 2026-06-17. Dernier commit : 2026-10-09 (projet actif).
- App Store : première sortie le **2026-09-08**, version 1.0.3 publiée le 2026-10-06.

### Chiffres vérifiables
- **App Store** : en ligne, gratuite, catégorie Navigation, iOS 15.1 minimum, note **5/5 sur 3 notes**
  (vitrine France, `itunes.apple.com/lookup?id=6789985288`).
- **Google Play** : absente (la fiche répond 404). Ticket GitHub #135 « Publier l'application sur l'App Store
  et le Play Store » encore ouvert.
- Dépôt `Weg-r/wegir` : privé, 800 commits, créé le 2026-06-16.

### Visuels sur le disque
- Portfolio : `public/textures/wegir/` (`intro`, `convoi`, `convoit`, `amis`, `qr-code-convoi`,
  `signalement`, en webp). Ce sont les captures de la fiche App Store.
- `perso\clone\wegir\brand\` (logos SVG/PNG), `design\screens\*.html` (maquettes), `design\figma\`,
  `assets\icon.png`.

### Liens publics
- Site : https://wegir.com (titre : « Wegir · Roulez ensemble, restez ensemble »)
- App Store : https://apps.apple.com/app/wegir/id6789985288
- Code : privé (pas de lien). `Weg-r/wegloc-web` est public mais n'est pas le travail de Mathis.

---

## 3. Application de coaching sportif (nom encore secret)

### Identification
- **Ce n'est pas TrainMeAI.** L'app décrite dans le portfolio (programmes du gratuit au coaching personnalisé,
  nutrition avec les macros, mensurations et photos de progression) correspond à
  `perso\Client\fitness_kass` (dépôt privé `MathisBls/fitness_kass`). Le README a encore un titre provisoire
  « Project name » : l'app n'a pas de nom.
- **TrainMeAI** (`perso\SAAS\TrainMeAI`, privé) est un projet plus ancien et différent : site marketing,
  application web React/Vite, API Express + MySQL + OpenAI, appli mobile Expo. 39 commits du 2026-01-04 au
  2026-01-21. Le domaine trainmeai.com répond mais renvoie une page quasi vide.
  **[à confirmer par Mathis : projet abandonné ? à montrer ou non ?]**

### Problème et public
Une coach sportive veut vendre ses programmes et suivre ses clients dans sa propre application, au lieu de
PDF et de messages. Trois profils : utilisateur gratuit, abonné premium, client en coaching personnalisé
(programme écrit par la coach, bilan hebdomadaire, objectifs nutritionnels).

### Ce que Mathis a construit
- Monorepo : appli mobile, API, back-office web pour la coach.
- Séances : exercices, vidéos de démonstration, séries, répétitions, repos, RIR, performances précédentes,
  validation série par série, échange d'un exercice contre son alternative.
- Progression : poids, mensurations, photos, performances. Nutrition : calories, protéines, glucides,
  lipides, historique jour par jour.
- Coaching : programmes assignés par la coach (avec notification), bilans hebdomadaires, temps réel.
- Tests : 35 tests unitaires et 11 tests d'intégration côté serveur, 44 tests mobiles ; environ 70 des 151 cas
  de test manuels déroulés (`docs/RESTE-A-FAIRE.md`, 2026-09-07).

### Stack réelle
Mobile : Expo SDK 57, React Native 0.86, Expo Router, Zustand, TanStack Query, Reanimated, socket.io-client,
expo-notifications. Serveur : **NestJS 11**, Prisma 6, MySQL (33 modèles), Socket.IO, Nodemailer.
Back-office : Vite 8, React 19, React Router 7, TanStack Query.

### Rôle
Seul développeur : 118 commits sur 118. Projet client. **[à confirmer par Mathis : client ou associé ?
peut-on dire que c'est un projet client sans nommer la cliente ?]**

### Dates
Du 2026-08-30 au 2026-09-11 (dernier commit). En développement.

### Chiffres vérifiables
Aucune présence sur les stores. Bloqué par des comptes externes à ouvrir côté cliente (Apple Developer,
RevenueCat, Cloudinary, SMTP) et côté Mathis (Firebase, EAS, Google Sign-In, build iOS).

### Visuels sur le disque
Portfolio : `public/textures/fitness/` (`home`, `programs`, `nutrition`, `progress`, `profile`, en webp).

### Liens publics
Aucun (dépôt privé, pas de store, pas de site).

---

## 4. Game Factory — chaîne d'agents IA qui fabrique des jeux Godot

### Problème et public
Fabriquer des jeux mobiles hypercasual demande toujours les mêmes étapes : spécification, tickets, code,
relecture, tests, build. Game Factory les confie à des agents IA, encadrés par des règles écrites. Un humain
valide le concept, le système crée le dépôt, écrit le cahier de jeu en tickets, développe, relit, corrige,
construit l'APK et teste ; l'humain revient seulement pour fusionner ou trancher. Public : Mathis lui-même
(et son studio), et les développeurs curieux d'orchestration d'agents.

### Ce que Mathis a construit
- **Une charte en 8 chapitres** (`charte/00` à `07` : principes, tableau, pipelines, définition de « fini »,
  conventions, contrat d'asset, budgets, garde-fous) et dix règles. Exemple : le modèle lit, juge et code,
  mais n'écrit jamais lui-même sur GitHub ; les scripts s'en chargent.
- **10 pipelines** (`pipelines/` : concept, spec, triage, dev, review, qa, assets, build, bootstrap,
  post-launch), chacune avec son `PROMPT.md`.
- **Orchestrateur Node** (`orchestrator/run.mjs`) : scan des tickets, revendication, préparation de branche,
  lancement de Claude Code en mode headless ou d'un LLM (Ollama ou Anthropic), lecture d'un rapport JSON,
  commit, PR, labels, chaînage. Hooks de sécurité (écriture protégée, lecture seule, QA), budgets par ticket,
  traces signées `<!-- gf:… -->`, tableau de bord de coûts.
- **13 workflows GitHub Actions**, runner auto-hébergé en **Docker** (Node, Claude Code, Godot, SDK Android,
  adb, Maestro) avec Ollama.
- **Un template de jeu Godot 4** (`game-template`, privé) : écrans communs, sauvegarde versionnée, publicité,
  achats intégrés, i18n, tests GUT, contrôle d'assets, export Android, parcours Maestro.
- **Deux jeux produits par l'usine** (dépôts privés) :
  - *Crown Roll* : runner 3D, une boule sur une piste qui défile, couronnes, boutique de skins, game over,
    réglages. 77 commits, 41 PR.
  - *Pin Rescue* : puzzle « retirer les tiges », moteur de simulation déterministe, solveur, générateur de
    60 niveaux filtrés par le solveur, éditeur de niveaux, fluides animés par shader, carte de niveaux.
    92 commits, 46 PR.
  Dans ces deux dépôts, les PR sont ouvertes sous le compte MathisBls mais générées par l'usine (auteur de
  commit « Game Factory » : 31 commits sur Crown Roll, 46 sur Pin Rescue).

### Stack réelle
Claude Code (headless), Node.js (ESM), GitHub Actions et API REST, Docker, Ollama, Godot 4.7, GDScript,
GUT, Maestro, SDK Android, Blender en Python (assets).

### Rôle
Concepteur et auteur de l'usine : dépôt `game-factory`, 62 commits, 36 signés Mathis, 26 signés Claude.
Le README partage le travail entre une « personne A (usine) » et une « personne B (jeu) », et
`docker/INSTALL-COEQUIPIER.md` mentionne un coéquipier. **[à confirmer par Mathis : y a-t-il une personne B,
et qui a fait le template de jeu ?]**

### Dates
2026-09-18 → 2026-09-21. Les deux jeux ont été produits en trois jours.

### Chiffres vérifiables
- `Prismo-Studio/game-factory` : public, 1 étoile, 62 commits.
- Crown Roll : 41 PR, Pin Rescue : 46 PR. Aucun jeu publié : aucune release, et la fiche Play Store de
  Pin Rescue est encore un ticket ouvert (#27).

### Visuels sur le disque
Aucune capture de jeu. Seulement les textures des modèles 3D (`C:\Users\Asuki\game_factory\pin-rescue\game\assets\models\…`)
et des `icon.svg`. Pour une fiche, il faudra des captures ou une courte vidéo. **[à fournir par Mathis]**

### Liens publics
- https://github.com/Prismo-Studio/game-factory (les jeux et le template sont privés)

---

## 5. Meme Rina — site d'une pizzeria à Chatou

### Problème et public
Une pizzeria de quartier à Chatou (78) qui doit être trouvée sur Google et répondre aux questions avant
l'appel : la carte, les horaires, la réservation, la commande en livraison. Public : les habitants de Chatou
et des communes voisines.

### Ce qui a été construit
Site one-page (README du dépôt) : hero avec vidéo de fond, présentation, carte des pizzas pilotée par les
données, formulaire de réservation et formulaire de contact (routes API + envoi d'e-mails), liens Uber Eats
et Deliveroo, Google Maps et horaires, données structurées Schema.org `Restaurant`, sitemap, bandeau cookies
RGPD, mentions légales en fenêtres modales.

### Stack réelle
Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui, Framer Motion, React Hook Form + Zod,
Nodemailer. Hébergement : **Netlify** (vérifié par les en-têtes HTTP le 2026-10-09).

### Rôle
**[à confirmer par Mathis]**. Le dépôt (`perso\SAAS\meme-rina-site`, privé) appartient à un autre compte
GitHub. 5 commits : les 3 premiers (2026-03-06, création du projet, plan, médias) viennent d'un autre auteur ;
les 2 de Mathis ajoutent l'envoi d'e-mails Nodemailer et des composants date/sélection (2026-03-09) puis une
mise à jour (2026-03-22). Il faut savoir qui a conçu et développé quoi avant de garder « J'ai conçu et
développé son site ».

### Dates
2026-03-06 → 2026-03-22. **[à confirmer par Mathis : date de mise en ligne]**

### Chiffres vérifiables
Site en ligne (HTTP 200). Aucun chiffre de trafic ou de réservations disponible.

### Visuels sur le disque
- Portfolio : `public/textures/memerina/site-1.webp`, `site-2.webp`, `site-3.webp`.
- `perso\SAAS\meme-rina-site\public\images\` : logos, `pizza-01` à `04`, `salle.png`, `ambiance-01.png` ;
  `public\video\hero.mp4`. Ce sont les photos du client : à n'utiliser qu'avec son accord.

### Liens publics
https://www.memerina.fr/

---

## 6. Contributions open source

### Recherche
`gh search prs --author MathisBls` et l'API `search/issues` (132 PR hors dépôts personnels et Prismo-Studio),
recherche ciblée sur `OpenCut-app/OpenCut`, `SteamClientHomebrew/Millennium` et
`SteamClientHomebrew/PluginDatabase`, dossiers `perso\opensource`, `perso\fork`, `perso\mods`.

### Contributions à des projets tiers

| Dépôt (étoiles) | PR | État | Date | Apport |
| --- | --- | --- | --- | --- |
| OpenCut-app/OpenCut (93,3k) | [#518](https://github.com/OpenCut-app/OpenCut/pull/518) « restore horizontal scroll sync after Radix ScrollArea removal » | **fusionnée** le 2025-08-05 | 2025-08-04 | Corrige une régression : la règle de la timeline ne suivait plus le défilement horizontal des pistes (ticket #517). 1 fichier, +3 / −9 lignes. |
| OpenCut-app/OpenCut | [#524](https://github.com/OpenCut-app/OpenCut/pull/524) « fix prevent timeline playhead freeze \| dynamic buffer » | fermée sans fusion (2025-08-13) | 2025-08-05 | Proposait une marge de timeline dynamique pour que la tête de lecture ne se fige plus après 20 s (ticket #523). |
| SteamClientHomebrew/PluginDatabase (97 ; catalogue officiel de Millennium, 4,4k) | [#150](https://github.com/SteamClientHomebrew/PluginDatabase/pull/150) « Add NicePrice » | **ouverte**, en attente | 2026-03-28 | Inscription de son plugin NicePrice au catalogue. Corrigé après la revue d'un mainteneur, validé par un testeur le 2026-03-29 ; message automatique du 2026-05-25 : revue reportée après la sortie de Millennium 3.0.0. |
| TheComputerM/awesome-svelte (2,2k) | [#198](https://github.com/TheComputerM/awesome-svelte/pull/198) « Add Zephyr » | **fusionnée** le 2026-05-30 | 2026-05-07 | Ajoute Zephyr à la liste. |
| tauri-apps/awesome-tauri (8,1k) | [#699](https://github.com/tauri-apps/awesome-tauri/pull/699) « Add Zephyr to Gaming » | fermée sans fusion (2026-08-20) | 2026-05-07 | Refus de principe : la liste n'accepte plus d'applications. |
| Circule-studio/Gauntlet-Challenge (1) | #1 « Feat/UI refonte » | fermée sans fusion | 2026-05-01 | Refonte d'interface (+2 152 / −885), non retenue. |

**Millennium** : aucune contribution au framework lui-même (`SteamClientHomebrew/Millennium`). La contribution
réelle est un **plugin** pour son écosystème :

- **NicePrice** (https://github.com/MathisBls/NicePrice) : affiche dans Steam (bibliothèque et magasin) les
  meilleurs prix de plus de 30 boutiques et les plus bas historiques, via l'API GG.deals. Frontend TypeScript,
  backend Lua. **8 étoiles**, 5 releases (v1.0.0 le 2026-03-30 → v1.2.0 le 2026-06-15), 38 téléchargements
  d'assets. Attention : le README indique « cherchez NicePrice dans le navigateur de plugins Millennium »,
  ce qui ne marchera qu'après la fusion de la PR #150.

### Autres projets open source à lui
- **Zephyr** et son écosystème (voir §1) : c'est sa contribution open source principale, et de loin.
- **R.E.P.O. Injury System** (https://github.com/MathisBls/R.E.P.O-injury-system) : mod BepInEx en C# qui
  ajoute des blessures par partie du corps (vision floue, prise affaiblie, vitesse, endurance). v1.0.1 du
  2026-05-08, publié dans le registre `zephyr-mods` (seul mod du registre). 0 étoile.
- **randomizer-server** (https://github.com/Prismo-Studio/randomizer-server) : fork d'Archipelago adapté à
  l'hébergement distant pour Zephyr.

### Hors open source (pour mémoire)
Plus d'une centaine de PR fusionnées en 2024-2025 dans l'organisation `freelancersProjects` (surtout
`Oxymore-Web`, plateforme e-sport : équipes, tournois, messagerie WebSocket, notifications ; aussi
`Aevoria-front`, `alphorn_project`, `portfolio_melchior`). Ce sont des projets d'équipe ou de clients, pas
des contributions communautaires. Les autres PR (`axellelanca/urlshortener_2025`,
`lucastreille/*`) relèvent de projets d'école.

### Une section « Contributions » vaut-elle la peine ?
Pas en section à part, à ce stade. Le seul apport de code fusionné dans un dépôt connu est le correctif
OpenCut (12 lignes), l'apport Millennium est un plugin personnel en attente d'inscription, et le reste sont
des ajouts à des listes. Une section entière paraîtrait gonflée.

Proposition : une ligne « Open source » dans À propos ou en bas de la fiche Zephyr, au libellé exact :
« Mainteneur de Zephyr (fork de Gale) · auteur de NicePrice, plugin pour Millennium · un correctif fusionné
dans OpenCut ». À revoir si la PR #150 est fusionnée ou si d'autres PR passent dans des dépôts tiers.

---

## 7. Questions pour Mathis

1. **Wegir** : quel est ton statut (associé, prestataire, CTO) ? Peut-on écrire « mon produit » alors que l'app
   est publiée sous le compte d'un tiers ? Une sortie Google Play est-elle prévue ?
2. **Fitness** : projet client confirmé ? Peut-on le montrer, et comment le décrire sans nommer la cliente ?
   Il faut retirer « abonnement via l'App Store et Google Play » tant que ce n'est pas en ligne.
3. **TrainMeAI** : projet abandonné, ou à montrer ?
4. **Zephyr** : d'accord pour écrire « basé sur Gale » ? NexusMods est-il actif ? Quel est ton rôle exact par
   rapport à thefable1 ?
5. **Game Factory** : qui est la « personne B » ? Peux-tu fournir des captures ou une vidéo de Crown Roll et
   de Pin Rescue ?
6. **Meme Rina** : qui a fait quoi (le dépôt et les premiers commits viennent d'un autre compte) ? Date de mise
   en ligne ? Accord du client pour utiliser ses photos ?
7. **Contributions** : d'autres PR sous un autre compte ou un autre e-mail, que la recherche n'aurait pas vues ?
