import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import AppShell from './components/AppShell';
import ScreenWelcome from './screens/ScreenWelcome';
import ScreenAuth from './screens/ScreenAuth';
import ScreenSetup from './screens/ScreenSetup';
import Screen1ClientRegister from './screens/Screen1ClientRegister';
import Screen2TradeSelect from './screens/Screen2TradeSelect';
import Screen3AvailableRepairmen from './screens/Screen3AvailableRepairmen';
import Screen4CreateRequest from './screens/Screen4CreateRequest';
import Screen5RequestTracking from './screens/Screen5RequestTracking';
import Screen6RepairmanRegister from './screens/Screen6RepairmanRegister';
import Screen7RepairmanDashboard from './screens/Screen7RepairmanDashboard';
import Admin1Dashboard from './screens/Admin1Dashboard';
import Admin2Repairmen from './screens/Admin2Repairmen';
import Admin3Requests from './screens/Admin3Requests';
import Admin4Settings from './screens/Admin4Settings';
import ScreenNoAccess from './screens/ScreenNoAccess';

const CLIENT_SCREENS = {
  screen1: Screen1ClientRegister,
  screen2: Screen2TradeSelect,
  screen3: Screen3AvailableRepairmen,
  screen4: Screen4CreateRequest,
  screen5: Screen5RequestTracking
};
const REPAIRMAN_SCREENS = {
  screen6: Screen6RepairmanRegister,
  screen7: Screen7RepairmanDashboard
};

const ADMIN_SCREENS = {
  admin1: Admin1Dashboard,
  admin2: Admin2Repairmen,
  admin3: Admin3Requests,
  admin4: Admin4Settings
};

function Loader() {
  const { signOut, session } = useApp();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center" role="status" aria-label="Chargement">
      <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
      {slow && (
        <div className="max-w-xs">
          <p className="text-sm text-slate-600">Le chargement est plus long que d'habitude. Vérifiez votre connexion.</p>
          <div className="mt-3 flex flex-col gap-2">
            <button onClick={() => window.location.reload()} className="min-h-[44px] bg-orange-600 text-white font-bold rounded-xl">Réessayer</button>
            {session && <button onClick={signOut} className="min-h-[44px] text-sm font-semibold text-slate-600">Se déconnecter</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const { isConfigured, authLoading, session, dataLoaded, activeScreen, currentRole, isAdmin, clientProfile, myRepairmanProfile } = useApp();

  let Screen = ScreenWelcome;
  if (!isConfigured) {
    Screen = ScreenSetup;
  } else if (authLoading || (session && !dataLoaded)) {
    Screen = Loader;
  } else if (currentRole && !session) {
    Screen = ScreenAuth;
  } else if (currentRole === 'admin') {
    // Le serveur contrôle aussi chaque action : cet écran n'est qu'un confort
    Screen = isAdmin ? ADMIN_SCREENS[activeScreen] || Admin1Dashboard : ScreenNoAccess;
  } else if (currentRole === 'client') {
    // Il faut un profil pour parcourir l'appli côté client
    Screen = clientProfile ? CLIENT_SCREENS[activeScreen] || Screen2TradeSelect : Screen1ClientRegister;
  } else if (currentRole === 'repairman') {
    Screen = myRepairmanProfile ? REPAIRMAN_SCREENS[activeScreen] || Screen7RepairmanDashboard : Screen6RepairmanRegister;
  }

  return (
    <AppShell>
      <Screen />
    </AppShell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
