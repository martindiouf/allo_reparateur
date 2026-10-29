# Mise en route Supabase

> **État actuel** : le projet `allo-reparateur` (région Paris) est déjà créé, la migration appliquée, et le fichier `.env` fourni dans le zip contient son URL et sa clé publique.
> **Il reste une seule action manuelle** : l'étape 3 ci-dessous (désactiver « Confirm email »). Les étapes 1, 2 et 4 sont déjà faites : elles ne servent que pour recréer le projet ailleurs (par exemple une version de test).

## 1. Créer le projet
1. Sur [supabase.com](https://supabase.com) → **New project**.
2. Région : **Europe (Paris ou Londres)**, la plus proche de Dakar.
3. Notez le mot de passe de la base (il ne sert pas à l'application).

## 2. Créer les tables et la sécurité
**SQL Editor** → **New query** → collez tout le contenu de `supabase/migrations/0001_init.sql` → **Run**.
Cela crée les tables, les règles de sécurité, les fonctions et le stockage privé `request-media`.

## 3. Régler l'authentification
**Authentication → Providers → Email** :
- Désactiver **Confirm email** (les comptes utilisent le numéro de téléphone, pas de vrai e-mail).
- Garder **Enable Email provider** activé.

## 4. Brancher l'application
**Project Settings → API** : copiez *Project URL* et la clé *anon public*.

```bash
cp .env.example .env     # puis remplissez les deux valeurs
npm install
npm run dev
```

Pour la mise en ligne (Vercel, Netlify…), ajoutez les mêmes deux variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les réglages de l'hébergeur, puis `npm run build`.

## Comment ça marche
- **Aucun accès direct aux tables** depuis le navigateur : tout passe par des fonctions qui vérifient qui appelle.
- Le **téléphone et l'adresse précise** ne sont renvoyés qu'après acceptation de l'artisan (le serveur les supprime de la réponse, ce n'est pas seulement caché à l'écran).
- Messages vocaux et photos : bucket **privé**, lisibles uniquement par le client et l'artisan destinataire (liens signés d'1 heure). Photos réduites à ~200 Ko avant envoi.
- Les demandes **expirent** côté serveur après 15 min (« dès que possible »), 2 h (aujourd'hui) ou 24 h (demain).
- L'application se synchronise toutes les 8 s quand une demande est en cours (ou quand un artisan est disponible), 30 s sinon.
- Un client ne peut avoir qu'**une demande en attente** à la fois.

## Espace administrateur
La migration `0002_admin.sql` ajoute le rôle administrateur, un journal des actions (`admin_actions`) et les fonctions `admin_*` (chacune vérifie le rôle côté serveur).

**Créer le premier administrateur** (le rôle ne peut être donné que depuis le SQL Editor) :
1. Créez un compte normal dans l'appli (espace client) avec le numéro voulu.
2. Dans Supabase → SQL Editor :

```sql
update profiles set role = 'admin' where phone_number = '+221771234567';
```
3. Sur la page d'accueil, cliquez « Accès administrateur » et connectez-vous avec ce numéro.

L'admin peut : voir les statistiques, valider / refuser / suspendre les artisans (avec note interne invisible pour eux), consulter et annuler les demandes, activer ou non la validation automatique, lire le journal.

## Vérification des artisans
Réglage « validation automatique » (page Réglages, ou `app_settings.auto_verify_repairmen`) :
- activée (par défaut) : un artisan est visible dès son inscription ;
- désactivée : il reste « en vérification » jusqu'à validation dans l'onglet Artisans.

## Limites connues / prochaines étapes
- **Mot de passe oublié** : impossible sans e-mail ni SMS. Pour l'instant, un administrateur doit le réinitialiser depuis *Authentication → Users*. À terme : connexion par code SMS/WhatsApp.
- **Notifications WhatsApp** : les événements sont déjà enregistrés dans `notification_logs` (statut `queued`). Reste à écrire l'Edge Function d'envoi (WhatsApp Cloud API).
- **Rétention des fichiers** (7 jours) : à planifier avec une Edge Function ou un job (supprimer via l'API Storage, pas en SQL).
- **Inscription d'un artisan par l'admin** (assistée) : non incluse, elle demande une Edge Function avec la clé service-role.
