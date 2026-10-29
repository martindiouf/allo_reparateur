import React, { useState } from 'react';
import { Star, MapPin, Clock, ShieldCheck, ArrowRight, Filter, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TRADES } from '../data/referentiel';

export default function Screen3AvailableRepairmen() {
  const { 
    selectedTrade, 
    handleSelectRepairman, 
    repairmen, 
    clientProfile, 
    setActiveScreen 
  } = useApp();

  const [timingFilter, setTimingFilter] = useState('maintenant'); // 'maintenant' | 'aujourdhui' | 'demain'

  const currentTradeObj = TRADES.find(t => t.id === selectedTrade) || TRADES[0];

  // Filtrer les réparateurs par métier et statut de disponibilité
  const filteredRepairmen = repairmen.filter(r => {
    // Correspondance métier principal ou secondaire
    const matchTrade = r.primaryTrade === selectedTrade || r.secondaryTrade === selectedTrade;
    // Si l'interrupteur est coupé (isActive == false), l'ouvrier ne doit PAS apparaître dans les recherches
    if (!r.isActive) return false;

    if (timingFilter === 'maintenant') {
      return matchTrade && r.isAvailableNow;
    }
    return matchTrade;
  });

  return (
    <div>
      <div>
        {/* En-tête avec métier sélectionné */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Artisans disponibles — {currentTradeObj.name}
            </h1>
            <p className="text-xs text-slate-500">
              Zone : <span className="font-semibold text-slate-800">{clientProfile.quarter}</span> et environs
            </p>
          </div>

          <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
            {filteredRepairmen.length} trouvé{filteredRepairmen.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Filtres de disponibilité temporelle (Maintenant, Aujourd'hui, Demain) */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/70 rounded-xl mb-5 text-sm font-bold md:max-w-md">
          <button
            onClick={() => setTimingFilter('maintenant')}
            className={`py-2.5 rounded-lg transition-all ${
              timingFilter === 'maintenant'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Maintenant
          </button>
          <button
            onClick={() => setTimingFilter('aujourdhui')}
            className={`py-2.5 rounded-lg transition-all ${
              timingFilter === 'aujourdhui'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setTimingFilter('demain')}
            className={`py-2.5 rounded-lg transition-all ${
              timingFilter === 'demain'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Demain
          </button>
        </div>

        {/* Liste des cartes d'ouvriers */}
        {filteredRepairmen.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">
              Aucun réparateur disponible immédiatement
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">
              Essayez de filtrer sur « Aujourd'hui » ou « Demain », ou vérifiez un autre quartier.
            </p>
            <button
              onClick={() => setTimingFilter('aujourdhui')}
              className="px-4 py-2.5 min-h-[44px] bg-orange-600 text-white text-sm font-bold rounded-xl"
            >
              Voir les disponibilités d'aujourd'hui
            </button>
          </div>
        ) : (
          <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRepairmen.map((rep) => (
              <div
                key={rep.id}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs hover:border-orange-300 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Initiales et avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-700 font-extrabold text-sm flex items-center justify-center shadow-inner">
                      {rep.initials}
                    </div>
                    {rep.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-xs">
                        <ShieldCheck className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Détails du réparateur */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold text-slate-900 truncate">
                        {rep.name}
                      </h3>
                      {/* Note */}
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                        <Star className="w-3 h-3 fill-current text-amber-500" />
                        {rep.rating ? (<><span>{rep.rating}</span><span className="text-slate-500 text-xs">({rep.reviewsCount})</span></>) : (<span>Nouveau</span>)}
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-slate-700 capitalize">
                      {rep.primaryTrade} {rep.secondaryTrade ? `& ${rep.secondaryTrade}` : ''}
                    </p>

                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{rep.quarter} ({rep.interventionZone})</span>
                    </div>

                    {/* Badge de disponibilité */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        rep.isAvailableNow
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${rep.isAvailableNow ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {rep.availabilityBadge}
                      </span>

                      <span className="text-xs text-slate-400">
                        {rep.startHour} - {rep.endHour}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Forfait déplacement & Bouton de demande */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Forfait déplacement</span>
                    <span className="text-xs font-bold text-slate-900">
                      {rep.diagnosticFee.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  <button
                    onClick={() => handleSelectRepairman(rep)}
                    className="px-5 py-2.5 min-h-[44px] bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-all"
                  >
                    <span>Demander</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
