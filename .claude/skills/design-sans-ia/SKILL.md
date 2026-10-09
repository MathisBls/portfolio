---
name: design-sans-ia
description: Règles anti « look IA » du portfolio (demande de Mathis du 2026-10-09). Liste des motifs interdits (pastilles à point lumineux, cartes à bordure arrondie, badges, glassmorphism, barres de défilement visibles…) et leurs remplacements éditoriaux. À lire AVANT toute création ou modification de composant, de CSS ou de texte d'interface, en plus de design-tokens.
---
# Design sans « look IA »

Mathis l'a demandé le 2026-10-09 : « vraiment, faut pas ce genre de truc IA ».

Le site doit avoir l'air **dessiné par une personne avec un parti pris**, comme un magazine, une fiche technique ou une affiche. Il ne doit pas ressembler à un template SaaS généré. Quand tu hésites, choisis la version la plus typographique et la plus sobre, et donne-lui un détail réel et spécifique.

## Interdits (et leur remplacement)

| Motif « IA »                                                                                      | Remplacer par                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pastille arrondie avec point lumineux** (« ● Available for new projects », « ★ 25+ stars »)       | Une ligne de texte mono, sans fond ni bordure, avec un détail vivant et vrai : l'heure locale de Paris qui tourne, un mois précis. Un chiffre se met en avant par la typographie : un grand « 25+ » dans la police display, la légende en petites capitales mono dessous. |
| **Pilules de technos** (React, Expo… dans des capsules)                                            | Une ligne façon fiche technique : `Stack : React Native / Expo / Vite`, en mono, séparateurs fins. Ou une liste à deux colonnes séparées par des filets.             |
| **Cartes à bordure 1 px + grand arrondi + fond légèrement plus clair** (services, formulaire, encadrés) | Pas de boîte. Le contenu se structure par la grille, les espacements et des **filets horizontaux** pleine largeur (1 px, `--line`). Si un contenant est nécessaire : angles droits ou arrondi ≤ 2 px. |
| **Arrondis partout** (`--radius` 14 px, `--radius-lg` 24 px sur les blocs)                          | Angles droits par défaut. L'arrondi est réservé aux éléments qu'on touche (boutons, champs), au plus 4 px, ou totalement rond seulement si c'est un parti pris clair. |
| **Glassmorphism** (flou d'arrière-plan + bordure translucide), ombres portées douces, halos colorés derrière les boutons | Aplats francs sur le fond. La lumière vient de la scène 3D, pas des composants DOM.                                                                                   |
| **Dégradés « néon » sur textes ou bordures**, bordures en dégradé                                   | Couleur unie. Le spectre apparaît seulement par petites touches signifiantes (un trait, un mot), jamais en décoration générique.                                      |
| **Grille de 3 cartes identiques avec une icône** en haut de chacune                                 | Une liste numérotée (01, 02, 03) en typographie, des colonnes asymétriques, des tailles différentes selon l'importance.                                               |
| **Icônes génériques et emoji** (✨ 🚀 ⚡, icônes de check partout)                                  | Pas d'icône décorative. Une flèche typographique (→ ↗) pour un lien sortant, c'est tout.                                                                             |
| **Barre de défilement visible et grise** sur fond sombre                                           | Barre de défilement de la page masquée (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`), remplacée par un indicateur discret de progression du scroll (filet fin). La navigation au clavier, à la molette et au toucher reste intacte. Les zones scrollables internes (liste déroulante) ont une barre fine aux couleurs du thème, ou aucune si le contenu tient. |
| **Tirets « IA »** (retour de Mathis du 2026-10-10) : tiret long « — » ou « – » comme séparateur (« Mathis Boulais — Paris », « 2026 — Projet client »), petit trait décoratif devant une étiquette ou un titre, tiret en guise de puce | Virgule, deux-points, point médian « · » ou retour à la ligne. Rien devant les étiquettes. Listes sans puce, séparées par l'espacement ou des filets. |
| **Formules toutes faites** (« Une seule personne, du début à la fin », « de l'idée à la mise en ligne », « vous parlez à celui qui écrit le code ») | Parler comme une personne : « Je m'appelle Mathis. », ce que j'ai fait, où, pour qui, une promesse vérifiable (« je réponds sous 24 h »). |
| **Textes génériques** (« innovative solutions », « seamless », « cutting-edge », « Let's build something amazing ») | Des phrases concrètes et courtes : ce que je fais, pour qui, en combien de temps, à quel prix. Un vrai nom, un vrai chiffre, un vrai lieu.                            |
| **Tout centré, tout symétrique**                                                                   | Alignement à gauche, grille éditoriale, asymétrie assumée, de grands blancs.                                                                                          |
| **Animations d'entrée identiques sur tout** (fade-up de chaque bloc)                               | Peu d'animations DOM, mais signifiantes : un filet qui se dessine, un chiffre qui se fixe. La scène 3D porte le spectacle.                                            |

## Ce qui fait « humain et moderne » ici

- **Typographie d'abord.** Instrument Serif en grand pour les titres et les chiffres. Mono en petites capitales espacées pour les étiquettes. Inter pour lire.
- **Filets et grille.** Des lignes fines pleine largeur pour séparer, des numéros de section (00 / 01 / 02…), des colonnes qui ne sont pas toutes égales.
- **Détails vrais.** L'heure de Paris, l'année, le nombre réel d'étoiles, le nom réel du client et de la ville.
- **Contraste et retenue.** Noir, blanc cassé, gris. Le spectre est rare, donc précieux.
- **Focus visible et contrastes AA**, toujours (CLAUDE.md, règle 3). Le style ne doit jamais casser l'accessibilité.

## Checklist avant de livrer un composant

1. Y a-t-il une boîte arrondie avec bordure ? Peut-on la remplacer par un filet ou par l'espacement ?
2. Y a-t-il une pastille, un badge ou une pilule ? Peut-on la remplacer par une ligne de texte ?
3. Le texte contient-il un mot creux ? Peut-on le remplacer par un fait ?
4. Une icône est-elle décorative ? Peut-on la supprimer ?
5. À 3 m de l'écran, la page ressemble-t-elle à un template ? Si oui, recommence.

Voir aussi le skill `design-tokens` pour la palette, les polices et les espacements.
