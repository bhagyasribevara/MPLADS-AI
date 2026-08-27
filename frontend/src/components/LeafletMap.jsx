import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import { analyticsAPI } from '../services/api';
import RiskBadge from './RiskBadge';
import { MapPin, IndianRupee, ArrowRight, ShieldAlert } from 'lucide-react';

const formatINR = (amount) => {
  if (!amount) return '₹0';
  const val = parseFloat(amount);
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

// Component to dynamically re-center map if center coordinates change
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 6);
    }
  }, [center, zoom, map]);
  return null;
};

const LeafletMap = ({ 
  projects = null, 
  center = [20.5937, 78.9629], // Default Center of India
  zoom = 5,
  height = '500px',
  onSelectProject = null,
  filterFlaggedOnly = false
}) => {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(!projects);

  useEffect(() => {
    if (projects && Array.isArray(projects)) {
      // Map project objects to GeoJSON-like features
      const mapped = projects
        .filter((p) => p.latitude && p.longitude)
        .map((p) => ({
          coordinates: [parseFloat(p.latitude), parseFloat(p.longitude)],
          properties: p,
        }));
      setFeatures(mapped);
      setLoading(false);
    } else {
      // Fetch GeoJSON from backend
      setLoading(true);
      analyticsAPI
        .getGeoJSON()
        .then((res) => {
          if (res.data && res.data.features) {
            const parsed = res.data.features.map((f) => ({
              coordinates: [f.geometry.coordinates[1], f.geometry.coordinates[0]], // [lat, lng]
              properties: f.properties,
            }));
            setFeatures(parsed);
          }
        })
        .catch((err) => console.error('[Map Error] Failed to load GeoJSON:', err))
        .finally(() => setLoading(false));
    }
  }, [projects]);

  const displayedFeatures = filterFlaggedOnly 
    ? features.filter(f => f.properties.is_flagged || f.properties.risk_score >= 0.70)
    : features;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 z-20 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center">
          <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gov-600 animate-ping" />
            <span>Loading 520+ Geotagged MPLADS Works...</span>
          </div>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute top-3 right-3 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-2 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5 pointer-events-auto">
        <p className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[9px]">
          GIS Vigilance Pins
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-sm shadow-red-500 animate-pulse" />
          <span className="text-slate-600 dark:text-slate-300">Flagged Anomaly / High Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
          <span className="text-slate-600 dark:text-slate-300">Moderate Variance (35-70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
          <span className="text-slate-600 dark:text-slate-300">Healthy Verified Civil Work</span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <MapUpdater center={center} zoom={zoom} />

        {/* Standard OpenStreetMap Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Project Markers */}
        {displayedFeatures.map((item, idx) => {
          const p = item.properties;
          const isHighRisk = p.is_flagged || p.risk_score >= 0.70;
          const isModRisk = p.risk_score >= 0.35 && p.risk_score < 0.70;

          const markerColor = isHighRisk
            ? '#dc2626' // Red
            : isModRisk
            ? '#f59e0b' // Amber
            : '#10b981'; // Emerald

          return (
            <CircleMarker
              key={p.id || idx}
              center={item.coordinates}
              radius={isHighRisk ? 7 : 5}
              pathOptions={{
                fillColor: markerColor,
                fillOpacity: 0.85,
                color: '#ffffff',
                weight: 1.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
                <span className="text-xs font-semibold">{p.title?.slice(0, 40)}...</span>
              </Tooltip>

              <Popup>
                <div className="w-64 p-1 text-slate-900 dark:text-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {p.project_code}
                    </span>
                    <RiskBadge riskScore={p.risk_score} isFlagged={p.is_flagged} />
                  </div>

                  <h4 className="text-xs font-bold leading-tight mb-2 line-clamp-2">
                    {p.title}
                  </h4>

                  <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 mb-2.5">
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-200 truncate max-w-[120px]">
                        {p.work_category}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sanctioned:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-200">
                        {formatINR(p.sanction_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Disbursed:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-200">
                        {formatINR(p.disbursed_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Physical Progress:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {p.physical_progress_pct || 0}%
                      </span>
                    </div>
                  </div>

                  {onSelectProject && (
                    <button
                      onClick={() => onSelectProject(p)}
                      className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-gov-600 hover:bg-gov-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <span>Open Full Audit Dossier</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;
