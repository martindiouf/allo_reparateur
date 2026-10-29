import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import * as api from '../lib/api';
import { compressImage, audioExtension } from '../lib/media';
import { TRADES } from '../data/referentiel';

const AppContext = createContext();

const UI_KEY = 'allo-reparateur:ui';
const VALID_SCREENS = ['welcome', 'screen1', 'screen2', 'screen3', 'screen4', 'screen5', 'screen6', 'screen7', 'admin1', 'admin2', 'admin3', 'admin4'];

function loadUi() {
  try {
    return JSON.parse(localStorage.getItem(UI_KEY)) || {};
  } catch {
    return {};
  }
}
function saveUi(data) {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(data));
  } catch {
    /* stockage bloqué : sans conséquence */
  }
}

function screenFromHash() {
  const id = window.location.hash.replace(/^#\/?/, '');
  return VALID_SCREENS.includes(id) ? id : null;
}

// Une requête réseau qui ne répond pas ne doit jamais bloquer l'application
const withTimeout = (promise, ms, label = 'Délai dépassé') =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms))]);

const POLL_FAST = 8000; // une demande est en cours
const POLL_SLOW = 30000;

export function AppProvider({ children }) {
  const ui = useRef(loadUi()).current;

  // --- Session ---------------------------------------------------------------
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isConfigured);

  // --- Données serveur -------------------------------------------------------
  const [clientProfile, setClientProfile] = useState(null);
  const [myRepairmanProfile, setMyRepairmanProfile] = useState(null);
  const [repairmen, setRepairmen] = useState([]);
  const [clientRequests, setClientRequests] = useState([]);
  const [repairmanRequests, setRepairmanRequests] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- Interface ------------------------------------------------------------
  const [currentRole, setCurrentRole] = useState(ui.currentRole || null); // 'client' | 'repairman' | 'admin' | null
  const [dismissed, setDismissed] = useState(ui.dismissed || []);
  const [selectedTrade, setSelectedTrade] = useState('plombier');
  const [selectedRepairman, setSelectedRepairman] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mediaUrls, setMediaUrls] = useState({}); // chemin -> URL signée
  const [activeScreen, setActiveScreenState] = useState(() => screenFromHash() || 'welcome');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    saveUi({ currentRole, dismissed: dismissed.slice(-50) });
  }, [currentRole, dismissed]);

  // --- Navigation par URL ----------------------------------------------------
  const setActiveScreen = useCallback((screen) => {
    setActiveScreenState(screen);
    if (window.location.hash !== `#/${screen}`) window.history.pushState(null, '', `#/${screen}`);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onPop = () => setActiveScreenState(screenFromHash() || 'welcome');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // --- Notifications (toast) -------------------------------------------------
  const [notification, setNotification] = useState(null);
  const toastTimer = useRef(null);
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setNotification(null), 5000);
  }, []);
  const fail = useCallback((e) => showNotification(api.humanError(e), 'error'), [showNotification]);

  // --- Session Supabase ------------------------------------------------------
  useEffect(() => {
    if (!isConfigured) return;
    withTimeout(supabase.auth.getSession(), 8000, 'Session indisponible')
      .then(({ data }) => setSession(data.session))
      .catch((e) => console.warn('Lecture de la session impossible :', e))
      .finally(() => setAuthLoading(false));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id || null;

  // --- Chargement / synchronisation -----------------------------------------
  const refreshing = useRef(false);
  const dataLoadedRef = useRef(false);
  dataLoadedRef.current = dataLoaded;
  const roleRef = useRef(currentRole);
  roleRef.current = currentRole;
  const refresh = useCallback(async () => {
    if (!isConfigured || !userId || refreshing.current) return;
    refreshing.current = true;
    try {
      const profiles = await withTimeout(api.fetchMyProfiles(), 20000, 'Le serveur ne répond pas');
      setClientProfile(profiles.client);
      setMyRepairmanProfile(profiles.repairman);
      setIsAdmin(profiles.isAdmin);

      const [list, mine, incoming] = await withTimeout(Promise.all([
        // l'annuaire ne sert qu'au client : on évite de le recharger toutes les 8 s côté artisan
        roleRef.current !== 'repairman' && roleRef.current !== 'admin' && (profiles.client || profiles.repairman) ? api.fetchRepairmen() : null,
        profiles.client ? api.fetchRequests('client') : [],
        profiles.repairman ? api.fetchRequests('repairman') : []
      ]), 20000, 'Le serveur ne répond pas');
      if (list) setRepairmen(list);
      setClientRequests(mine);
      setRepairmanRequests(incoming);
      setNow(Date.now());
    } catch (e) {
      console.warn('Synchronisation impossible :', e);
      if (!dataLoadedRef.current) showNotification(api.humanError(e), 'error');
    } finally {
      refreshing.current = false;
      setDataLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setClientProfile(null);
      setMyRepairmanProfile(null);
      setIsAdmin(false);
      setRepairmen([]);
      setClientRequests([]);
      setRepairmanRequests([]);
      setDataLoaded(false);
      return;
    }
    refresh();
  }, [userId, refresh]);

  const hasPending =
    clientRequests.some((r) => r.status === 'en_attente') || repairmanRequests.some((r) => r.status === 'en_attente');

  // Un artisan disponible doit voir arriver une demande vite (délai de réponse : 15 min)
  const waitingForRequests = currentRole === 'repairman' && Boolean(myRepairmanProfile?.isActive);

  // Changement d'espace : recharger l'annuaire quand on repasse côté client
  useEffect(() => {
    if (userId && currentRole === 'client') refresh();
  }, [currentRole, userId, refresh]);

  useEffect(() => {
    if (!userId) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, hasPending || waitingForRequests ? POLL_FAST : POLL_SLOW);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', refresh);
    };
  }, [userId, hasPending, waitingForRequests, refresh]);

  // Compte à rebours local entre deux synchronisations
  useEffect(() => {
    if (!hasPending) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasPending]);

  const withRemaining = useCallback(
    (r) => ({
      ...r,
      remainingSeconds:
        r.status === 'en_attente' ? Math.max(0, Math.round(r.serverRemaining - (now - r.receivedAt) / 1000)) : 0
    }),
    [now]
  );

  // Quand un compte à rebours tombe à 0, on demande au serveur de constater l'expiration
  const expiredPending = [...clientRequests, ...repairmanRequests].some(
    (r) => r.status === 'en_attente' && withRemaining(r).remainingSeconds === 0
  );
  useEffect(() => {
    if (expiredPending) refresh();
  }, [expiredPending, refresh]);

  // --- Demandes dérivées -----------------------------------------------------
  const activeRequest = useMemo(() => {
    const latest = clientRequests.find((r) => !dismissed.includes(r.id));
    return latest ? withRemaining(latest) : null;
  }, [clientRequests, dismissed, withRemaining]);

  const incomingRequest = useMemo(() => {
    const open =
      repairmanRequests.find((r) => r.status === 'en_attente' && withRemaining(r).remainingSeconds > 0) ||
      repairmanRequests.find((r) => r.status === 'acceptee');
    return open ? withRemaining(open) : null;
  }, [repairmanRequests, withRemaining]);

  const repairmanHistory = useMemo(
    () => repairmanRequests.filter((r) => ['terminee', 'refusee', 'annulee', 'expiree'].includes(r.status)),
    [repairmanRequests]
  );

  // Messages vocaux et photos : URL signées (le bucket est privé)
  const wantedPaths = [
    activeRequest?.audioPath,
    activeRequest?.photoPath,
    incomingRequest?.audioPath,
    incomingRequest?.photoPath
  ].filter(Boolean);
  const wantedKey = wantedPaths.join('|');
  useEffect(() => {
    let cancelled = false;
    wantedPaths.forEach(async (path) => {
      if (mediaUrls[path]) return;
      const url = await api.signedUrl(path);
      if (url && !cancelled) setMediaUrls((prev) => ({ ...prev, [path]: url }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedKey]);

  const withMedia = (r) =>
    r && { ...r, audioUrl: mediaUrls[r.audioPath] || null, photoUrl: mediaUrls[r.photoPath] || null };

  // --- Rôle ------------------------------------------------------------------
  const defaultScreenFor = (role) => {
    if (role === 'admin') return 'admin1';
    if (role === 'repairman') return myRepairmanProfile ? 'screen7' : 'screen6';
    return clientProfile ? 'screen2' : 'screen1';
  };

  const chooseRole = (role) => {
    setCurrentRole(role);
    // Sans session, l'écran de connexion s'affiche ; on arrivera ensuite sur le bon écran
    if (session) setActiveScreen(defaultScreenFor(role));
  };

  // Une fois connecté et les données chargées : aller droit au bon écran
  const routedRef = useRef(false);
  useEffect(() => {
    if (!dataLoaded) {
      routedRef.current = false;
      return;
    }
    if (routedRef.current) return;
    routedRef.current = true;
    if (currentRole && activeScreen === 'welcome') setActiveScreen(defaultScreenFor(currentRole));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded]);

  const resetRole = () => {
    setCurrentRole(null);
    setActiveScreen('welcome');
  };

  // --- Authentification ------------------------------------------------------
  const signUp = async (phone, password) => {
    setBusy(true);
    try {
      await api.signUp(phone, password);
      return true;
    } catch (e) {
      fail(e);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const signIn = async (phone, password) => {
    setBusy(true);
    try {
      await api.signIn(phone, password);
      return true;
    } catch (e) {
      fail(e);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await api.signOut();
    setCurrentRole(null);
    setDismissed([]);
    setActiveScreen('welcome');
  };

  // --- Profils ---------------------------------------------------------------
  const registerClient = async (profile) => {
    setBusy(true);
    try {
      const res = await api.registerClient(profile);
      setClientProfile(res.client);
      setMyRepairmanProfile(res.repairman);
      await refresh();
      showNotification('Votre profil est enregistré.', 'success');
      setActiveScreen('screen2');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const saveRepairmanProfile = async (p) => {
    setBusy(true);
    try {
      const res = await api.registerRepairman(p);
      setClientProfile(res.client);
      setMyRepairmanProfile(res.repairman);
      await refresh();
      showNotification(
        res.repairman?.isVerified
          ? 'Profil enregistré. Vous êtes visible par les clients.'
          : 'Profil enregistré. Il sera visible après vérification par notre équipe.',
        'success'
      );
      setActiveScreen('screen7');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const toggleRepairmanAvailability = async () => {
    if (!myRepairmanProfile) return;
    const next = !myRepairmanProfile.isActive;
    setMyRepairmanProfile({ ...myRepairmanProfile, isActive: next }); // réponse immédiate à l'écran
    try {
      const res = await api.setAvailability(next);
      setMyRepairmanProfile(res.repairman);
      showNotification(
        next ? 'Vous êtes visible pour les clients.' : "Disponibilité coupée. Vous n'apparaissez plus dans les recherches.",
        next ? 'success' : 'info'
      );
    } catch (e) {
      setMyRepairmanProfile({ ...myRepairmanProfile, isActive: !next });
      fail(e);
    }
  };

  // --- Client : demandes -----------------------------------------------------
  const handleSelectTrade = (tradeId) => {
    setSelectedTrade(tradeId);
    setActiveScreen('screen3');
  };

  const handleSelectRepairman = (rep) => {
    setSelectedRepairman(rep);
    setActiveScreen('screen4');
  };

  const submitRequest = async ({ writtenDescription, audioBlob, audioMime, audioDuration, photoFile, timing, address }) => {
    if (!clientProfile || !selectedRepairman || !userId) return;
    setBusy(true);
    try {
      const id = crypto.randomUUID();
      let audioPath = null;
      let photoPath = null;
      if (audioBlob) {
        audioPath = `${userId}/${id}/audio.${audioExtension(audioMime)}`;
        await api.uploadMedia(audioPath, audioBlob, (audioMime || 'audio/webm').split(';')[0]);
      }
      if (photoFile) {
        const small = await compressImage(photoFile);
        photoPath = `${userId}/${id}/photo.jpg`;
        await api.uploadMedia(photoPath, small, 'image/jpeg');
      }
      await api.createRequest({
        id,
        repairmanId: selectedRepairman.id,
        trade: selectedTrade,
        timing,
        description: writtenDescription,
        audioPath,
        audioDuration,
        audioMime: audioMime ? audioMime.split(';')[0] : null,
        photoPath,
        address: address || clientProfile.addressLandmark,
        quarter: clientProfile.quarter
      });
      await refresh();
      showNotification(`Demande envoyée à ${selectedRepairman.name}.`, 'success');
      setActiveScreen('screen5');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action, successMsg, type = 'success') => {
    try {
      await action();
      await refresh();
      if (successMsg) showNotification(successMsg, type);
    } catch (e) {
      fail(e);
      refresh();
    }
  };

  const cancelRequest = () => runAction(() => api.cancelRequest(activeRequest.id), 'Demande annulée.', 'info');
  const acceptRequest = () =>
    runAction(() => api.respondRequest(incomingRequest.id, 'accept'), 'Demande acceptée. Les coordonnées du client sont débloquées.');
  const rejectRequest = () => runAction(() => api.respondRequest(incomingRequest.id, 'reject'), 'Demande refusée.', 'warning');
  const completeRequest = () => runAction(() => api.completeRequest(incomingRequest.id), 'Intervention terminée.');

  // Transfert en un clic vers un autre artisan (garde description, vocal et photo)
  const reboundRequest = async (newRepairman) => {
    if (!activeRequest) return;
    setBusy(true);
    try {
      await api.createRequest({
        id: crypto.randomUUID(),
        repairmanId: newRepairman.id,
        trade: activeRequest.tradeId,
        timing: 'asap',
        description: activeRequest.writtenDescription,
        audioPath: activeRequest.audioPath,
        audioDuration: activeRequest.audioDuration,
        audioMime: null,
        photoPath: activeRequest.photoPath,
        address: activeRequest.clientAddress,
        quarter: activeRequest.clientQuarter,
        reboundFrom: activeRequest.id
      });
      setSelectedRepairman(newRepairman);
      await refresh();
      showNotification(`Demande transférée à ${newRepairman.name}.`, 'success');
      setActiveScreen('screen5');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const clearFinishedRequest = () => {
    if (activeRequest) setDismissed((prev) => [...prev, activeRequest.id]);
  };

  return (
    <AppContext.Provider
      value={{
        isConfigured,
        authLoading,
        dataLoaded,
        session,
        busy,
        activeScreen,
        setActiveScreen,
        currentRole,
        isAdmin,
        chooseRole,
        resetRole,
        signUp,
        signIn,
        signOut,
        clientProfile,
        registerClient,
        myRepairmanProfile,
        activeRepairmanId: myRepairmanProfile?.id || null,
        saveRepairmanProfile,
        toggleRepairmanAvailability,
        repairmen,
        selectedTrade,
        handleSelectTrade,
        selectedRepairman,
        handleSelectRepairman,
        activeRequest: withMedia(activeRequest),
        incomingRequest: withMedia(incomingRequest),
        repairmanHistory,
        submitRequest,
        cancelRequest,
        acceptRequest,
        rejectRequest,
        completeRequest,
        reboundRequest,
        clearFinishedRequest,
        notification,
        showNotification,
        TRADES
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp doit être utilisé dans un AppProvider');
  return context;
}
