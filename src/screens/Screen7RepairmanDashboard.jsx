import React, { useState, useRef } from 'react';
import { Power, Clock, MapPin, User, Phone, MessageCircle, Play, Pause, Check, X, ShieldCheck, CheckCircle2, History, Inbox } from 'lucide-react';
import { useApp } from '../context/AppContext';
import AudioVoiceGuide from '../components/AudioVoiceGuide';
import TrackingMap from '../components/TrackingMap';

const STATUS_LABELS = {
  terminee: { label: 'Terminée', cls: 'bg-blue-100 text-blue-800' },
  refusee: { label: 'Refusée', cls: 'bg-red-100 text-red-800' },
  annulee: { label: 'Annulée', cls: 'bg-slate-100 text-slate-700' },
  expiree: { label: 'Expirée', cls: 'bg-amber-100 text-amber-800' },
  acceptee: { label: 'Acceptée', cls: 'bg-emerald-100 text-emerald-800' }
};

export default function Screen7RepairmanDashboard() {
  const {
    incomingRequest: req,
    acceptRequest,
    rejectRequest,
    completeRequest,
    toggleRepairmanAvailability,
    myRepairmanProfile: rep,
    repairmanHistory
  } = useApp();

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef(null);

  if (!rep) return null;

  const togglePlayAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlayingAudio) {
      audio.pause();
      setIsPlayingAudio(false);
    } else {
      audio.play().then(() => setIsPlayingAudio(true)).catch(() => setIsPlayingAudio(false));
    }
  };

  const minutes = req ? Math.floor(req.remainingSeconds / 60) : 0;
  const seconds = req ? req.remainingSeconds % 60 : 0;
  const countdown =
    minutes >= 60
      ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
      : `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const pending = req?.status === 'en_attente';
  const accepted = req?.status === 'acceptee';
  const finished = req && ['terminee', 'refusee', 'annulee', 'expiree'].includes(req.status);

  return (
    <div className="lg:grid lg:grid-cols-5 lg:gap-8 lg:items-start">
      {/* Colonne gauche : profil + disponibilité + historique */}
      <div className="lg:col-span-2 space-y-4 mb-4 lg:mb-0">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center">
                {rep.initials}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                  Bonjour, {rep.name.split(' ')[0]}
                  {rep.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-600" aria-label="Profil vérifié" />}
                </h1>
                <p className="text-sm text-slate-600 capitalize truncate">
                  {rep.primaryTrade}
                  {rep.secondaryTrade ? ` • ${rep.secondaryTrade}` : ''}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => toggleRepairmanAvailability(rep.id)}
            role="switch"
            aria-checked={rep.isActive}
            className={`mt-4 w-full min-h-[56px] rounded-xl flex items-center justify-center gap-2.5 font-bold text-base transition active:scale-[0.98] border ${
              rep.isActive
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
          >
            <Power className="w-5 h-5" />
            {rep.isActive ? 'Je suis disponible' : 'Je ne suis pas disponible'}
          </button>

          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              {rep.startHour} à {rep.endHour}
            </span>
            <span className={`font-semibold ${rep.isActive && rep.isVerified ? 'text-emerald-700' : 'text-slate-500'}`}>
              {rep.isActive && rep.isVerified ? 'Visible par les clients' : 'Masqué des clients'}
            </span>
          </div>
        </div>

        {rep.verificationStatus === 'rejected' && (
          <div role="status" className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-sm">
            <p className="font-bold">Profil non validé</p>
            <p className="mt-0.5">Notre équipe n'a pas validé votre profil pour le moment. Vous n'apparaissez pas dans les recherches. Contactez-nous pour en savoir plus.</p>
          </div>
        )}
        {rep.verificationStatus === 'pending' && (
          <div role="status" className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-sm">
            <p className="font-bold">Profil en cours de vérification</p>
            <p className="mt-0.5">Vous apparaîtrez dans les recherches des clients dès que notre équipe aura validé votre profil.</p>
          </div>
        )}

        <AudioVoiceGuide guideKey="screen7" />

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
            <History className="w-5 h-5 text-slate-400" />
            Demandes récentes
          </h2>
          {repairmanHistory.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune demande terminée pour l'instant.</p>
          ) : (
            <ul className="space-y-2.5">
              {repairmanHistory.slice(0, 8).map((h) => {
                const st = STATUS_LABELS[h.status] || STATUS_LABELS.terminee;
                return (
                  <li key={h.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{h.tradeName}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {h.clientName.split(' ')[0]} • {h.clientQuarter}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${st.cls}`}>{st.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Colonne droite : demande en cours */}
      <div className="lg:col-span-3 space-y-4">
        {!req && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-7 h-7" />
            </div>
            <h2 className="font-bold text-slate-800">Aucune demande pour le moment</h2>
            <p className="text-sm text-slate-600 mt-1">
              {rep.isActive
                ? 'Restez disponible : les nouvelles demandes apparaîtront ici.'
                : 'Activez « Je suis disponible » pour recevoir des demandes.'}
            </p>
          </div>
        )}

        {pending && (
          <div className="bg-white border-2 border-orange-500 rounded-2xl p-5 shadow-lg shadow-orange-500/10">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wider bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-600 animate-ping" />
                Nouvelle demande
              </span>
              <span className="flex items-center gap-1.5 font-bold text-orange-600">
                <Clock className="w-4 h-4" />
                Reste {countdown}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  Client : {req.clientName.split(' ')[0]}
                </span>
                <span className="text-slate-700 flex items-center gap-1.5 font-semibold">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  {req.clientQuarter}
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                <span className="text-slate-600">Créneau demandé</span>
                <span className="font-bold text-slate-900">{req.timingLabel}</span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                <span className="text-slate-600">Type de dépannage</span>
                <span className="font-bold text-slate-900">{req.tradeName}</span>
              </div>
            </div>

            <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-orange-900 mb-2">Description de la panne</p>
              {req.writtenDescription ? (
                <p className="text-slate-800 italic mb-3 leading-relaxed">« {req.writtenDescription} »</p>
              ) : (
                !req.audioUrl && <p className="text-sm text-slate-600 mb-3">Aucune description écrite.</p>
              )}

              {req.audioUrl && (
                <>
                  <button
                    type="button"
                    onClick={togglePlayAudio}
                    className="w-full min-h-[48px] py-3 px-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white shadow-sm transition"
                  >
                    {isPlayingAudio ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    <span>
                      {isPlayingAudio ? 'Pause' : 'Écouter le message vocal'}
                      {req.audioDuration ? ` (${req.audioDuration} s)` : ''}
                    </span>
                  </button>
                  <audio ref={audioRef} src={req.audioUrl} onEnded={() => setIsPlayingAudio(false)} className="hidden" />
                </>
              )}
              {req.photoUrl && (
                <img src={req.photoUrl} alt="Photo de la panne envoyée par le client" className="mt-3 rounded-xl w-full max-h-64 object-cover" />
              )}
            </div>

            <div className="flex items-center justify-between font-bold text-slate-700 mb-4 px-1">
              <span>Forfait déplacement</span>
              <span className="text-slate-900 text-lg">{req.diagnosticFee.toLocaleString('fr-FR')} FCFA</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={rejectRequest}
                className="min-h-[52px] py-3 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition"
              >
                <X className="w-5 h-5" />
                Refuser
              </button>
              <button
                type="button"
                onClick={acceptRequest}
                className="min-h-[52px] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 active:scale-[0.98] transition"
              >
                <Check className="w-5 h-5" />
                Accepter
              </button>
            </div>
          </div>
        )}

        {accepted && (
          <div className="bg-white border border-emerald-300 rounded-2xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-4 gap-2">
              <span className="text-sm font-bold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Intervention confirmée
              </span>
              <span className="font-bold text-slate-900">{req.diagnosticFee.toLocaleString('fr-FR')} FCFA</span>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs text-slate-500 block">Client</span>
                  <span className="font-extrabold text-slate-900">{req.clientName}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Téléphone</span>
                  <span className="font-bold text-emerald-800">{req.clientPhone}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Adresse d'intervention</span>
                <span className="font-bold text-slate-800 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-1" />
                  {req.clientAddress}
                </span>
              </div>
              {req.writtenDescription && (
                <div>
                  <span className="text-xs text-slate-500 block">Panne décrite</span>
                  <span className="text-slate-800 italic">« {req.writtenDescription} »</span>
                </div>
              )}
            </div>

            <TrackingMap
              clientQuarter={req.clientQuarter}
              clientAddress={req.clientAddress}
              repairmanName={rep.name}
              tradeName={req.tradeName}
              isAccepted={true}
              compact={false}
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <a
                href={`tel:${req.clientPhone}`}
                className="min-h-[48px] py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Phone className="w-4 h-4" />
                Appeler
              </a>
              <a
                href={`https://wa.me/${req.clientPhone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="min-h-[48px] py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            </div>

            <button
              onClick={completeRequest}
              className="w-full min-h-[48px] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
            >
              <Check className="w-5 h-5" />
              Marquer comme terminée
            </button>
          </div>
        )}

        {finished && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
            <p className="font-bold text-slate-800">
              Dernière demande : {STATUS_LABELS[req.status]?.label.toLowerCase()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
