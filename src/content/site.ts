// Données communes du site, identiques dans les deux langues : domaine, identifiants des sections
// (ancres, partagées par les deux langues pour que la redirection de langue garde le #), et les textes
// de l'easter egg qui ne se traduisent pas (sous-titres en français, HUD en anglais façon SF).
// Les textes traduits vivent dans src/content/fr.ts et en.ts (forme : dictionary.ts).

export type SectionKey = 'hero' | 'projects' | 'services' | 'about' | 'contact'

export const site = {
  url: 'https://mathisboulais.com',
  sections: {
    hero: { id: 'home' },
    projects: { id: 'work' },
    services: { id: 'services' },
    about: { id: 'about' },
    contact: { id: 'contact' },
  } satisfies Record<SectionKey, { id: string }>,
  // Easter egg (code Konami, src/easter/). Nom BoulardTV assumé (décision du 2026-10-06), aucun lien
  // vers la plateforme. Les textes de l'overlay (titre, description, boutons, message de la route) sont
  // traduits : dictionnaires, clé `easter`.
  easter: {
    // Sous-titres des voix, en français comme les voix, sur les deux versions du site (lang="fr" à
    // l'affichage) : index i = SUBTITLES[i] de src/easter/voice.ts (clip et repères). « \n » : retour à
    // la ligne, 42 caractères au plus par ligne.
    subtitles: [
      'Ici Houston… vous me recevez ?',
      'Il y a des millions d’années,\nl’Homme a levé les yeux vers le ciel…',
      '… et il a eu peur.',
      'Puis il a découvert le feu.',
      'Il a inventé la roue,\nl’écriture, les cathédrales.',
      'Il a traversé les océans,\ndompté l’électricité,',
      'il a même posé le pied sur la Lune.',
      'Il a créé Internet…\net des milliards de vidéos.',
      'Des chats. Des tutos. Des clashs.',
      'Mais au fond, l’humanité\ncherchait encore quelque chose.',
      'Une chose plus grande que les étoiles.',
      'Ce soir, après des siècles de recherche…\nnotre radar vient de capter un signal.',
      'Inconnu. Puissant.',
      'Il se rapproche de la Terre\nà une vitesse impossible…',
      'On confirme son identité…',
      'Explorer, vous me recevez ?',
      'Le signal porte un nom…',
      'BoulardTV.',
      'Alors… mesdames et messieurs…\nles portes s’ouvrent… MAINTENANT !',
      'Bienvenue… à BOULARDTV !',
    ],
    // Libellés du HUD du cockpit (beats 4 à 6), décoratifs, en anglais sur les deux versions : l'histoire
    // est dans la description accessible (traduite)
    hud: {
      ship: 'EXPLORER',
      comms: 'HOUSTON · COMMS',
      radar: 'RADAR',
      signal: 'SIGNAL DETECTED',
      unknown: 'UNKNOWN',
      distance: 'DISTANCE',
      velocity: 'VELOCITY',
      identity: 'IDENTITY',
      locked: 'LOCKED',
      name: 'BOULARDTV',
      // Second niveau (docs/storyboards/easter-majestic.md) : invite du final, accès, Sanctuaire
      password: 'AWAITING PASSWORD',
      granted: 'ACCESS GRANTED',
      altitude: 'ALTITUDE',
      signalLevel: 'SIGNAL',
      source: 'SOURCE',
      sanctuary: 'SANCTUARY',
    },
  },
}
