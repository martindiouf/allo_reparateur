import React, { useState } from 'react';
import { 
  User, 
  MapPin, 
  Camera, 
  Clock, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Star, 
  ShieldCheck,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import AudioRecorder from '../components/AudioRecorder';
import AudioVoiceGuide from '../components/AudioVoiceGuide';

export default function Screen4CreateRequest() {
  const { 
    selectedRepairman, 
    clientProfile, 
    submitRequest, 
    setActiveScreen,
    busy
  } = useApp();

  const [writtenDescription, setWrittenDescription] = useState('');
  const [audioData, setAudioData] = useState(null); // { audioUrl, duration }
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [timing, setTiming] = useState('asap'); // 'asap' | 'today' | 'tomorrow'
  const [address, setAddress] = useState(clientProfile.addressLandmark || `${clientProfile.quarter}, Rue principale`);
  const [error, setError] = useState('');

  if (!selectedRepairman) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <p className="text-slate-600 mb-4">Choisissez d'abord un artisan pour faire une demande.</p>
        <button onClick={() => setActiveScreen('screen2')} className="px-5 py-3 bg-orange-600 text-white font-bold rounded-xl">
          Choisir un métier
        </button>
      </div>
    );
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Règle du CDC : La description écrite est facultative si un message vocal est joint (au moins l'un des deux)
    if (!writtenDescription.trim() && !audioData?.blob) {
      setError('Veuillez au moins enregistrer un message vocal ou écrire une brève description de la panne.');
      return;
    }

    if (!address.trim()) {
      setError('Veuillez préciser l\'adresse d\'intervention ou un point de repère.');
      return;
    }

    setError('');
    submitRequest({
      writtenDescription,
      audioBlob: audioData?.blob,
      audioMime: audioData?.mimeType,
      audioDuration: audioData?.duration,
      photoFile,
      timing,
      address
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div>
        {/* Rappel de l'ouvrier choisi */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 font-extrabold text-xs flex items-center justify-center">
              {selectedRepairman.initials}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-xs font-bold text-slate-900">{selectedRepairman.name}</h3>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-500 capitalize">
                {selectedRepairman.primaryTrade} • {selectedRepairman.quarter}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block">Déplacement</span>
            <span className="text-xs font-bold text-slate-900">
              {selectedRepairman.diagnosticFee.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        {/* Assistance vocale pour non-lecteur */}
        <AudioVoiceGuide guideKey="screen4" />

        {error && (
          <div className="p-2.5 mb-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Option Vocale (Prioritaire pour l'accessibilité) */}
          <AudioRecorder
            onAudioReady={(data) => setAudioData(data)}
            onAudioRemoved={() => setAudioData(null)}
          />

          {/* Description écrite (facultative si vocal présent) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description écrite{' '}
              <span className="text-slate-400 font-normal">
                {audioData ? '(facultative avec le message vocal)' : '(ou enregistrez votre voix au-dessus)'}
              </span>
            </label>
            <textarea
              rows="3"
              value={writtenDescription}
              onChange={(e) => setWrittenDescription(e.target.value)}
              placeholder="Ex: L'eau coule sous l'évier depuis ce matin, impossible de fermer..."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Photo de la panne (Facultative) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Photo de la panne <span className="text-slate-400 font-normal">(facultative)</span>
            </label>

            {photoPreview ? (
              <div className="relative w-full h-40 md:h-56 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                <img src={photoPreview} alt="Aperçu de la photo de la panne" className="w-full h-full object-cover" />
                <button
                  type="button"
                  aria-label="Retirer la photo"
                  onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                  className="absolute top-2 right-2 w-10 h-10 bg-red-600/90 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <Camera className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-600">Ajouter une photo de la panne</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Moment souhaité */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Moment de l'intervention <span className="text-orange-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setTiming('asap')}
                className={`py-3 px-1 min-h-[56px] text-center rounded-xl text-sm font-bold border transition-all ${
                  timing === 'asap'
                    ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>Dès que possible</span>
                <span className="block text-xs font-normal opacity-90 mt-0.5">Sous 15 min</span>
              </button>

              <button
                type="button"
                onClick={() => setTiming('today')}
                className={`py-3 px-1 min-h-[56px] text-center rounded-xl text-sm font-bold border transition-all ${
                  timing === 'today'
                    ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>Aujourd'hui</span>
                <span className="block text-xs font-normal opacity-90 mt-0.5">Dans la journée</span>
              </button>

              <button
                type="button"
                onClick={() => setTiming('tomorrow')}
                className={`py-3 px-1 min-h-[56px] text-center rounded-xl text-sm font-bold border transition-all ${
                  timing === 'tomorrow'
                    ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>Demain</span>
                <span className="block text-xs font-normal opacity-90 mt-0.5">Créneau réservé</span>
              </button>
            </div>
          </div>

          {/* Adresse d'intervention */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Adresse d'intervention & Point de repère <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Médina Rue 6 x 11, près de la grande mosquée"
                className="w-full pl-11 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              🔒 Sécurité : Votre adresse exacte n'est communiquée à l'artisan qu'après son acceptation.
            </p>
          </div>

          {/* Bouton d'envoi et avertissement CDC */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-[52px] disabled:opacity-60 disabled:cursor-wait py-3.5 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold text-base rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{busy ? 'Envoi en cours…' : 'Envoyer la demande'}</span>
            </button>
            <p className="text-xs text-slate-500 text-center mt-2 font-medium">
              L'ouvrier doit accepter la demande avant la confirmation définitive.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
