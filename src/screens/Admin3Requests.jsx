import React, { useCallback, useEffect, useState } from 'react';
import { Mic, Image as ImageIcon, Repeat, Ban, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { adminListRequests, adminCancelRequest, formatPhone, humanError } from '../lib/api';
import { TRADES } from '../data/referentiel';
import { PageHeader, ErrorBox, Spinner, StatusBadge, STATUS_LABELS, fmtDateTime } from '../components/admin/common';

const PAGE = 30;
const TIMING = { asap: 'Dès que possible', today: "Aujourd'hui", tomorrow: 'Demain' };
const tradeName = (id) => TRADES.find((t) => t.id === id)?.name || id;

function Row({ r, onCancel }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const cancellable = r.status === 'en_attente' || r.status === 'acceptee';

  const doCancel = async () => {
    setBusy(true);
    await onCancel(r, reason.trim());
    setBusy(false);
    setOpen(false);
  };

  return (
    <li className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={r.status} />
        <span className="font-extrabold">{tradeName(r.trade)}</span>
        <span className="text-sm text-slate-600">· {r.quarter} · {TIMING[r.timing]}</span>
        <span className="ml-auto text-xs text-slate-500">{fmtDateTime(r.created_at)}</span>
      </div>

      <div className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-700">
        <p>Client : <strong>{r.client_name}</strong> <a className="text-indigo-700 underline" href={`tel:${r.client_phone}`}>{formatPhone(r.client_phone)}</a></p>
        <p>Artisan : <strong>{r.repairman_name}</strong> <a className="text-indigo-700 underline" href={`tel:${r.repairman_phone}`}>{formatPhone(r.repairman_phone)}</a></p>
        {r.address && <p className="sm:col-span-2">Adresse : {r.address}</p>}
        <p className="text-slate-600">Déplacement : {Number(r.fee).toLocaleString('fr-FR')} FCFA</p>
        {r.responded_at && <p className="text-slate-600">Réponse : {fmtDateTime(r.responded_at)}</p>}
        {r.status === 'en_attente' && <p className="text-slate-600">Expire : {fmtDateTime(r.response_deadline)}</p>}
      </div>

      {r.description && <p className="mt-2 text-sm bg-slate-50 rounded-lg p-2.5 text-slate-800">« {r.description} »</p>}
      <div className="mt-2 flex gap-3 text-xs text-slate-600">
        {r.has_audio && <span className="flex items-center gap-1"><Mic className="w-3.5 h-3.5" />Message vocal</span>}
        {r.has_photo && <span className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" />Photo</span>}
        {r.is_rebound && <span className="flex items-center gap-1"><Repeat className="w-3.5 h-3.5" />Transférée</span>}
      </div>

      {cancellable && !open && (
        <button onClick={() => setOpen(true)} className="mt-3 min-h-[40px] px-3 rounded-lg border border-red-300 text-red-700 text-sm font-bold flex items-center gap-1.5 hover:bg-red-50">
          <Ban className="w-4 h-4" />Annuler cette demande
        </button>
      )}
      {open && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <label htmlFor={`reason-${r.id}`} className="block text-sm font-bold text-red-900">Motif (facultatif)</label>
          <input id={`reason-${r.id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className="mt-1 w-full p-2.5 border border-red-200 rounded-lg text-sm bg-white" />
          <p className="text-xs text-red-800 mt-1.5">Le client et l'artisan seront prévenus.</p>
          <div className="mt-2 flex gap-2">
            <button disabled={busy} onClick={doCancel} className="min-h-[44px] px-4 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-60">Confirmer l'annulation</button>
            <button onClick={() => setOpen(false)} className="min-h-[44px] px-4 rounded-xl border border-slate-300 bg-white font-bold text-sm">Retour</button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function Admin3Requests() {
  const { showNotification } = useApp();
  const [status, setStatus] = useState('');
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);

  const load = useCallback(async (keep) => {
    setLoading(true);
    try {
      const res = await adminListRequests({ status: status || null, limit: Math.max(PAGE, keep || 0), offset: 0 });
      setItems(res.items);
      setTotal(res.total);
      setError('');
    } catch (e) {
      setError(humanError(e));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { setItems(null); load(); }, [load]);

  const loadMore = async () => {
    setMore(true);
    try {
      const res = await adminListRequests({ status: status || null, limit: PAGE, offset: items.length });
      setItems((prev) => [...prev, ...res.items]);
      setTotal(res.total);
    } catch (e) {
      setError(humanError(e));
    } finally {
      setMore(false);
    }
  };

  const onCancel = async (r, reason) => {
    try {
      await adminCancelRequest(r.id, reason || null);
      showNotification('Demande annulée. Client et artisan prévenus.', 'success');
      await load(items?.length);
    } catch (e) {
      setError(humanError(e));
    }
  };

  return (
    <div>
      <PageHeader title="Demandes" subtitle={`${total} demande${total > 1 ? 's' : ''}${status ? ` · ${STATUS_LABELS[status].toLowerCase()}` : ''}`} onRefresh={() => load(items?.length)} loading={loading}>
        <label className="sr-only" htmlFor="f-status">Filtrer par statut</label>
        <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </PageHeader>
      <ErrorBox message={error} onRetry={() => load()} />

      {!items ? (
        !error && <Spinner />
      ) : items.length === 0 ? (
        <p className="text-center text-slate-600 py-12 bg-white border border-dashed border-slate-300 rounded-2xl">Aucune demande.</p>
      ) : (
        <>
          <ul className="grid lg:grid-cols-2 gap-3 md:gap-4">{items.map((r) => <Row key={r.id + r.status} r={r} onCancel={onCancel} />)}</ul>
          {items.length < total && (
            <div className="text-center mt-5">
              <button disabled={more} onClick={loadMore} className="min-h-[48px] px-6 rounded-xl border border-slate-300 bg-white font-bold hover:bg-slate-50 disabled:opacity-60">
                {more ? 'Chargement…' : `Voir plus (${total - items.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
