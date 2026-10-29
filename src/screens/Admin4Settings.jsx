import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { adminStats, adminSetAutoVerify, adminListActions, humanError } from '../lib/api';
import { useAdminData, PageHeader, ErrorBox, Spinner, fmtDateTime } from '../components/admin/common';

function describe(a) {
  const d = a.details || {};
  const who = a.target_name || '';
  if (a.action === 'set_verification') {
    const to = { verified: 'a validé', rejected: 'a refusé', pending: 'a remis à valider' }[d.to] || 'a modifié';
    return `${to} l'artisan ${who}`;
  }
  if (a.action === 'cancel_request') return `a annulé une demande${d.reason ? ` (${d.reason})` : ''}`;
  if (a.action === 'set_auto_verify') return d.value || d.to ? 'a activé la validation automatique' : 'a désactivé la validation automatique';
  return a.action;
}

export default function Admin4Settings() {
  const { showNotification } = useApp();
  const stats = useAdminData(adminStats);
  const log = useAdminData(() => adminListActions(40));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const auto = Boolean(stats.data?.auto_verify);

  const toggle = async () => {
    setBusy(true);
    try {
      await adminSetAutoVerify(!auto);
      showNotification(!auto ? 'Validation automatique activée.' : 'Validation manuelle activée.', 'success');
      setErr('');
      await Promise.all([stats.reload(), log.reload()]);
    } catch (e) {
      setErr(humanError(e));
    } finally {
      setBusy(false);
    }
  };

  const items = log.data?.items || [];
  return (
    <div className="max-w-3xl">
      <PageHeader title="Réglages" subtitle="Validation des artisans et journal des actions" />
      <ErrorBox message={err || stats.error || log.error} />

      <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${auto ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {auto ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold text-lg">Validation des artisans</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {auto
                ? 'Automatique : tout nouvel artisan est visible des clients immédiatement, sans contrôle.'
                : 'Manuelle : un nouvel artisan n\'apparaît aux clients qu\'après votre validation.'}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={auto}
            aria-label="Validation automatique des artisans"
            disabled={busy || !stats.data}
            onClick={toggle}
            className={`relative shrink-0 w-14 h-8 rounded-full transition disabled:opacity-60 ${auto ? 'bg-amber-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${auto ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {auto ? 'Automatique' : 'Manuelle'} · le changement ne concerne que les prochaines inscriptions.
          {stats.data?.notifications_queued > 0 && ` · ${stats.data.notifications_queued} notification(s) en file d'attente.`}
        </p>
      </section>

      <section className="mt-5" aria-labelledby="log-title">
        <h2 id="log-title" className="font-extrabold text-lg mb-2">Journal des actions</h2>
        {!log.data ? (
          !log.error && <Spinner />
        ) : items.length === 0 ? (
          <p className="text-slate-600 text-sm bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center">Aucune action enregistrée.</p>
        ) : (
          <ul className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-sm">
            {items.map((a) => (
              <li key={a.id} className="px-4 py-3 text-sm flex flex-wrap gap-x-3">
                <span className="text-slate-500 w-28 shrink-0">{fmtDateTime(a.created_at)}</span>
                <span className="flex-1 min-w-0"><strong>{a.admin_name || 'Admin'}</strong> {describe(a)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
