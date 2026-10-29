import React, { useRef, useState } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { VOICE_GUIDES } from '../data/referentiel';

export default function AudioVoiceGuide({ guideKey = 'screen1' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLang, setActiveLang] = useState('wolof'); // 'wolof' | 'french'
  const [noWolof, setNoWolof] = useState(false);
  const guide = VOICE_GUIDES[guideKey];
  const audioRef = useRef(null);

  // La plupart des téléphones n'ont pas de voix wolof : on évite de lire le texte avec une voix française
  const hasWolofVoice = () =>
    'speechSynthesis' in window && window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith('wo'));

  if (!guide) return null;

  // Wolof : on joue d'abord le fichier enregistré par une vraie voix (public/audio/wo/<écran>.mp3)
  const playRecorded = () =>
    new Promise((resolve) => {
      const a = new Audio(`${import.meta.env.BASE_URL}audio/wo/${guideKey}.mp3`);
      audioRef.current = a;
      a.onplaying = () => { setIsPlaying(true); resolve(true); };
      a.onended = () => setIsPlaying(false);
      a.onerror = () => resolve(false);
      a.play().catch(() => resolve(false));
    });

  const playVoice = async (lang) => {
    setActiveLang(lang);
    setNoWolof(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (isPlaying) { window.speechSynthesis?.cancel(); setIsPlaying(false); return; }
    if (lang === 'wolof' && (await playRecorded())) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isPlaying) {
        setIsPlaying(false);
        return;
      }

      if (lang === 'wolof' && !hasWolofVoice()) {
        setNoWolof(true);
        return;
      }
      const textToSpeak = lang === 'wolof' 
        ? guide.wolof 
        : guide.french;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = lang === 'wolof' ? 'wo' : 'fr-FR';
      utterance.rate = 0.95; // Légèrement plus lent pour une meilleure compréhension

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 3000);
    }
  };

  const stopVoice = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  return (
    <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 my-2 text-xs text-brand-900 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 font-bold text-brand-800">
          <Volume2 className={`w-4 h-4 text-brand-600 ${isPlaying ? 'animate-bounce text-orange-600' : ''}`} />
          <span>Assistance vocale non-lecteur</span>
        </div>
        <span className="text-xs bg-brand-200 text-brand-900 px-1.5 py-0.5 rounded font-semibold">
          Wolof / FR
        </span>
      </div>

      <p className="text-xs text-slate-600 mb-2 leading-relaxed">
        {activeLang === 'wolof' ? `🗣️ Wolof : « ${guide.wolof} »` : `🗣️ Français : « ${guide.french} »`}
      </p>

      {noWolof && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
          La voix wolof n'est pas disponible sur cet appareil. Lisez le texte ci-dessus ou écoutez en français.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => playVoice('wolof')}
          className={`flex-1 py-2.5 px-3 min-h-[44px] rounded-lg font-semibold text-sm flex items-center justify-center gap-1 transition-all ${
            isPlaying && activeLang === 'wolof'
              ? 'bg-orange-600 text-white shadow-inner animate-pulse'
              : 'bg-white border border-brand-300 text-brand-800 hover:bg-brand-100'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Écouter en Wolof</span>
        </button>

        <button
          type="button"
          onClick={() => playVoice('french')}
          className={`flex-1 py-2.5 px-3 min-h-[44px] rounded-lg font-semibold text-sm flex items-center justify-center gap-1 transition-all ${
            isPlaying && activeLang === 'french'
              ? 'bg-orange-600 text-white shadow-inner animate-pulse'
              : 'bg-white border border-brand-300 text-brand-800 hover:bg-brand-100'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>En Français</span>
        </button>

        {isPlaying && (
          <button
            type="button"
            onClick={stopVoice}
            className="p-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            title="Arrêter"
          >
            <VolumeX className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
