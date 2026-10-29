import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Trash2, Volume2, Sparkles } from 'lucide-react';

export default function AudioRecorder({ onAudioReady, onAudioRemoved, initialAudioUrl = null, initialDuration = 0 }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const durationRef = useRef(0);
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl);
  const [audioDuration, setAudioDuration] = useState(initialDuration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [permissionError, setPermissionError] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioElementRef = useRef(null);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Gestion de la lecture de l'audio
  useEffect(() => {
    if (!audioElementRef.current) return;
    const audio = audioElementRef.current;

    const handleTimeUpdate = () => setPlaybackTime(Math.floor(audio.currentTime));
    const handleEnded = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  // Démarrer l'enregistrement
  const startRecording = async () => {
    setPermissionError(false);
    audioChunksRef.current = [];

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Safari (iPhone) n'enregistre pas en webm : on choisit un format supporté par l'appareil
        const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
          .find((t) => window.MediaRecorder?.isTypeSupported?.(t));
        const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        durationRef.current = 0;
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const type = mediaRecorder.mimeType || mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type });
          const url = URL.createObjectURL(audioBlob);
          const duration = Math.max(1, Math.min(60, durationRef.current));
          setAudioUrl(url);
          setAudioDuration(duration);
          onAudioReady && onAudioReady({ audioUrl: url, duration, blob: audioBlob, mimeType: type });
          // Arrêter les pistes micro
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start(200);
        setIsRecording(true);
        setRecordingTime(0);

        timerIntervalRef.current = setInterval(() => {
          durationRef.current += 1;
          if (durationRef.current >= 60) stopRecording();
          setRecordingTime(Math.min(60, durationRef.current));
        }, 1000);
      } else {
        setPermissionError(true);
      }
    } catch (err) {
      console.warn('Accès micro refusé ou non supporté :', err);
      setPermissionError(true);
    }
  };

  // Arrêter l'enregistrement
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsRecording(false);
  };

  // Basculer la lecture
  const togglePlay = () => {
    if (!audioElementRef.current) return;
    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  // Supprimer l'enregistrement
  const deleteRecording = () => {
    if (isPlaying && audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setAudioUrl(null);
    setAudioDuration(0);
    setRecordingTime(0);
    setIsPlaying(false);
    onAudioRemoved && onAudioRemoved();
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Message vocal</h4>
            <p className="text-xs text-slate-500">Parlez pour expliquer la panne (max 1 min)</p>
          </div>
        </div>

        {audioUrl && !isRecording && (
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            ✓ Enregistré ({formatSeconds(audioDuration)})
          </span>
        )}
      </div>

      {permissionError && (
        <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          ⚠️ Micro non accessible. Autorisez le micro dans votre navigateur, ou écrivez la description de la panne ci-dessous.
        </div>
      )}

      {/* État 1 : Enregistrement en cours */}
      {isRecording ? (
        <div className="flex flex-col items-center justify-center py-4 bg-orange-50/50 rounded-xl border border-dashed border-orange-300">
          <div className="relative flex items-center justify-center mb-3">
            <div className="absolute w-20 h-20 rounded-full bg-orange-400/20 animate-pulse-ring" />
            <div className="relative w-16 h-16 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Mic className="w-8 h-8 animate-pulse" />
            </div>
          </div>

          {/* Onde audio animée */}
          <div className="flex items-center gap-1 h-6 mb-2">
            {[40, 80, 55, 90, 70, 100, 60, 85, 45, 95, 65, 35].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-orange-500 rounded-full transition-all duration-150 animate-pulse"
                style={{
                  height: `${Math.max(6, (h * Math.random()).toFixed(0))}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>

          <p className="text-base font-extrabold text-orange-700 tracking-wider">
            {formatSeconds(recordingTime)} <span className="text-xs font-normal text-slate-500">/ 1:00</span>
          </p>
          <p className="text-xs text-slate-600 mt-1">Enregistrement en cours... Parlez clairement</p>

          <button
            type="button"
            onClick={stopRecording}
            className="mt-3 px-6 py-3 min-h-[48px] bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-full flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Terminer l'enregistrement</span>
          </button>
        </div>
      ) : audioUrl ? (
        /* État 2 : Audio enregistré et prêt à être réécouté */
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <audio ref={audioElementRef} src={audioUrl} preload="auto" />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="w-11 h-11 rounded-full bg-orange-600 hover:bg-orange-700 active:scale-95 text-white flex items-center justify-center shadow-md transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                <span>{isPlaying ? 'Lecture...' : 'Votre message vocal'}</span>
                <span>{formatSeconds(isPlaying ? playbackTime : audioDuration)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-200"
                  style={{
                    width: `${audioDuration > 0 ? ((isPlaying ? playbackTime : audioDuration) / audioDuration) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={startRecording}
                className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                title="Refaire l'enregistrement"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={deleteRecording}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* État 3 : Aucun audio - Grand bouton micro d'enregistrement */
        <button
          type="button"
          onClick={startRecording}
          className="w-full flex flex-col items-center justify-center py-5 bg-white border border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50/40 rounded-xl transition"
        >
          <span className="w-16 h-16 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 mb-2">
            <Mic className="w-8 h-8" />
          </span>
          <span className="text-sm font-bold text-slate-800">Appuyer pour enregistrer</span>
          <span className="text-xs text-slate-500 mt-0.5">Idéal si vous préférez expliquer à l'oral</span>
        </button>
      )}
    </div>
  );
}
