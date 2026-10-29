import React, { useState } from 'react';
import { Users, HardHat, ClipboardList, CheckCheck, Timer, ArrowRight, BarChart3, Table2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { adminStats } from '../lib/api';
import { useAdminData, PageHeader, ErrorBox, Spinner, STATUS_LABELS, StatusBadge } from '../components/admin/common';

function niceMax(m) {
  if (m <= 4) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(m)));
  for (const k of [1, 2, 4, 5, 10]) if (m <= k * p) return k * p;
  return 10 * p;
}

const dayLong = (s) => new Date(`${s}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const dayNum = (s) => String(new Date(`${s}T12:00:00`).getDate());

function Tile({ icon: Icon, label, value, hint, onClick }) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <Icon className="w-4 h-4 text-slate-500" aria-hidden />
        {label}
      </div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-600">{hint}</div>}
    </>
  );
  const cls = 'text-left bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm';
  return onClick ? (
    <button onClick={onClick} className={`${cls} hover:border-indigo-400 transition`}>{body}</button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function DailyChart({ daily }) {
  const [view, setView] = useState('chart');
  const [hover, setHover] = useState(null);
  const max = niceMax(Math.max(0, ...daily.map((d) => d.n)));
  const ticks = [max, max / 2, 0];
  const total = daily.reduce((a, d) => a + d.n, 0);
  const H = 160;

  return (
    <section className="viz-root bg-[var(--viz-surface)] border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm" aria-labelledby="chart-title">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h2 id="chart-title" className="font-extrabold text-base md:text-lg" style={{ color: 'var(--viz-text)' }}>Demandes par jour</h2>
          <p className="text-sm" style={{ color: 'var(--viz-text-2)' }}>14 derniers jours · {total} demande{total > 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex p-1 bg-slate-100 rounded-lg" role="group" aria-label="Affichage">
          {[['chart', BarChart3, 'Graphique'], ['table', Table2, 'Tableau']].map(([id, I, l]) => (
            <button key={id} onClick={() => setView(id)} aria-pressed={view === id} aria-label={l} title={l}
              className={`w-9 h-9 rounded-md flex items-center justify-center ${view === id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
              <I className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {view === 'chart' ? (
        <div className="mt-4 flex gap-2">
          <div className="relative w-8 shrink-0 text-right text-xs" style={{ height: H, color: 'var(--viz-muted)' }} aria-hidden>
            {ticks.map((t, i) => (
              <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: (i / 2) * H }}>{t}</span>
            ))}
          </div>
          <div className="relative flex-1 min-w-0">
            <div className="relative" style={{ height: H }}>
              {ticks.map((t, i) => (
                <div key={i} className="absolute inset-x-0" style={{ top: (i / 2) * H, borderTop: `1px solid ${i === 2 ? 'var(--viz-base)' : 'var(--viz-grid)'}` }} />
              ))}
              <div className="absolute inset-0 flex">
                {daily.map((d, i) => (
                  <button
                    key={d.day}
                    type="button"
                    aria-label={`${dayLong(d.day)} : ${d.n} demande${d.n > 1 ? 's' : ''}`}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="relative flex-1 h-full flex items-end justify-center px-[1px] focus-visible:outline-offset-[-2px]"
                  >
                    <span
                      className="block w-full max-w-[24px]"
                      style={{ height: `${(d.n / max) * 100}%`, background: 'var(--viz-series)', borderRadius: '4px 4px 0 0', opacity: hover === null || hover === i ? 1 : 0.55 }}
                    />
                  </button>
                ))}
              </div>
              {hover !== null && (
                <div
                  className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-full bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg"
                  style={{
                    left: `${Math.min(88, Math.max(12, ((hover + 0.5) / daily.length) * 100))}%`,
                    top: Math.max(0, H - (daily[hover].n / max) * H - 6)
                  }}
                  role="tooltip"
                >
                  <span className="font-bold">{daily[hover].n}</span> demande{daily[hover].n > 1 ? 's' : ''} · {dayLong(daily[hover].day)}
                </div>
              )}
            </div>
            <div className="flex mt-1.5" style={{ height: 20 }} aria-hidden>
              {daily.map((d, i) => (
                <span key={d.day} className="flex-1 text-center text-[11px] leading-5" style={{ color: 'var(--viz-muted)' }}>
                  {i % 2 === daily.length % 2 || i === daily.length - 1 ? dayNum(d.day) : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left sticky top-0">
              <tr><th className="px-3 py-2 font-semibold">Jour</th><th className="px-3 py-2 font-semibold text-right">Demandes</th></tr>
            </thead>
            <tbody>
              {[...daily].reverse().map((d) => (
                <tr key={d.day} className="border-t border-slate-100">
                  <td className="px-3 py-1.5">{dayLong(d.day)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function Admin1Dashboard() {
  const { setActiveScreen } = useApp();
  const { data: s, error, loading, reload } = useAdminData(adminStats);

  const minutes = s?.avg_response_minutes;
  const pct = (v) => (v == null ? '—' : `${Math.round(v)} %`);

  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de l'activité" onRefresh={reload} loading={loading} />
      <ErrorBox message={error} onRetry={reload} />
      {!s ? (
        !error && <Spinner />
      ) : (
        <div className="space-y-5">
          {s.repairmen_pending > 0 && (
            <button
              onClick={() => setActiveScreen('admin2')}
              className="w-full flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left hover:bg-amber-100 transition"
            >
              <HardHat className="w-6 h-6 text-amber-700 shrink-0" />
              <span className="flex-1 font-bold text-amber-900">
                {s.repairmen_pending} artisan{s.repairmen_pending > 1 ? 's' : ''} en attente de validation
              </span>
              <ArrowRight className="w-5 h-5 text-amber-700" />
            </button>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Tile icon={Users} label="Comptes" value={s.users_total} hint={`${s.repairmen_total} artisan${s.repairmen_total > 1 ? 's' : ''}`} />
            <Tile icon={HardHat} label="Artisans validés" value={s.repairmen_verified} hint={`${s.repairmen_online} disponible${s.repairmen_online > 1 ? 's' : ''} maintenant`} onClick={() => setActiveScreen('admin2')} />
            <Tile icon={ClipboardList} label="Demandes aujourd'hui" value={s.requests_today} hint={`${s.requests_7d} sur 7 jours · ${s.requests_total} en tout`} onClick={() => setActiveScreen('admin3')} />
            <Tile icon={CheckCheck} label="Taux d'acceptation" value={pct(s.accept_rate)} hint="Parmi les demandes traitées" />
          </div>

          <div className="grid lg:grid-cols-3 gap-4 md:gap-5">
            <div className="lg:col-span-2"><DailyChart daily={s.daily || []} /></div>

            <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm" aria-labelledby="st-title">
              <h2 id="st-title" className="font-extrabold text-base md:text-lg">Demandes par statut</h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {Object.keys(STATUS_LABELS).map((k) => (
                  <li key={k} className="flex items-center justify-between py-2">
                    <StatusBadge status={k} />
                    <span className="font-bold tabular-nums">{s.by_status?.[k] || 0}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-600">
                <Timer className="w-4 h-4" />
                Délai moyen de réponse : <strong className="text-slate-900">{minutes == null ? '—' : `${Math.round(minutes)} min`}</strong>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
