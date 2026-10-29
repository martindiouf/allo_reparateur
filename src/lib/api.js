import { supabase } from './supabase';
import { TRADES } from '../data/referentiel';

// ---------------------------------------------------------------------------
// Téléphone : identifiant de connexion (le numéro devient un e-mail technique)
// ---------------------------------------------------------------------------
export function normalizePhone(input = '') {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('221')) return `+${digits}`;
  if (digits.length === 9) return `+221${digits}`; // numéro local sénégalais
  return `+${digits}`;
}

export const isValidPhone = (input) => /^\+\d{9,15}$/.test(normalizePhone(input));

export function formatPhone(p = '') {
  const m = p.match(/^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+221 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
}

const phoneToEmail = (phone) => `${normalizePhone(phone).replace('+', '')}@allo-reparateur.sn`;

// ---------------------------------------------------------------------------
// Messages d'erreur lisibles (les erreurs métier viennent déjà en français de la base)
// ---------------------------------------------------------------------------
export function humanError(error) {
  const msg = error?.message || String(error || '');
  if (/failed to fetch|networkerror|load failed|network request/i.test(msg))
    return 'Connexion impossible. Vérifiez votre réseau et réessayez.';
  if (/invalid login credentials/i.test(msg)) return 'Numéro ou mot de passe incorrect.';
  if (/already registered|already been registered/i.test(msg))
    return 'Ce numéro a déjà un compte. Connectez-vous.';
  if (/password should be at least/i.test(msg)) return 'Le mot de passe doit avoir au moins 6 caractères.';
  if (/profiles_phone_number_key|duplicate key/i.test(msg)) return 'Ce numéro est déjà utilisé par un autre compte.';
  if (/rate limit|too many/i.test(msg)) return 'Trop de tentatives. Patientez une minute.';
  if (/jwt|not authenticated|connexion requise/i.test(msg)) return 'Votre session a expiré. Reconnectez-vous.';
  if (/exceeded the maximum allowed size/i.test(msg)) return 'Le fichier est trop lourd.';
  return msg;
}

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------
export async function signUp(phone, password) {
  const { data, error } = await supabase.auth.signUp({ email: phoneToEmail(phone), password });
  if (error) throw error;
  if (!data.session) {
    throw new Error(
      "Compte créé mais non connecté : dans Supabase, désactivez « Confirm email » (Authentication → Providers → Email)."
    );
  }
  return data.session;
}

export async function signIn(phone, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: phoneToEmail(phone), password });
  if (error) throw error;
  return data.session;
}

export const signOut = () => supabase.auth.signOut();

// ---------------------------------------------------------------------------
// Profils
// ---------------------------------------------------------------------------
const hhmm = (t) => (t ? String(t).slice(0, 5) : t);

export function mapProfiles(raw) {
  if (!raw?.profile) return { client: null, repairman: null, isAdmin: false };
  const p = raw.profile;
  const r = raw.repairman;
  const name = p.full_name;
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return {
    isAdmin: p.role === 'admin',
    client: {
      fullName: p.full_name,
      phone: p.phone_number,
      quarter: p.city_or_quarter,
      addressLandmark: p.address_landmark || ''
    },
    repairman: r && {
      id: r.id,
      name,
      initials,
      phone: p.phone_number,
      primaryTrade: r.primary_trade,
      secondaryTrade: r.secondary_trade,
      quarter: p.city_or_quarter,
      interventionZone: r.intervention_zone,
      diagnosticFee: r.diagnostic_fee_fcfa,
      startHour: hhmm(r.start_hour),
      endHour: hhmm(r.end_hour),
      availableDays: r.available_days,
      isActive: r.is_active,
      isVerified: r.verification_status === 'verified',
      verificationStatus: r.verification_status
    }
  };
}

export const fetchMyProfiles = async () => mapProfiles(await rpc('my_profile'));

export const registerClient = async ({ fullName, phone, quarter, addressLandmark }) =>
  mapProfiles(
    await rpc('register_client', {
      p_full_name: fullName,
      p_phone: normalizePhone(phone),
      p_quarter: quarter,
      p_landmark: addressLandmark || null
    })
  );

export const registerRepairman = async (p) =>
  mapProfiles(
    await rpc('register_repairman', {
      p_full_name: p.fullName,
      p_phone: normalizePhone(p.phone),
      p_primary_trade: p.primaryTrade,
      p_secondary_trade: p.secondaryTrade || null,
      p_quarter: p.quarter,
      p_zone: p.interventionZone || null,
      p_days: p.availableDays,
      p_start: p.startHour,
      p_end: p.endHour,
      p_fee: parseInt(p.diagnosticFee, 10) || 2500
    })
  );

export const setAvailability = async (active) => mapProfiles(await rpc('set_availability', { p_active: active }));

// ---------------------------------------------------------------------------
// Annuaire
// ---------------------------------------------------------------------------
export async function fetchRepairmen() {
  const rows = await rpc('list_repairmen');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    initials: r.name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
    primaryTrade: r.primary_trade,
    secondaryTrade: r.secondary_trade,
    quarter: r.quarter,
    interventionZone: r.intervention_zone,
    rating: r.rating,
    reviewsCount: r.ratings_count,
    diagnosticFee: r.diagnostic_fee,
    startHour: r.start_hour,
    endHour: r.end_hour,
    isVerified: r.is_verified,
    isActive: true,
    isAvailableNow: r.is_available_now,
    availabilityBadge: r.is_available_now ? 'Disponible maintenant' : 'Hors horaires'
  }));
}

// ---------------------------------------------------------------------------
// Demandes
// ---------------------------------------------------------------------------
const TIMING_LABELS = { asap: 'Dès que possible', today: "Aujourd'hui", tomorrow: 'Demain' };

export async function fetchRequests(as) {
  const rows = await rpc('list_my_requests', { p_as: as });
  const receivedAt = Date.now();
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    tradeId: r.trade,
    tradeName: TRADES.find((t) => t.id === r.trade)?.name || 'Dépannage',
    timing: r.timing,
    timingLabel: TIMING_LABELS[r.timing],
    clientName: r.client_name || r.client_first_name,
    clientPhone: r.client_phone,
    clientQuarter: r.quarter,
    clientAddress: r.intervention_address,
    repairmanId: r.repairman_id,
    repairmanName: r.repairman_name,
    repairmanPhone: r.repairman_phone,
    writtenDescription: r.written_description || '',
    audioPath: r.audio_path,
    audioDuration: r.audio_duration_seconds || 0,
    photoPath: r.photo_path,
    diagnosticFee: r.diagnostic_fee,
    createdAt: new Date(r.created_at).getTime(),
    serverRemaining: r.remaining_seconds,
    receivedAt
  }));
}

export async function uploadMedia(path, blob, contentType) {
  const { error } = await supabase.storage.from('request-media').upload(path, blob, { contentType, upsert: false });
  if (error) throw error;
}

const signedUrlCache = new Map();
export async function signedUrl(path) {
  if (!path) return null;
  const cached = signedUrlCache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from('request-media').createSignedUrl(path, 3600);
  if (error) return null;
  signedUrlCache.set(path, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

export const createRequest = (p) =>
  rpc('create_request', {
    p_id: p.id,
    p_repairman_id: p.repairmanId,
    p_trade: p.trade,
    p_timing: p.timing,
    p_description: p.description || null,
    p_audio_path: p.audioPath || null,
    p_audio_duration: p.audioDuration || null,
    p_audio_mime: p.audioMime || null,
    p_photo_path: p.photoPath || null,
    p_address: p.address,
    p_quarter: p.quarter,
    p_rebound_from: p.reboundFrom || null
  });

export const respondRequest = (id, action) => rpc('respond_request', { p_id: id, p_action: action });
export const cancelRequest = (id) => rpc('cancel_request', { p_id: id });
export const completeRequest = (id) => rpc('complete_request', { p_id: id });

// ---------------------------------------------------------------------------
// Administration (chaque fonction vérifie le rôle côté serveur)
// ---------------------------------------------------------------------------
export const adminStats = () => rpc('admin_stats');
export const adminListRepairmen = (status = null) => rpc('admin_list_repairmen', { p_status: status });
export const adminSetVerification = (id, status, note = null) =>
  rpc('admin_set_verification', { p_repairman_id: id, p_status: status, p_note: note });
export const adminListRequests = ({ status = null, limit = 50, offset = 0 } = {}) =>
  rpc('admin_list_requests', { p_status: status, p_limit: limit, p_offset: offset });
export const adminCancelRequest = (id, reason = null) => rpc('admin_cancel_request', { p_id: id, p_reason: reason });
export const adminSetAutoVerify = (value) => rpc('admin_set_auto_verify', { p_value: value });
export const adminListActions = (limit = 30) => rpc('admin_list_actions', { p_limit: limit });
