import React, { useState } from 'react';
import { User, Phone, MapPin, Building, ArrowRight, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { QUARTERS } from '../data/referentiel';
import { isValidPhone } from '../lib/api';
import AudioVoiceGuide from '../components/AudioVoiceGuide';

const inputCls =
  'w-full pl-11 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition';

export default function Screen1ClientRegister() {
  const { registerClient, clientProfile, session, busy } = useApp();
  const isEdit = Boolean(clientProfile);

  const [fullName, setFullName] = useState(clientProfile?.fullName || '');
  const [phone, setPhone] = useState(clientProfile?.phone || (session?.user?.email ? '+' + session.user.email.split('@')[0] : '+221 '));
  const [quarter, setQuarter] = useState(clientProfile?.quarter || QUARTERS[0]);
  const [addressLandmark, setAddressLandmark] = useState(clientProfile?.addressLandmark || '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim() || !isValidPhone(phone) || !quarter) {
      setError('Veuillez indiquer votre nom, un numéro de téléphone valide et votre quartier.');
      return;
    }
    setError('');
    registerClient({ fullName: fullName.trim(), phone: phone.trim(), quarter, addressLandmark: addressLandmark.trim() });
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-5 text-center">
        <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mx-auto mb-3">
          <Wrench className="w-7 h-7" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          {isEdit ? 'Mon profil' : 'Trouvez un artisan fiable'}
        </h1>
        <p className="text-slate-600 mt-1">
          {isEdit
            ? 'Ces informations sont utilisées pour vos demandes.'
            : 'Quelques informations pour commencer. Cela prend moins d\'une minute.'}
        </p>
      </div>

      <AudioVoiceGuide guideKey="screen1" />

      {error && (
        <div role="alert" className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mt-4 bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
        <div>
          <label htmlFor="c-name" className="block text-sm font-bold text-slate-700 mb-1.5">
            Nom complet <span className="text-orange-600">*</span>
          </label>
          <div className="relative flex items-center">
            <User className="w-5 h-5 text-slate-400 absolute left-3.5" />
            <input id="c-name" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex : Aïssatou Sow" className={inputCls} required />
          </div>
        </div>

        <div>
          <label htmlFor="c-phone" className="block text-sm font-bold text-slate-700 mb-1.5">
            Téléphone (WhatsApp) <span className="text-orange-600">*</span>
          </label>
          <div className="relative flex items-center">
            <Phone className="w-5 h-5 text-slate-400 absolute left-3.5" />
            <input id="c-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 77 123 45 67" className={inputCls} required />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">L'artisan vous contactera sur ce numéro une fois la demande acceptée.</p>
        </div>

        <div>
          <label htmlFor="c-quarter" className="block text-sm font-bold text-slate-700 mb-1.5">
            Votre quartier <span className="text-orange-600">*</span>
          </label>
          <div className="relative flex items-center">
            <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
            <select id="c-quarter" value={quarter} onChange={(e) => setQuarter(e.target.value)} className={`${inputCls} appearance-none pr-10`}>
              {QUARTERS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="c-addr" className="block text-sm font-bold text-slate-700 mb-1.5">
            Adresse ou point de repère <span className="text-slate-500 font-normal">(facultatif)</span>
          </label>
          <div className="relative flex items-center">
            <Building className="w-5 h-5 text-slate-400 absolute left-3.5" />
            <input id="c-addr" type="text" autoComplete="street-address" value={addressLandmark} onChange={(e) => setAddressLandmark(e.target.value)} placeholder="Ex : Rue 6 x 11, près de la pharmacie" className={inputCls} />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full min-h-[52px] disabled:opacity-60 py-3 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold text-base rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition"
        >
          <span>{busy ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Continuer'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
