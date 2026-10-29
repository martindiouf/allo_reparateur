import React, { useState } from 'react';
import { Phone, MessageCircle, Check, X, RotateCcw, MapPin, Clock, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { adminListRepairmen, adminSetVerification, formatPhone } from '../lib/api';
import { TRADES } from '../data/referentiel';
import { useAdminData, PageHeader, ErrorBox, Spinner, VERIF_LABELS, VERIF_STYLES, fmtDate, waLink } from '../components/admin/common';

const tradeName = (id) => TRADES.find((t) => t.id === id)?.name || id || '—';
const FILTERS = [['pending', 'À valider'], ['verified', 'Validés'], ['rejected', 'Refusés'], ['all', 'Tous']];

function Card({ r, onAct }) {
  const [note, setNote] = useState(r.admin_note || '');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (status, label) => {
    setBusy(true);
    await onAct(r, status, note.trim(), label);
    setBusy(false);
    setConfirm(false);
  };
  const noteChanged = note.trim() !== (r.admin_note || '');
  const btn = 'min-h-[44px] px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition active:scale-[0.98]';

  return (
    <li className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <h2 className="font-extrabold text-lg flex-1 min-w-0">{r.name}</h2>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${VERIF_STYLES[r.verification_status]}`}>
          {VERIF_LABELS[r.verification_status]}
        </span>
      </div>
      <p className="text-slate-700 text-sm mt-0.5">
        {tradeName(r.primary_trade)}{r.secondary_trade ? ` · ${tradeName(r.secondary_trade)}` : ''}
      </p>

      <dl className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-slate-700">
        <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-500" /><dd>{formatPhone(r.phone)}</dd></div>
        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-500" /><dd>{r.quarter}{r.zone ? ` (zone : ${r.zone})` : ''}</dd></div>
        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-500" /><dd>{String(r.start_hour).slice(0, 5)}–{String(r.end_hour).slice(0, 5)} · {(r.available_days || []).length} j/semaine</dd></div>
        <div className="text-slate-600">Déplacement : <strong className="text-slate-900">{Number(r.fee).toLocaleString('fr-FR')} FCFA</strong></div>
        <div className="text-slate-600">Inscrit le {fmtDate(r.created_at)}{r.is_active ? ' · disponible' : ''}</div>
        <div className="text-slate-600">{r.requests_received} reçue{r.requests_received > 1 ? 's' : ''} · {r.requests_accepted} acceptée{r.requests_accepted > 1 ? 's' : ''} · {r.jobs_done} terminée{r.jobs_done > 1 ? 's' : ''}</div>
      </dl>

      <div className="mt-3 flex gap-2">
        <a href={`tel:${r.phone}`} className="min-h-[40px] px-3 rounded-lg border border-slate-300 text-sm font-semibold flex items-center gap-1.5 hover:bg-slate-50"><Phone className="w-4 h-4" />Appeler</a>
        <a href={waLink(r.phone)} target="_blank" rel="noopener noreferrer" className="min-h-[40px] px-3 rounded-lg border border-slate-300 text-sm font-semibold flex items-center gap-1.5 hover:bg-slate-50"><MessageCircle className="w-4 h-4" />WhatsApp</a>
      </div>

      <label className="block mt-4 text-sm font-bold text-slate-700" htmlFor={`note-${r.id}`}>
        Note interne <span className="font-normal text-slate-500">(jamais visible par l'artisan)</span>
      </label>
      <textarea
        id={`note-${r.id}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Ex. : appelé le 12/10, pièce d'identité vue"
        className="mt-1 w-full p-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {confirm ? (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-800 font-medium">
            Les demandes en attente envoyées à cet artisan seront refusées et les clients prévenus. Confirmer ?
          </p>
          <div className="mt-2 flex gap-2">
            <button disabled={busy} onClick={() => run(r.verification_status === 'verified' ? 'pending' : 'rejected', r.verification_status === 'verified' ? 'suspended' : 'rejected')} className={`${btn} bg-red-600 text-white`}>Oui, confirmer</button>
            <button onClick={() => setConfirm(false)} className={`${btn} border border-slate-300 bg-white`}>Annuler</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.verification_status !== 'verified' && (
            <button disabled={busy} onClick={() => run('verified', 'verified')} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}><Check className="w-4 h-4" />Valider</button>
          )}
          {r.verification_status === 'pending' && (
            <button disabled={busy} onClick={() => setConfirm(true)} className={`${btn} border border-red-300 text-red-700 bg-white hover:bg-red-50`}><X className="w-4 h-4" />Refuser</button>
          )}
          {r.verification_status === 'verified' && (
            <button disabled={busy} onClick={() => setConfirm(true)} className={`${btn} border border-amber-300 text-amber-800 bg-white hover:bg-amber-50`}><RotateCcw className="w-4 h-4" />Suspendre</button>
          )}
          {r.verification_status === 'rejected' && (
            <button disabled={busy} onClick={() => run('pending', 'pending')} className={`${btn} border border-slate-300 bg-white hover:bg-slate-50`}><RotateCcw className="w-4 h-4" />Remettre à valider</button>
          )}
          {noteChanged && (
            <button disabled={busy} onClick={() => run(r.verification_status, 'note')} className={`${btn} border border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50`}><Save className="w-4 h-4" />Enregistrer la note</button>
          )}
        </div>
      )}
    </li>
  );
}

export default function Admin2Repairmen() {
  const { showNotification } = useApp();
  const [filter, setFilter] = useState('pending');
  const { data, error, loading, reload } = useAdminData(() => adminListRepairmen(null));
  const [actError, setActError] = useState('');

  const counts = (data || []).reduce((a, r) => ({ ...a, [r.verification_status]: (a[r.verification_status] || 0) + 1 }), {});
  counts.all = (data || []).length;
  const rows = (data || []).filter((r) => filter === 'all' || r.verification_status === filter);

  const onAct = async (r, status, note, label) => {
    try {
      const res = await adminSetVerification(r.id, status, note);
      const msgs = {
        verified: `${r.name} est validé : visible par les clients.`,
        rejected: `${r.name} est refusé.`,
        suspended: `${r.name} est suspendu.`,
        pending: `${r.name} repasse à valider.`,
        note: 'Note enregistrée.'
      };
      const extra = res?.requests_refused ? ` ${res.requests_refused} demande(s) en attente refusée(s).` : '';
      showNotification((msgs[label] || 'Modifié.') + extra, 'success');
      setActError('');
      await reload();
    } catch (e) {
      setActError(e.message || 'Action impossible');
    }
  };

  return (
    <div>
      <PageHeader title="Artisans" subtitle="Validez les inscriptions avant qu'ils apparaissent aux clients" onRefresh={reload} loading={loading} />
      <ErrorBox message={error || actError} onRetry={reload} />

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0 mb-3" role="tablist" aria-label="Filtrer par statut">
        {FILTERS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
            className={`shrink-0 min-h-[40px] px-4 rounded-full text-sm font-bold border transition ${filter === id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
            {label} <span className={filter === id ? 'text-indigo-100' : 'text-slate-500'}>{counts[id] || 0}</span>
          </button>
        ))}
      </div>

      {!data ? (
        !error && <Spinner />
      ) : rows.length === 0 ? (
        <p className="text-center text-slate-600 py-12 bg-white border border-dashed border-slate-300 rounded-2xl">
          {filter === 'pending' ? 'Aucun artisan à valider pour le moment.' : 'Aucun artisan dans cette catégorie.'}
        </p>
      ) : (
        <ul className="grid lg:grid-cols-2 gap-4">
          {rows.map((r) => <Card key={`${r.id}-${r.verification_status}-${r.admin_note || ''}`} r={r} onAct={onAct} />)}
        </ul>
      )}
    </div>
  );
}
