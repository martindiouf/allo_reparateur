import React, { useState } from 'react';
import { 
  Zap, 
  Droplets, 
  Hammer, 
  SquareDashedBottomCode, 
  Paintbrush, 
  Wind, 
  ChevronRight, 
  Search,
  Sparkles,
  Users
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TRADES } from '../data/referentiel';
import AudioVoiceGuide from '../components/AudioVoiceGuide';

export default function Screen2TradeSelect() {
  const { handleSelectTrade, repairmen } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  // Mapping des icônes Lucide
  const getTradeIcon = (iconName) => {
    switch (iconName) {
      case 'Zap': return <Zap className="w-6 h-6" />;
      case 'Droplets': return <Droplets className="w-6 h-6" />;
      case 'Hammer': return <Hammer className="w-6 h-6" />;
      case 'SquareDashedBottomCode': return <SquareDashedBottomCode className="w-6 h-6" />;
      case 'Paintbrush': return <Paintbrush className="w-6 h-6" />;
      case 'Wind': return <Wind className="w-6 h-6" />;
      default: return <Hammer className="w-6 h-6" />;
    }
  };

  // Compter le nombre de réparateurs disponibles par métier
  const getAvailableCount = (tradeId) => {
    return repairmen.filter(
      r => r.isActive && (r.primaryTrade === tradeId || r.secondaryTrade === tradeId)
    ).length;
  };

  const filteredTrades = TRADES.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.wolof.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div>
        {/* Titre et en-tête */}
        <div className="mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
            Dépannage d'urgence à domicile
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1.5">
            Que faut-il réparer chez vous ?
          </h1>
          <p className="text-xs text-slate-500">
            Choisissez le domaine de panne pour voir les artisans prêts à intervenir.
          </p>
        </div>

        {/* Assistance vocale en Wolof */}
        <AudioVoiceGuide guideKey="screen2" />

        {/* Barre de recherche rapide */}
        <div className="relative mb-4 mt-2 md:max-w-xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une panne (fuite, disjoncteur, clim...)"
            className="w-full pl-11 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Grille des 6 Métiers */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredTrades.map((trade) => {
            const count = getAvailableCount(trade.id);
            return (
              <button
                key={trade.id}
                onClick={() => handleSelectTrade(trade.id)}
                className="bg-white border border-slate-200 hover:border-orange-500 rounded-2xl p-4 text-left shadow-xs hover:shadow-md transition-all active:scale-[0.97] flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-12 h-12 rounded-xl ${trade.color} text-white flex items-center justify-center shadow-sm`}>
                    {getTradeIcon(trade.icon)}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors" />
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                    {trade.name}
                  </h3>
                  <p className="text-xs font-semibold text-orange-600/90">
                    🗣️ {trade.wolof}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {trade.description}
                  </p>

                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {count} disponible{count > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Forfait indicatif & Sécurité */}
        <div className="mt-6 p-4 bg-white border border-slate-200 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">
              Forfait Déplacement & Diagnostic : 2 500 FCFA
            </p>
            <p className="text-xs text-slate-500">
              Transparence garantie : tarif convenu avant intervention, paiement cash sur place.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
