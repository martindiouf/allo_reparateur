import React, { useState } from 'react';
import { Phone, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isValidPhone } from '../lib/api';

const inputCls =
  'w-full pl-11 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition';

export default function ScreenAuth() {
  const { signUp, signIn, busy, currentRole, resetRole } = useApp();
  const isAdminRole = currentRole === 'admin';
  const [mode, setMode] = useState(isAdminRole ? 'login' : 'signup'); // 'signup' | 'login'
  const [phone, setPhone] = useState('+221 ');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const isRepairman = currentRole === 'repairman';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidPhone(phone)) {
      setError('Entrez un numéro de téléphone valide, par exemple 77 123 45 67.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit avoir au moins 6 caractères.');
      return;
    }
    setError('');
    if (mode === 'signup') await signUp(phone, password);
    else await signIn(phone, password);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${isAdminRole ? 'bg-indigo-100 text-indigo-700' : isRepairman ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-600'}`}>
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          {mode === 'signup' ? 'Créer mon compte' : 'Me connecter'}
        </h1>
        <p className="text-slate-600 mt-1">
          {isAdminRole ? 'Espace administrateur' : isRepairman ? 'Espace artisan' : 'Espace client'} — votre numéro de téléphone sert d'identifiant.
        </p>
      </div>

      {!isAdminRole && <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-xl mb-4 text-sm font-bold" role="tablist">
        {[['signup', 'Nouveau compte'], ['login', 'J\'ai déjà un compte']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => { setMode(id); setError(''); }}
            className={`py-2.5 rounded-lg transition ${mode === id ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>}

      {error && (
        <div role="alert" className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
        <div>
          <label htmlFor="a-phone" className="block text-sm font-bold text-slate-700 mb-1.5">Téléphone (WhatsApp)</label>
          <div className="relative flex items-center">
            <Phone className="w-5 h-5 text-slate-400 absolute left-3.5" />
            <input id="a-phone" type="tel" inputMode="tel" autoComplete="username" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 77 123 45 67" className={inputCls} required />
          </div>
        </div>

        <div>
          <label htmlFor="a-pass" className="block text-sm font-bold text-slate-700 mb-1.5">
            Mot de passe <span className="text-slate-500 font-normal">(6 caractères minimum)</span>
          </label>
          <div className="relative flex items-center">
            <Lock className="w-5 h-5 text-slate-400 absolute left-3.5" />
            <input
              id="a-pass"
              type={show ? 'text' : 'password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputCls} pr-12`}
              required
            />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-1 w-11 h-11 flex items-center justify-center text-slate-500">
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className={`w-full min-h-[52px] py-3 ${isAdminRole ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-600 hover:bg-orange-700'} disabled:opacity-60 disabled:cursor-wait active:scale-[0.98] text-white font-bold text-base rounded-xl shadow-lg flex items-center justify-center gap-2 transition`}
        >
          <span>{busy ? 'Un instant…' : mode === 'signup' ? 'Créer mon compte' : 'Me connecter'}</span>
          {!busy && <ArrowRight className="w-5 h-5" />}
        </button>
      </form>

      <p className="text-center mt-4">
        <button onClick={resetRole} className="text-sm font-semibold text-slate-600 hover:text-slate-900">← Retour</button>
      </p>
    </div>
  );
}
