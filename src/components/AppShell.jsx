import React from 'react';
import { ArrowLeft, Home, ClipboardList, User, Wrench, CheckCircle, AlertCircle, MapPin, ShieldCheck, Repeat, LogOut, LayoutDashboard, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Écran précédent logique pour le bouton « retour » de l'en-tête
const BACK_TARGET = {
  screen1: 'screen2',
  screen3: 'screen2',
  screen4: 'screen3'
};

export default function AppShell({ children }) {
  const {
    activeScreen,
    setActiveScreen,
    currentRole,
    resetRole,
    signOut,
    session,
    clientProfile,
    activeRequest,
    incomingRequest,
    isAdmin,
    notification
  } = useApp();

  const isWelcome = activeScreen === 'welcome' || !currentRole;
  const noNav = isWelcome || (currentRole === 'admin' && !isAdmin);

  // Navigation principale selon le rôle
  const clientNav = [
    { id: 'screen2', label: 'Accueil', icon: Home, match: ['screen2', 'screen3', 'screen4'] },
    {
      id: 'screen5',
      label: 'Mes demandes',
      icon: ClipboardList,
      match: ['screen5'],
      badge: activeRequest?.status === 'en_attente'
    },
    { id: 'screen1', label: 'Mon profil', icon: User, match: ['screen1'] }
  ];
  const repairmanNav = [
    {
      id: 'screen7',
      label: 'Demandes reçues',
      icon: ClipboardList,
      match: ['screen7'],
      badge: incomingRequest?.status === 'en_attente'
    },
    { id: 'screen6', label: 'Mon profil', icon: User, match: ['screen6'] }
  ];
  const adminNav = [
    { id: 'admin1', label: 'Tableau de bord', icon: LayoutDashboard, match: ['admin1'] },
    { id: 'admin2', label: 'Artisans', icon: Wrench, match: ['admin2'] },
    { id: 'admin3', label: 'Demandes', icon: ClipboardList, match: ['admin3'] },
    { id: 'admin4', label: 'Réglages', icon: Settings, match: ['admin4'] }
  ];
  const isAdminRole = currentRole === 'admin';
  const nav = isAdminRole ? adminNav : currentRole === 'repairman' ? repairmanNav : clientNav;
  const activeCls = isAdminRole ? 'bg-indigo-50 text-indigo-700' : 'bg-orange-50 text-orange-700';
  const activeTxt = isAdminRole ? 'text-indigo-600 font-bold' : 'text-orange-600 font-bold';

  const backTarget = BACK_TARGET[activeScreen];
  const isRepairman = currentRole === 'repairman';

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 text-slate-900">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:rounded-lg"
      >
        Aller au contenu
      </a>

      {/* En-tête */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto w-full px-4 md:px-6 h-14 md:h-16 flex items-center gap-3">
          {backTarget && !isWelcome && (
            <button
              onClick={() => setActiveScreen(backTarget)}
              aria-label="Retour"
              className="w-10 h-10 -ml-2 rounded-full hover:bg-slate-100 active:scale-95 flex items-center justify-center text-slate-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => !isWelcome && setActiveScreen(isAdminRole ? 'admin1' : isRepairman ? 'screen7' : 'screen2')}
            className="flex items-center gap-2.5 shrink-0 whitespace-nowrap"
            aria-label="Allô Réparateur — accueil"
          >
            <span className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-sm">
              <Wrench className="w-5 h-5" />
            </span>
            <span className="text-base md:text-lg font-extrabold tracking-tight">
              Allô <span className="text-orange-600">Réparateur</span>
            </span>
          </button>

          {/* Navigation horizontale (tablette / ordinateur) */}
          {!noNav && (
            <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-1 ml-6">
              {nav.map((item) => {
                const active = item.match.includes(activeScreen);
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveScreen(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative px-3 lg:px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition ${
                      active ? activeCls : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {item.badge && (
                      <span className="w-2 h-2 rounded-full bg-orange-600" aria-label="nouveau" />
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            {!isWelcome && (
              <>
                {isAdminRole ? (
                  <span className="hidden xl:flex whitespace-nowrap items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold px-2.5 py-1.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Administration
                  </span>
                ) : isRepairman ? (
                  <span className="hidden sm:flex whitespace-nowrap items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-2.5 py-1.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Espace artisan
                  </span>
                ) : (
                  <span className="hidden sm:flex whitespace-nowrap items-center gap-1 bg-orange-50 border border-orange-200 text-orange-800 text-xs font-bold px-2.5 py-1.5 rounded-full">
                    <MapPin className="w-3.5 h-3.5" />
                    {clientProfile?.quarter || 'Dakar'}
                  </span>
                )}
                <button
                  onClick={resetRole}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-2 rounded-lg transition"
                  title="Changer d'espace"
                >
                  <Repeat className="w-4 h-4" />
                  <span className="hidden lg:inline whitespace-nowrap">Changer d'espace</span>
                </button>
                {session && (
                  <button
                    onClick={signOut}
                    aria-label="Se déconnecter"
                    title="Se déconnecter"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-2 rounded-lg transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden xl:inline whitespace-nowrap">Déconnexion</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Notification */}
      <div className="fixed top-16 md:top-20 inset-x-0 z-50 px-4 flex justify-center pointer-events-none" role="status" aria-live="polite">
        {notification && (
          <div className="pointer-events-auto bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-md w-full">
            {notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-orange-400 shrink-0" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        )}
      </div>

      {/* Contenu */}
      <main
        id="contenu"
        className={`flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8 ${
          isWelcome ? '' : 'pb-28 md:pb-10'
        }`}
      >
        {children}
      </main>

      {/* Pied de page (ordinateur) */}
      <footer className="hidden md:block border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 text-xs text-slate-500 flex justify-between">
          <span>Allô Réparateur — Dépannage à domicile à Dakar et au Sénégal</span>
          <span>© 2026</span>
        </div>
      </footer>

      {/* Barre de navigation en bas (téléphone) */}
      {!noNav && (
        <nav
          aria-label="Navigation principale"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex items-stretch justify-around">
            {nav.map((item) => {
              const active = item.match.includes(activeScreen);
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveScreen(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 text-xs transition ${
                    active ? activeTxt : 'text-slate-500'
                  }`}
                >
                  <span className="relative">
                    <item.icon className="w-6 h-6" />
                    {item.badge && (
                      <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 bg-orange-600 rounded-full border-2 border-white" />
                    )}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
