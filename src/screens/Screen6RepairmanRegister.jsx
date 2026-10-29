import React, { useState } from 'react';
import { User, Phone, MapPin, Wrench, ArrowRight, Headphones } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TRADES, QUARTERS } from '../data/referentiel';
import { isValidPhone } from '../lib/api';
import AudioVoiceGuide from '../components/AudioVoiceGuide';

const inputCls =
  'w-full pl-11 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition';
const plainCls =
  'w-full px-3 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition';

const DAYS = [
  { id: 'lundi', label: 'Lun' },
  { id: 'mardi', label: 'Mar' },
  { id: 'mercredi', label: 'Mer' },
  { id: 'jeudi', label: 'Jeu' },
  { id: 'vendredi', label: 'Ven' },
  { id: 'samedi', label: 'Sam' },
  { id: 'dimanche', label: 'Dim' }
];

export default function Screen6RepairmanRegister() {
  const { saveRepairmanProfile, myRepairmanProfile: existing, session, busy } = useApp();
  const isEdit = Boolean(existing);

  const [fullName, setFullName] = useState(existing?.name || '');
  const [phone, setPhone] = useState(existing?.phone || (session?.user?.email ? '+' + session.user.email.split('@')[0] : '+221 '));
  const [primaryTrade, setPrimaryTrade] = useState(existing?.primaryTrade || '');
  const [secondaryTrade, setSecondaryTrade] = useState(existing?.secondaryTrade || null);
  const [quarter, setQuarter] = useState(existing?.quarter || QUARTERS[0]);
  const [interventionZone, setInterventionZone] = useState(existing?.interventionZone || '');
  const [diagnosticFee, setDiagnosticFee] = useState(existing?.diagnosticFee || 2500);
  const [startHour, setStartHour] = useState(existing?.startHour || '08:00');
  const [endHour, setEndHour] = useState(existing?.endHour || '19:00');
  const [availableDays, setAvailableDays] = useState(
    existing?.availableDays || ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  );
  const [error, setError] = useState('');

  const toggleDay = (id) =>
    setAvailableDays((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim() || !isValidPhone(phone)) {
      setError('Veuillez indiquer votre nom et un numéro de téléphone valide.');
      return;
    }
    if (!primaryTrade) {
      setError('Veuillez choisir votre métier principal.');
      return;
    }
    if (availableDays.length === 0) {
      setError('Choisissez au moins un jour de travail.');
      return;
    }
    setError('');
    saveRepairmanProfile({
      fullName,
      phone,
      primaryTrade,
      secondaryTrade,
      quarter,
      interventionZone,
      diagnosticFee,
      startHour,
      endHour,
      availableDays
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <Wrench className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {isEdit ? 'Mon profil artisan' : 'Inscription artisan'}
          </h1>
          <p className="text-slate-600 text-sm">Recevez des demandes de dépannage près de chez vous</p>
        </div>
      </div>

      <AudioVoiceGuide guideKey="screen6" />

      {error && (
        <div role="alert" className="p-3 my-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 mt-4 bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="r-name" className="block text-sm font-bold text-slate-700 mb-1.5">
              Nom complet <span className="text-orange-600">*</span>
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input id="r-name" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex : Moussa Sarr" className={inputCls} required />
            </div>
          </div>

          <div>
            <label htmlFor="r-phone" className="block text-sm font-bold text-slate-700 mb-1.5">
              Téléphone (WhatsApp) <span className="text-orange-600">*</span>
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input id="r-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 77 452 89 12" className={inputCls} required />
            </div>
          </div>
        </div>

        <fieldset>
          <legend className="block text-sm font-bold text-slate-700 mb-1.5">
            Métier principal <span className="text-orange-600">*</span>
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TRADES.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => {
                  setPrimaryTrade(t.id);
                  if (secondaryTrade === t.id) setSecondaryTrade(null);
                }}
                aria-pressed={primaryTrade === t.id}
                className={`min-h-[56px] p-2 rounded-xl text-center border transition ${
                  primaryTrade === t.id
                    ? 'bg-orange-600 text-white border-orange-600 shadow-sm font-bold'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 font-semibold'
                }`}
              >
                <span className="block">{t.name}</span>
                <span className="text-xs block opacity-90">({t.wolof})</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="r-second" className="block text-sm font-bold text-slate-700 mb-1.5">
            Métier secondaire <span className="text-slate-500 font-normal">(facultatif)</span>
          </label>
          <select id="r-second" value={secondaryTrade || ''} onChange={(e) => setSecondaryTrade(e.target.value || null)} className={plainCls}>
            <option value="">Aucun</option>
            {TRADES.filter((t) => t.id !== primaryTrade).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.wolof})</option>
            ))}
          </select>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="r-quarter" className="block text-sm font-bold text-slate-700 mb-1.5">Votre quartier</label>
            <select id="r-quarter" value={quarter} onChange={(e) => setQuarter(e.target.value)} className={plainCls}>
              {QUARTERS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="r-zone" className="block text-sm font-bold text-slate-700 mb-1.5">Zones couvertes</label>
            <div className="relative">
              <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input id="r-zone" type="text" value={interventionZone} onChange={(e) => setInterventionZone(e.target.value)} placeholder="Ex : Médina, Fann, Plateau" className={inputCls} />
            </div>
          </div>
        </div>

        <fieldset>
          <legend className="block text-sm font-bold text-slate-700 mb-1.5">Jours de travail</legend>
          <div className="flex items-center gap-1.5">
            {DAYS.map((d) => (
              <button
                type="button"
                key={d.id}
                onClick={() => toggleDay(d.id)}
                aria-pressed={availableDays.includes(d.id)}
                className={`flex-1 min-h-[44px] rounded-lg text-sm font-bold transition ${
                  availableDays.includes(d.id) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <span className="block text-sm font-bold text-slate-700 mb-1.5">Horaires</span>
            <div className="flex items-center gap-2">
              <input aria-label="Heure de début" type="time" value={startHour} onChange={(e) => setStartHour(e.target.value)} className={plainCls} />
              <span className="text-slate-500">à</span>
              <input aria-label="Heure de fin" type="time" value={endHour} onChange={(e) => setEndHour(e.target.value)} className={plainCls} />
            </div>
          </div>
          <div>
            <label htmlFor="r-fee" className="block text-sm font-bold text-slate-700 mb-1.5">Forfait déplacement (FCFA)</label>
            <input id="r-fee" type="number" inputMode="numeric" min="0" step="500" value={diagnosticFee} onChange={(e) => setDiagnosticFee(e.target.value)} className={plainCls} />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full min-h-[52px] disabled:opacity-60 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-base rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition"
        >
          <span>{busy ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer mon profil'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>

      <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Headphones className="w-5 h-5 text-slate-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-slate-800">Besoin d'aide pour vous inscrire ?</p>
            <p className="text-xs text-slate-500">Un agent peut créer votre profil par téléphone.</p>
          </div>
        </div>
        <a href="tel:+221338000000" className="text-sm font-bold text-orange-600 underline whitespace-nowrap">
          Appeler
        </a>
      </div>
    </div>
  );
}
