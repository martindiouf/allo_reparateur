import React from 'react';
import { Database } from 'lucide-react';

// Affiché uniquement si les clés Supabase ne sont pas renseignées (développement)
export default function ScreenSetup() {
  return (
    <div className="max-w-xl mx-auto py-10">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
        <Database className="w-7 h-7" />
      </div>
      <h1 className="text-2xl font-extrabold">Base de données non configurée</h1>
      <p className="text-slate-600 mt-2">
        L'application a besoin de Supabase. Créez un fichier <code className="bg-slate-100 px-1.5 py-0.5 rounded">.env</code> à la racine du projet avec :
      </p>
      <pre className="mt-3 p-4 bg-slate-900 text-slate-100 text-sm rounded-xl overflow-x-auto">{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon`}</pre>
      <p className="text-slate-600 mt-3 text-sm">
        Puis relancez <code className="bg-slate-100 px-1.5 py-0.5 rounded">npm run dev</code>. Le guide complet est dans <code className="bg-slate-100 px-1.5 py-0.5 rounded">supabase/README.md</code>.
      </p>
    </div>
  );
}
