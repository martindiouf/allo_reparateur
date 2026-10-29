// Métiers disponibles et référentiel
export const TRADES = [
  {
    id: 'electricien',
    name: 'Électricité',
    wolof: 'Kurã',
    icon: 'Zap',
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Court-circuit, disjoncteur, prises, tableau électrique'
  },
  {
    id: 'plombier',
    name: 'Plomberie',
    wolof: 'Tiyoo',
    icon: 'Droplets',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Fuite d\'eau, robinetterie, chauffe-eau, tuyaux bouchés'
  },
  {
    id: 'macon',
    name: 'Maçonnerie',
    wolof: 'Māson',
    icon: 'Hammer',
    color: 'bg-stone-600',
    lightColor: 'bg-stone-50 text-stone-700 border-stone-200',
    description: 'Fissures, carrelage, crépissage, réparations de murs'
  },
  {
    id: 'menuisier',
    name: 'Menuiserie',
    wolof: 'Tabala / Bóoy',
    icon: 'SquareDashedBottomCode',
    color: 'bg-amber-700',
    lightColor: 'bg-amber-50 text-amber-900 border-amber-200',
    description: 'Portes bloquées, serrures, fenêtres, placards, bois et alu'
  },
  {
    id: 'peintre',
    name: 'Peinture',
    wolof: 'Pentir',
    icon: 'Paintbrush',
    color: 'bg-emerald-600',
    lightColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Retouches humidité, peinture intérieure/extérieure, vernis'
  },
  {
    id: 'climaticien',
    name: 'Climatisation',
    wolof: 'Klima',
    icon: 'Wind',
    color: 'bg-cyan-600',
    lightColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Recharge gaz, clim qui coule, split en panne, entretien'
  }
];

// Quartiers de Dakar et banlieue
export const QUARTERS = [
  'Médina',
  'Ouakam',
  'Almadies',
  'Plateau',
  'Mermoz',
  'Sacré-Cœur',
  'Yoff',
  'Grand Yoff',
  'Parcelles Assainies',
  'Fann-Point E',
  'Pikine',
  'Guédiawaye'
];

// Coordonnées GPS réelles pour le repérage cartographique à Dakar
export const QUARTER_COORDINATES = {
  'Médina': { lat: 14.6853, lng: -17.4472, landmark: 'Rond-point Poste Médina / Rue 6 x 11' },
  'Ouakam': { lat: 14.7231, lng: -17.4894, landmark: 'Monument de la Renaissance / Cité Comico' },
  'Almadies': { lat: 14.7462, lng: -17.5212, landmark: 'Route des Almadies / Arrêt King Fahd' },
  'Plateau': { lat: 14.6710, lng: -17.4334, landmark: 'Place de l\'Indépendance / Avenue Pompidou' },
  'Mermoz': { lat: 14.7112, lng: -17.4725, landmark: 'Cité Keur Gorgui / Près Sonatel' },
  'Sacré-Cœur': { lat: 14.7185, lng: -17.4611, landmark: 'Boulangerie Jaune / Rond-point Jamm' },
  'Yoff': { lat: 14.7570, lng: -17.4682, landmark: 'Plage de Yoff / Village traditionnel' },
  'Grand Yoff': { lat: 14.7335, lng: -17.4485, landmark: 'Croisement 22 / Marché Grand Yoff' },
  'Parcelles Assainies': { lat: 14.7641, lng: -17.4370, landmark: 'Unité 15 / Rond-point Case Bi' },
  'Fann-Point E': { lat: 14.6930, lng: -17.4640, landmark: 'Canal IV / Piscine Olympique' },
  'Pikine': { lat: 14.7540, lng: -17.3950, landmark: 'Bountou Pikine / Complexe Léopold S. Senghor' },
  'Guédiawaye': { lat: 14.7780, lng: -17.3910, landmark: 'Hamo 4 / Stade Amadou Barry' }
};


export const VOICE_GUIDES = {
  screen1: {
    title: 'Aide à l\'inscription',
    wolof: 'Bindal sa tur ak sa nimero WhatsApp, ak sa gox ngir ñu mën la yégle.',
    french: 'Entrez votre nom complet, votre numéro WhatsApp et votre quartier pour créer votre compte.'
  },
  screen2: {
    title: 'Choix du métier',
    wolof: 'Tannal li nga bëgg ñu defar : kurã, tiyoo, māson, tabala, pentir walla klima.',
    french: 'Choisissez le métier correspondant à votre panne : électricité, plomberie, maçonnerie, etc.'
  },
  screen4: {
    title: 'Enregistrement vocal du problème',
    wolof: 'Pesel butoŋu mikro bi, waxal sa jafe-jafe ci 1 simili, bu noppee pesel ko ngir taxawal.',
    french: 'Appuyez sur le micro et décrivez votre panne oralement en moins d\'une minute, puis réécoutez-le.'
  },
  screen6: {
    title: 'Inscription réparateur',
    wolof: 'Bindal sa liggéey ak sa gox yi ngay liggéeye, ak waxtu yi nga fekk baax.',
    french: 'Indiquez vos métiers, vos zones d\'intervention et vos horaires de travail habituels.'
  },
  screen7: {
    title: 'Tableau des demandes',
    wolof: 'Su ñu la yéglee jafe-jafe, deglul mesass vokal bi, nga nangu ko walla nga bañ.',
    french: 'Écoutez le message vocal du client et cliquez sur Accepter ou Refuser dans le délai imparti.'
  }
};
