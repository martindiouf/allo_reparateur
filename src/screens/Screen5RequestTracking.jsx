import React from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Phone, 
  MessageCircle, 
  MapPin, 
  User, 
  RotateCcw, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Play
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import TrackingMap from '../components/TrackingMap';

export default function Screen5RequestTracking() {
  const { 
    activeRequest, 
    cancelRequest, 
    reboundRequest, 
    clearFinishedRequest,
    repairmen, 
    setActiveScreen 
  } = useApp();

  if (!activeRequest) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Aucune demande en cours</h1>
        <p className="text-slate-600 mt-1 mb-5">Vous n'avez pas de demande active pour le moment.</p>
        <button
          onClick={() => setActiveScreen('screen2')}
          className="px-6 py-3 min-h-[48px] bg-orange-600 text-white font-bold rounded-xl shadow-md"
        >
          Choisir un métier
        </button>
      </div>
    );
  }

  // Déstructuration sécurisée avec valeurs de secours
  const {
    id,
    tradeName,
    tradeId,
    repairmanId,
    repairmanName: safeName,
    repairmanPhone: safePhone,
    status,
    timingLabel,
    diagnosticFee: safeFee,
    remainingSeconds,
    clientQuarter,
    clientAddress
  } = activeRequest;

  const safeInitials = safeName.split(' ').map((n) => n[0] || '').join('').slice(0, 2);
  const safePhoneDigits = (safePhone || '').replace(/[^0-9]/g, '');

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedCountdown =
    minutes >= 60
      ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
      : `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  // Réparateur de secours disponible pour le rebond 1-clic
  const nextAvailableRepairman = Array.isArray(repairmen) 
    ? repairmen.find(
        r => r.id !== repairmanId && 
             (r.primaryTrade === tradeId || r.secondaryTrade === tradeId) &&
             r.isActive
      )
    : null;

  // Étape active de la frise chronologique (1, 2 ou 3)
  const currentStep = 
    status === 'acceptee' || status === 'terminee' ? 3 :
    status === 'en_attente' ? 2 : 1;

  return (
    <div>
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
      <div>
        {/* Statut principal en badge d'en-tête */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Réf : {id}</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
              status === 'en_attente' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
              status === 'acceptee' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
              status === 'terminee' ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                status === 'en_attente' ? 'bg-amber-500 animate-ping' :
                status === 'acceptee' ? 'bg-emerald-500' :
                status === 'terminee' ? 'bg-blue-500' : 'bg-red-500'
              }`} />
              {status === 'en_attente' && 'En attente de validation'}
              {status === 'acceptee' && 'Intervention confirmée !'}
              {status === 'refusee' && 'Demande non disponible'}
              {status === 'expiree' && 'Délai expiré sans réponse'}
              {status === 'annulee' && 'Demande annulée'}
              {status === 'terminee' && 'Intervention terminée'}
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Dépannage : {tradeName}
          </h1>
          <p className="text-xs text-slate-500">
            Créneau souhaité : <span className="font-semibold text-slate-700">{timingLabel}</span>
          </p>
        </div>

        {/* Frise chronologique en 3 étapes (Exigence CDC) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs mb-3">
          <div className="relative flex items-center justify-between">
            {/* Ligne de connexion */}
            <div className="absolute left-6 right-6 top-4 h-0.5 bg-slate-200 -z-0">
              <div 
                className="h-full bg-orange-500 transition-all duration-500"
                style={{
                  width: currentStep === 3 ? '100%' : currentStep === 2 ? '50%' : '0%'
                }}
              />
            </div>

            {/* Étape 1 : Demande envoyée */}
            <div className="flex flex-col items-center z-10">
              <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                ✓
              </div>
              <span className="text-xs font-bold text-slate-700 mt-1 text-center">
                Demande envoyée
              </span>
            </div>

            {/* Étape 2 : Ouvrier examine */}
            <div className="flex flex-col items-center z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-all ${
                currentStep >= 2 
                  ? 'bg-orange-600 text-white animate-pulse' 
                  : 'bg-slate-200 text-slate-500'
              }`}>
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span className="text-xs font-bold text-slate-700 mt-1 text-center">
                Ouvrier examine
              </span>
            </div>

            {/* Étape 3 : Intervention confirmée */}
            <div className="flex flex-col items-center z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-all ${
                currentStep === 3 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-200 text-slate-500'
              }`}>
                {currentStep === 3 ? '✓' : '3'}
              </div>
              <span className="text-xs font-bold text-slate-700 mt-1 text-center">
                Confirmée
              </span>
            </div>
          </div>

          {/* Compte à rebours si statut en attente */}
          {status === 'en_attente' && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                Délai de réponse de l'artisan :
              </span>
              <span className="font-extrabold text-orange-600 text-sm tracking-wide">
                {formattedCountdown}
              </span>
            </div>
          )}
        </div>

        {/* CARTE DE REPÈRE ET DE SUIVI GPS INTERACTIF */}
        <TrackingMap
          clientQuarter={clientQuarter}
          clientAddress={clientAddress}
          repairmanName={safeName}
          tradeName={tradeName}
          isAccepted={status === 'acceptee'}
          compact={status === 'en_attente'}
        />

      </div>
      <div>
        {/* Carte de l'ouvrier choisi */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-700 font-extrabold text-sm flex items-center justify-center">
                {safeInitials}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900">{safeName}</h3>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <p className="text-xs text-slate-500">Artisan partenaire Allô Réparateur</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Forfait prévu</span>
              <span className="text-xs font-bold text-slate-900">{safeFee.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>

          {/* COORDONNÉES DÉVERROUILLÉES SI ACCEPTÉE */}
          {status === 'acceptee' ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl mt-3 animate-fade-in">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Coordonnées de votre réparateur déverrouillées :</span>
              </div>

              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-emerald-200 mb-3">
                <div>
                  <span className="text-xs text-slate-400 block">Téléphone direct</span>
                  <span className="text-xs font-extrabold text-slate-900">{safePhone}</span>
                </div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  WhatsApp Vérifié
                </span>
              </div>

              {/* Boutons d'action immédiate */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${safePhone}`}
                  className="py-3 px-3 min-h-[48px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Appeler</span>
                </a>

                <a
                  href={`https://wa.me/${safePhoneDigits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-3 min-h-[48px] bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          ) : status === 'en_attente' ? (
            /* Coordonnées masquées en attente */
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
              🔒 Le numéro de téléphone de l'artisan vous sera communiqué dès qu'il valide votre créneau.
            </div>
          ) : null}
        </div>

        {/* GESTION DES REBONDS 1-CLIC (SI REFUS OU EXPIRATION) */}
        {(status === 'refusee' || status === 'expiree') && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl shadow-xs mb-3">
            <div className="flex items-start gap-2.5 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-orange-950">
                  {status === 'refusee' ? 'Artisan actuellement indisponible' : 'Délai d\'attente de 15 min dépassé'}
                </h4>
                <p className="text-xs text-orange-800 mt-0.5 leading-relaxed">
                  Ne perdez pas de temps ! Vous pouvez transférer instantanément votre description et message vocal au réparateur disponible suivant.
                </p>
              </div>
            </div>

            {nextAvailableRepairman ? (
              <button
                onClick={() => reboundRequest(nextAvailableRepairman)}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Transférer en 1 clic à {nextAvailableRepairman.name}</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveScreen('screen3')}
                className="w-full py-3 bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                <span>Choisir un autre ouvrier dans la liste</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Bouton d'annulation (Tant que la demande est en attente) */}
        {status === 'en_attente' && (
          <div className="text-center mt-2 mb-2">
            <button
              onClick={cancelRequest}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline py-2 px-4"
            >
              Annuler la demande
            </button>
          </div>
        )}
      {['annulee', 'terminee', 'refusee', 'expiree'].includes(status) && (
        <div className="text-center mt-2">
          <button
            onClick={() => { clearFinishedRequest(); setActiveScreen('screen2'); }}
            className="px-5 py-3 min-h-[48px] bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md"
          >
            Faire une nouvelle demande
          </button>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
