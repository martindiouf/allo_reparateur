import React from 'react';
import { Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ScreenNoAccess() {
  const { resetRole, signOut } = useApp();
  return (
    <div className="max-w-md mx-auto text-center py-12">
      <div className="w-14 h-14 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-7 h-7" />
      </div>
      <h1 className="text-2xl font-extrabold">Accès réservé</h1>
      <p className="text-slate-600 mt-2">Ce compte n'a pas les droits d'administration. Connectez-vous avec un compte administrateur.</p>
      <div className="mt-6 flex flex-col gap-2">
        <button onClick={signOut} className="min-h-[48px] bg-slate-900 text-white font-bold rounded-xl">Changer de compte</button>
        <button onClick={resetRole} className="min-h-[44px] text-sm font-semibold text-slate-600">← Retour à l'accueil</button>
      </div>
    </div>
  );
}
