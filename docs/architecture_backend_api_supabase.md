# Architecture Backend, Schéma PostgreSQL & API REST — Allô Réparateur

Ce document définit les spécifications complètes de l'infrastructure backend d'**Allô Réparateur** sur **Supabase (PostgreSQL 15+, Auth, Storage, Edge Functions, Realtime)**, intégrant l'ensemble des ajustements validés.

---

## 1. Schéma Relationnel & DDL PostgreSQL (Prêt pour Supabase)

Le schéma garantit l'intégrité référentielle, le masquage strict des données sensibles (numéros de téléphone et adresses précises) et la rapidité des requêtes de filtrage géographique.

```sql
-- Extension pour la génération d'UUIDs et fonctions cryptographiques
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Énumérations
CREATE TYPE user_role AS ENUM ('client', 'repairman', 'admin');
CREATE TYPE craft_trade AS ENUM ('electricien', 'plombier', 'macon', 'menuisier', 'peintre', 'climaticien', 'autre');
CREATE TYPE timing_preference AS ENUM ('asap', 'today', 'tomorrow');
CREATE TYPE request_status AS ENUM ('en_attente', 'acceptee', 'refusee', 'annulee', 'terminee', 'expiree');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE notif_channel AS ENUM ('whatsapp', 'sms', 'in_app');
CREATE TYPE notif_status AS ENUM ('queued', 'sent', 'delivered', 'failed');

-- 1. Table des profils utilisateurs (complète auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'client',
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL UNIQUE, -- Identifiant de connexion WhatsApp/SMS
    city_or_quarter TEXT NOT NULL,     -- Ex: Médina, Ouakam, Mermoz, Parcelles
    address_landmark TEXT,             -- Point de repère ou rue
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Profil détaillé des réparateurs
CREATE TABLE public.repairman_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    primary_trade craft_trade NOT NULL,
    secondary_trade craft_trade,       -- Ajustement validé : 1 métier secondaire optionnel
    intervention_zone TEXT NOT NULL,    -- Ex: Dakar-Centre, Almadies, Guédiawaye
    available_days JSONB NOT NULL DEFAULT '["lundi","mardi","mercredi","jeudi","vendredi","samedi"]'::jsonb,
    start_hour TIME NOT NULL DEFAULT '08:00',
    end_hour TIME NOT NULL DEFAULT '19:00',
    is_active BOOLEAN NOT NULL DEFAULT true, -- Interrupteur "Je suis disponible"
    verification_status verification_status NOT NULL DEFAULT 'pending',
    diagnostic_fee_fcfa INT NOT NULL DEFAULT 2500, -- Ajustement validé : forfait indicatif
    rating_score NUMERIC(2,1) NOT NULL DEFAULT 5.0,
    completed_jobs_count INT NOT NULL DEFAULT 0,
    magic_auth_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'), -- Pour accès 1-clic WhatsApp
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Table des demandes d'intervention
CREATE TABLE public.requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    repairman_id UUID NOT NULL REFERENCES public.repairman_profiles(id) ON DELETE RESTRICT,
    trade craft_trade NOT NULL,
    written_description TEXT,          -- Facultatif si message vocal présent
    photo_url TEXT,
    timing timing_preference NOT NULL DEFAULT 'asap',
    intervention_address TEXT NOT NULL,
    quarter TEXT NOT NULL,
    diagnostic_fee_fcfa INT NOT NULL DEFAULT 2500,
    status request_status NOT NULL DEFAULT 'en_attente',
    response_deadline TIMESTAMPTZ NOT NULL, -- 15 min si 'asap', 2h si 'today', 24h si 'tomorrow'
    rebound_from_request_id UUID REFERENCES public.requests(id), -- Suivi du rebond 1-clic
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    responded_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 4. Messages vocaux rattachés aux demandes
CREATE TABLE public.request_audios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL UNIQUE REFERENCES public.requests(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,         -- Chemin dans le bucket privé 'request-audios'
    duration_seconds INT NOT NULL CHECK (duration_seconds <= 60), -- Max 60 secondes
    mime_type TEXT NOT NULL DEFAULT 'audio/webm',
    file_size_bytes INT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'), -- Rétention 7 jours
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Journal des notifications (SMS & WhatsApp)
CREATE TABLE public.notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    recipient_role user_role NOT NULL,
    channel notif_channel NOT NULL DEFAULT 'whatsapp',
    event_type TEXT NOT NULL,           -- 'new_request', 'accepted', 'rejected', 'expired'
    external_message_id TEXT,          -- ID retourné par WhatsApp Cloud API / Twilio
    status notif_status NOT NULL DEFAULT 'queued',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index de performance critiques
CREATE INDEX idx_repairmen_trades ON public.repairman_profiles (primary_trade, secondary_trade);
CREATE INDEX idx_repairmen_search ON public.repairman_profiles (is_active, verification_status, intervention_zone);
CREATE INDEX idx_requests_status_deadline ON public.requests (status, response_deadline);
CREATE INDEX idx_requests_client ON public.requests (client_id, created_at DESC);
CREATE INDEX idx_requests_repairman ON public.requests (repairman_id, created_at DESC);
```

---

## 2. Politiques de Sécurité RLS (Row Level Security)

L'une des exigences fondamentales du CDC (Section 9) est que **le téléphone et l'adresse ne doivent JAMAIS être exposés avant que la demande ne soit acceptée**.

```sql
-- Activer RLS sur les tables sensibles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_audios ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES : Lecture publique anonymisée des réparateurs, accès complet à son propre profil
CREATE POLICY "Les utilisateurs peuvent lire et modifier leur propre profil"
ON public.profiles FOR ALL
USING (auth.uid() = id);

-- Vue publique anonymisée pour afficher les ouvriers disponibles (sans téléphone direct)
CREATE OR REPLACE VIEW public.v_available_repairmen AS
SELECT 
    r.id AS repairman_id,
    p.full_name,
    SUBSTRING(p.full_name FROM 1 FOR 1) || '.' AS short_name,
    r.primary_trade,
    r.secondary_trade,
    p.city_or_quarter,
    r.intervention_zone,
    r.is_active,
    r.start_hour,
    r.end_hour,
    r.rating_score,
    r.diagnostic_fee_fcfa,
    r.verification_status
FROM public.repairman_profiles r
JOIN public.profiles p ON p.id = r.user_id
WHERE r.is_active = true 
  AND r.verification_status = 'verified';

-- 2. REQUESTS : Règles strictes d'accès
-- Le client peut lire ses propres demandes
CREATE POLICY "Le client peut voir ses demandes"
ON public.requests FOR SELECT
USING (auth.uid() = client_id);

-- L'artisan peut voir les demandes qui lui sont adressées
CREATE POLICY "Le réparateur peut voir les demandes qui lui sont assignées"
ON public.requests FOR SELECT
USING (
    repairman_id IN (
        SELECT id FROM public.repairman_profiles WHERE user_id = auth.uid()
    )
);

-- Création d'une fonction de masquage pour les coordonnées
CREATE OR REPLACE FUNCTION public.get_request_details(req_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    req RECORD;
    is_client BOOLEAN;
    is_repairman BOOLEAN;
    result JSONB;
BEGIN
    SELECT r.*, 
           cp.full_name AS client_name, cp.phone_number AS client_phone, cp.address_landmark AS client_landmark,
           rp_user.full_name AS repairman_name, rp_user.phone_number AS repairman_phone
    INTO req
    FROM public.requests r
    JOIN public.profiles cp ON cp.id = r.client_id
    JOIN public.repairman_profiles rp ON rp.id = r.repairman_id
    JOIN public.profiles rp_user ON rp_user.id = rp.user_id
    WHERE r.id = req_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Demande non trouvée');
    END IF;

    is_client := (auth.uid() = req.client_id);
    is_repairman := (auth.uid() IN (SELECT user_id FROM public.repairman_profiles WHERE id = req.repairman_id));

    IF NOT is_client AND NOT is_repairman THEN
        RETURN jsonb_build_object('error', 'Accès non autorisé');
    END IF;

    -- Si la demande est 'acceptee' ou 'terminee', on livre les coordonnées complètes
    IF req.status IN ('acceptee', 'terminee') THEN
        result := jsonb_build_object(
            'id', req.id,
            'status', req.status,
            'timing', req.timing,
            'trade', req.trade,
            'client_name', req.client_name,
            'client_phone', req.client_phone,
            'intervention_address', req.intervention_address,
            'repairman_name', req.repairman_name,
            'repairman_phone', req.repairman_phone,
            'diagnostic_fee_fcfa', req.diagnostic_fee_fcfa
        );
    ELSE
        -- Coordonnées MASQUÉES tant que la demande est en attente
        result := jsonb_build_object(
            'id', req.id,
            'status', req.status,
            'timing', req.timing,
            'trade', req.trade,
            'client_name', req.client_name,
            'quarter', req.quarter,
            'client_phone', 'MASQUÉ_JUSQU_ACCEPTATION',
            'intervention_address', req.quarter || ' (Adresse précise masquée)',
            'repairman_name', req.repairman_name,
            'repairman_phone', 'MASQUÉ_JUSQU_ACCEPTATION',
            'diagnostic_fee_fcfa', req.diagnostic_fee_fcfa
        );
    END IF;

    RETURN result;
END;
$$;
```

---

## 3. Spécification des Endpoints de l'API REST

Ces routes peuvent être déployées sous forme d'**Edge Functions Supabase (Deno)** ou d'API Routes **Next.js**.

### A. Espace Public & Découverte

#### 1. `GET /api/repairmen`
Recherche des ouvriers disponibles selon les critères du client.
- **Paramètres query** :
  - `trade` (obligatoire) : ex: `plombier`
  - `quarter` (optionnel) : ex: `Médina`
  - `timing` (optionnel) : `asap` | `today` | `tomorrow`
- **Réponse (200 OK)** :
```json
[
  {
    "repairman_id": "8b9a11e2-9f33-4a11-b852-c2847a9e1021",
    "name": "Moussa S.",
    "avatar_initials": "MS",
    "primary_trade": "plombier",
    "secondary_trade": "climaticien",
    "city_or_quarter": "Médina",
    "intervention_zone": "Dakar-Centre",
    "rating_score": 4.9,
    "diagnostic_fee_fcfa": 2500,
    "availability_badge": "Disponible maintenant",
    "is_available_now": true
  }
]
```

---

### B. Gestion du Cycle des Demandes

#### 2. `POST /api/requests`
Création et envoi de la demande vers un réparateur unique.
- **Headers** : `Authorization: Bearer <client_jwt>`
- **Payload** :
```json
{
  "repairman_id": "8b9a11e2-9f33-4a11-b852-c2847a9e1021",
  "trade": "plombier",
  "timing": "asap",
  "written_description": "Fuite importante sous l'évier de la cuisine",
  "audio_storage_path": "requests/req_9921_audio.webm",
  "audio_duration_seconds": 32,
  "photo_url": "https://storage.alloreparateur.sn/photos/evier.jpg",
  "intervention_address": "Rue 6 x 11, Immeuble Diallo, 2ème étage",
  "quarter": "Médina"
}
```
- **Logique backend** :
  1. Calcule la deadline de réponse :
     - Si `timing == 'asap'` : `now() + INTERVAL '15 minutes'`.
     - Si `timing == 'today'` : `now() + INTERVAL '2 hours'`.
     - Si `timing == 'tomorrow'` : `now() + INTERVAL '24 hours'`.
  2. Insère la demande en base avec statut `en_attente`.
  3. Déclenche immédiatement le webhook WhatsApp vers le numéro de l'artisan.
- **Réponse (201 Created)** :
```json
{
  "request_id": "d4e28e12-32a4-4f81-9b62-108ecab08102",
  "status": "en_attente",
  "response_deadline": "2026-10-19T19:37:00Z",
  "message": "Demande envoyée. L'ouvrier a 15 minutes pour confirmer."
}
```

#### 3. `POST /api/requests/:id/respond`
Action de l'artisan : Accepter ou Refuser.
- **Authentification** : Soit JWT artisan, soit `magic_token` passé en query string (depuis le lien WhatsApp).
- **Payload** :
```json
{
  "action": "accept", // ou "reject"
  "magic_token": "a1f9e87c02b389..." // facultatif si session active
}
```
- **Logique backend si `accept`** :
  1. Vérifie que la demande n'a pas déjà expiré (`now() <= response_deadline`) et qu'elle est toujours `en_attente`.
  2. Passe le statut à `acceptee`.
  3. Déverrouille les coordonnées.
  4. Envoie une notification WhatsApp au client avec le nom et le numéro direct de l'artisan.
- **Logique backend si `reject`** :
  1. Passe le statut à `refusee`.
  2. Envoie une notification au client l'invitant à effectuer un **rebond 1-clic**.

#### 4. `POST /api/requests/:id/rebound` (Ajustement validé)
Transfert instantané de la demande vers un nouvel artisan en cas de refus ou expiration.
- **Headers** : `Authorization: Bearer <client_jwt>`
- **Payload** :
```json
{
  "new_repairman_id": "3c7b22a1-12c4-4b51-9e22-871abec04011"
}
```
- **Logique backend** :
  1. Duplique la demande précédente (conserve le même texte, l'audio et la photo).
  2. Crée une nouvelle demande avec `rebound_from_request_id = :id`.
  3. Réinitialise le compte à rebours de 15 minutes.
  4. Déclenche la notification WhatsApp vers le nouvel artisan.

---

## 4. Architecture Stockage Audio & Photos

Pour gérer les contraintes de connexion lente et de confidentialité :

```
[Navigateur Client] 
   │ 
   ├─ 1. Demande d'URL de téléversement : POST /api/storage/presigned-url
   │     └── Retourne une URL S3 / Supabase signée valable 5 minutes
   ├─ 2. Téléversement direct du fichier WebM/Opus (< 250 Ko)
   └─ 3. Création de la demande avec le chemin 'audio_storage_path'
```

### Règles du Bucket Supabase `request-audios` :
1. **Bucket Privé (Private Bucket)** : Aucun accès anonyme public.
2. **Politique d'écoute** : L'accès en lecture à l'audio est autorisé uniquement au client émetteur et au réparateur destinataire via la fonction `get_signed_audio_url(request_id)`.
3. **Suppression automatique (Rétention 7 jours)** : Un travail planifié (Cron pg_cron) purge les fichiers audios dont la date `expires_at` est dépassée.

---

## 5. Pipeline WhatsApp & Webhook (WhatsApp Cloud API)

Pour contourner les limites du SMS et de l'illettrisme, l'intégration utilise la **Meta WhatsApp Cloud API** :

### Template Message envoyé à l'artisan (Nouvelle demande) :
> **Allô Réparateur 🔔**
> Bonjour Moussa, vous avez une nouvelle demande de dépannage !
> 
> 📍 **Zone** : Médina
> 🛠️ **Panne** : Plomberie (Fuite d'eau)
> ⏱️ **Délai souhaité** : Dès que possible (Réponse attendue sous 15 min)
> 💰 **Forfait déplacement** : 2 500 FCFA
> 
> 👉 **Cliquez ici pour écouter le message vocal et répondre :**
> `https://alloreparateur.sn/repondre/[request_id]?token=[magic_auth_token]`

### Webhook de réception (`POST /api/webhooks/whatsapp`)
Permet également de recevoir les réponses rapides par bouton WhatsApp si l'artisan clique directement sur « Accepter » ou « Refuser » dans sa conversation WhatsApp.
