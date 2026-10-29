import React, { useEffect, useRef, useState, Component } from 'react';
import L from 'leaflet';
import { Navigation, ExternalLink, Compass, MapPin } from 'lucide-react';
import { QUARTER_COORDINATES } from '../data/referentiel';

// Si la carte ne peut pas s'afficher (hors ligne, tuiles bloquées), l'écran reste utilisable
class MapErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return <MapFallback {...this.props} />;
    return this.props.children;
  }
}

function MapFallback({ clientQuarter, clientAddress }) {
  const coords = QUARTER_COORDINATES[clientQuarter];
  const url = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clientQuarter + ' Dakar')}`;
  return (
    <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl mb-3">
      <p className="font-bold flex items-center gap-2 text-orange-900">
        <MapPin className="w-5 h-5 text-orange-600" />
        {clientQuarter || 'Dakar'}
      </p>
      <p className="text-sm text-slate-600 mt-1">{clientAddress}</p>
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex mt-3 items-center gap-2 text-sm font-bold text-orange-700 underline">
        <ExternalLink className="w-4 h-4" /> Ouvrir dans Google Maps
      </a>
    </div>
  );
}

function InnerTrackingMap({ clientQuarter = 'Médina', clientAddress = '' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [failed, setFailed] = useState(false);

  const coords = QUARTER_COORDINATES[clientQuarter] || QUARTER_COORDINATES['Médina'];
  const center = [coords.lat, coords.lng];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let resizeTimer;
    try {
      const map = L.map(container, { center, zoom: 15, zoomControl: false, attributionControl: true });
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;background:#ea580c;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 6px rgba(234,88,12,.3)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      L.marker(center, { icon, title: clientQuarter }).addTo(map);
      resizeTimer = setTimeout(() => mapRef.current && mapRef.current.invalidateSize(false), 200);
    } catch (err) {
      console.warn("Échec d'initialisation de la carte :", err);
      setFailed(true);
    }
    return () => {
      clearTimeout(resizeTimer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientQuarter]);

  if (failed) return <MapFallback clientQuarter={clientQuarter} clientAddress={clientAddress} />;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-3">
      <div className="p-3 bg-slate-900 text-white flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center shrink-0">
          <Compass className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold">Lieu d'intervention</h3>
          <p className="text-xs text-slate-300 truncate">{coords.landmark || clientQuarter}</p>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-64 md:h-80 bg-slate-100" role="img" aria-label={`Carte du quartier ${clientQuarter}`} />

      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-600 min-w-0 truncate">
          <span className="font-semibold text-slate-800">{clientQuarter}</span>
          {clientAddress ? ` — ${clientAddress}` : ''}
        </p>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 min-h-[44px] px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition"
        >
          <Navigation className="w-4 h-4" />
          Itinéraire
        </a>
      </div>
    </div>
  );
}

export default function TrackingMap(props) {
  return (
    <MapErrorBoundary {...props}>
      <InnerTrackingMap {...props} />
    </MapErrorBoundary>
  );
}
