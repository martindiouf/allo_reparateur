import React from 'react';

// Évite la page blanche : affiche l'erreur et propose de repartir proprement
export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erreur application :', error, info?.componentStack);
  }

  reset = () => {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('sb-') || k.startsWith('allo-reparateur')).forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignoré */
    }
    window.location.hash = '';
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
          <h1 className="text-xl font-extrabold text-slate-900">Un problème est survenu</h1>
          <p className="text-slate-600 mt-2 text-sm">L'application a rencontré une erreur. Vos données ne sont pas perdues.</p>
          <pre className="mt-3 p-3 bg-slate-100 text-left text-xs text-red-700 rounded-lg overflow-auto max-h-32 whitespace-pre-wrap">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div className="mt-4 flex flex-col gap-2">
            <button onClick={() => window.location.reload()} className="min-h-[48px] bg-orange-600 text-white font-bold rounded-xl">
              Recharger la page
            </button>
            <button onClick={this.reset} className="min-h-[44px] text-sm font-semibold text-slate-600 hover:text-slate-900">
              Réinitialiser l'application (déconnexion)
            </button>
          </div>
        </div>
      </div>
    );
  }
}
