import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { humanError } from '../../lib/api';

// Charge des données admin, se rafraîchit toutes les 30 s (onglet visible) et à la demande
export function useAdminData(fetcher, deps = [], every = 30000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  const reload = useCallback(async () => {
    try {
      const d = await fetchRef.current();
      setData(d);
      setError('');
    } catch (e) {
      setError(humanError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    reload();
    const t = setInterval(() => document.visibilityState === 'visible' && reload(), every);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, ...deps]);

  return { data, error, loading, reload };
}

export function PageHeader({ title, subtitle, onRefresh, loading, children }) {
  return (
    <div className="flex flex-wrap items-start gap-3 mb-5">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-600 mt-1 text-sm md:text-base">{subtitle}</p>}
      </div>
      {children}
      {onRefresh && (
        <button
          onClick={onRefresh}
          aria-label="Actualiser"
          title="Actualiser"
          className="w-11 h-11 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-3 p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {onRetry && <button onClick={onRetry} className="font-bold underline">Réessayer</button>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16" role="status" aria-label="Chargement">
      <div className="w-9 h-9 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
    </div>
  );
}

export const STATUS_LABELS = {
  en_attente: 'En attente',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
  annulee: 'Annulée',
  terminee: 'Terminée',
  expiree: 'Expirée'
};
export const STATUS_STYLES = {
  en_attente: 'bg-amber-50 text-amber-800 border-amber-200',
  acceptee: 'bg-blue-50 text-blue-800 border-blue-200',
  refusee: 'bg-slate-100 text-slate-700 border-slate-200',
  annulee: 'bg-slate-100 text-slate-700 border-slate-200',
  terminee: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  expiree: 'bg-slate-100 text-slate-700 border-slate-200'
};
export function StatusBadge({ status }) {
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[status] || STATUS_STYLES.refusee}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export const VERIF_LABELS = { pending: 'À valider', verified: 'Validé', rejected: 'Refusé' };
export const VERIF_STYLES = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  verified: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200'
};

export function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const waLink = (phone) => `https://wa.me/${String(phone || '').replace(/\D/g, '')}`;
