# Allô Réparateur — Application web

Application web responsive (téléphone, tablette, ordinateur) de dépannage à domicile rapide à Dakar et au Sénégal (Électriciens, Plombiers, Maçons, Menuisiers, Peintres, Climaticiens).

---

## 🚀 Démarrage Rapide

### Prérequis
- [Node.js](https://nodejs.org/) (version 18+ recommandée)
- npm

### Installation & Lancement

1. Dézippez le dossier et ouvrez un terminal dans le répertoire du projet.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
4. Ouvrez votre navigateur sur [http://localhost:3000](http://localhost:3000).

---

## 📱 Compatibilité

L'application s'adapte automatiquement à l'écran, sans « châssis » de démonstration :

- **Téléphone** (dès 320 px) : une colonne, barre de navigation en bas, boutons d'au moins 44 px, champs en 16 px (pas de zoom automatique sur iPhone).
- **Tablette** : grilles à 2 colonnes, navigation en haut.
- **Ordinateur** : contenu centré (1152 px max), écrans de suivi et d'espace artisan en 2 colonnes.
- Le bouton « retour » du téléphone/navigateur fonctionne (navigation par URL `#/screenX`).
- Connexion par numéro de téléphone + mot de passe ; la session est conservée après fermeture.
- Zoom autorisé, focus clavier visible, animations réduites si demandé par le système.

## 🧭 Parcours

1. **Accueil** : « Je cherche un artisan » ou « Je suis artisan ».
2. **Client** : compte → profil → choix du métier → artisans disponibles → demande (voix, texte, photo, créneau) → suivi.
3. **Artisan** : compte → inscription → espace artisan (interrupteur « Je suis disponible », demandes reçues, accepter/refuser, coordonnées du client débloquées après acceptation, historique).

## 🗄️ Backend Supabase

Les comptes, artisans, demandes, messages vocaux et photos sont stockés dans **Supabase**. Guide pas à pas : `supabase/README.md`.

```bash
cp .env.example .env   # renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm install && npm run dev
```

À faire ensuite : notifications WhatsApp (Edge Function), mot de passe oublié par SMS/WhatsApp, vraies voix wolof enregistrées.

---

## 🛠️ Stack Technique
- React 18 + Vite, Tailwind CSS (responsive), Supabase (Auth, PostgreSQL, Storage), Lucide React, Leaflet + OpenStreetMap, MediaRecorder / Web Audio.
- Build de production : `npm run build` (dossier `dist/`, à déployer sur n'importe quel hébergement statique).

## 📄 Documentation d'Architecture & Spécifications Backend
- **Conception Technique & Analyse terrain** : `docs/conception_technique_allo_reparateur.md`
- **Schéma SQL PostgreSQL & API Supabase** : `docs/architecture_backend_api_supabase.md`

## Espace administrateur
Voir `supabase/README.md` (création du premier admin, fonctions, réglages). Accès : page d'accueil → « Accès administrateur ».
