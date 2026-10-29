import React from 'react';
import { Wrench, ArrowRight, Search, HardHat, ShieldCheck, Mic, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ScreenWelcome() {
  const { chooseRole, clientProfile, myRepairmanProfile } = useApp();

  return (
    <div className="max-w-4xl mx-auto md:py-8">
      <div className="text-center mb-8 md:mb-12">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-orange-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-5 shadow-lg shadow-orange-600/30">
          <Wrench className="w-9 h-9 md:w-11 md:h-11" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
          Allô <span className="text-orange-600">Réparateur</span>
        </h1>
        <p className="mt-3 text-base md:text-lg text-slate-600 max-w-xl mx-auto">
          Plombier, électricien, maçon… Un artisan près de chez vous, à domicile, à Dakar et au Sénégal.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => chooseRole('client')}
          className="group text-left bg-white border-2 border-slate-200 hover:border-orange-500 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-lg transition active:scale-[0.99]"
        >
          <span className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
            <Search className="w-7 h-7" />
          </span>
          <h2 className="text-xl font-extrabold">Je cherche un artisan</h2>
          <p className="text-slate-600 mt-1">
            Décrivez la panne, choisissez un artisan disponible et suivez son arrivée.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 font-bold text-orange-600">
            {clientProfile ? `Continuer (${clientProfile.fullName.split(' ')[0]})` : 'Commencer'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
          </span>
        </button>

        <button
          onClick={() => chooseRole('repairman')}
          className="group text-left bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-lg transition active:scale-[0.99]"
        >
          <span className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
            <HardHat className="w-7 h-7" />
          </span>
          <h2 className="text-xl font-extrabold">Je suis artisan</h2>
          <p className="text-slate-600 mt-1">
            Recevez des demandes de dépannage près de chez vous et gérez vos disponibilités.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 font-bold text-emerald-700">
            {myRepairmanProfile ? `Continuer (${myRepairmanProfile.name.split(' ')[0]})` : "M'inscrire"}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
          </span>
        </button>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-3 text-sm text-slate-600">
        <li className="flex items-start gap-3">
          <Mic className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          Décrivez la panne à la voix, en wolof ou en français — pas besoin d'écrire.
        </li>
        <li className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          Votre adresse n'est partagée qu'une fois l'artisan d'accord.
        </li>
        <li className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          Tarif de déplacement annoncé à l'avance, paiement sur place.
        </li>
      </ul>

      <p className="mt-10 text-center">
        <button onClick={() => chooseRole('admin')} className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2 min-h-[44px] px-3">
          Accès administrateur
        </button>
      </p>
    </div>
  );
}
