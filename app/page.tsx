'use client';
import { useEffect, useRef, useState } from 'react';

type FreightType = 'sea' | 'air';

type Milestone = {
  event: string;
  location: string;
  time: string | null; // ISO 8601 UTC
  completed: boolean;
};

type Tracking = {
  type: FreightType;
  refNumber: string;
  carrier: string;
  equipmentType: string;
  origin: string;
  destination: string;
  vesselOrFlight: string;
  currentLocation: string;
  status: string;
  eta: string; // ISO 8601 UTC
  progress: number; // 0..1 along route
  milestones: Milestone[];
};

// Formats timestamps into viewer's local timezone with abbreviation
const formatTime = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(new Date(iso))
    : 'Pending';

// Validates 11-digit AWB numbers (Air Freight)
const normalizeAwb = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 11 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : null;
};

// Validates Container IDs / B/L numbers (Ocean Freight)
const normalizeContainer = (raw: string) => {
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned.length >= 7 ? cleaned : null;
};

export default function CargoTracker() {
  const [freightType, setFreightType] = useState<FreightType>('sea');
  const [inputVal, setInputVal] = useState('');
  const [trackingData, setTrackingData] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const executeTrack = (type: FreightType, raw: string) => {
    let normalizedRef: string | null = null;

    if (type === 'air') {
      normalizedRef = normalizeAwb(raw);
      if (!normalizedRef) {
        setError('Enter 11 digits: 3-digit prefix + 8-digit AWB (e.g. 176-12345678).');
        setTrackingData(null);
        return;
      }
    } else {
      normalizedRef = normalizeContainer(raw);
      if (!normalizedRef) {
        setError('Enter a valid Container No. or B/L (e.g. MSKU9284019).');
        setTrackingData(null);
        return;
      }
    }

    setError('');
    setInputVal(normalizedRef);
    setLoading(true);

    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      if (type === 'sea') {
        const isMaersk = normalizedRef.startsWith('MSK');
        setTrackingData({
          type: 'sea',
          refNumber: normalizedRef,
          carrier: isMaersk ? 'Maersk Line (Asia-Europe Loop)' : 'MSC (Mediterranean Shipping Co.)',
          equipmentType: '40ft High Cube Container (Dry)',
          origin: 'Ningbo Port (CNNGB)',
          destination: 'Port of Rotterdam (NLRTM)',
          vesselOrFlight: 'MSC ALEXANDRA / V.2409E',
          currentLocation: 'Transiting Suez Canal Corridor',
          status: 'VESSEL_EN_ROUTE',
          eta: '2026-11-18T14:00:00Z',
          progress: 0.55,
          milestones: [
            { event: 'Empty Container Picked Up', location: 'Ningbo Depot', time: '2026-10-10T09:00:00Z', completed: true },
            { event: 'Container Gate-In at Export Terminal', location: 'Ningbo Port (CNNGB)', time: '2026-10-12T14:30:00Z', completed: true },
            { event: 'Export Customs Cleared', location: 'Ningbo Terminal', time: '2026-10-13T10:15:00Z', completed: true },
            { event: 'Loaded on Vessel (ATD)', location: 'MSC ALEXANDRA', time: '2026-10-14T18:00:00Z', completed: true },
            { event: 'Transshipment Hub Departure', location: 'Port of Salalah', time: '2026-10-24T06:00:00Z', completed: true },
            { event: 'Vessel Arrival (ATA)', location: 'Port of Rotterdam (NLRTM)', time: null, completed: false },
            { event: 'Container Gate-Out / Consignee Delivery', location: 'Europe Regional Distribution Hub', time: null, completed: false },
          ]
        });
      } else {
        const isEmirates = normalizedRef.startsWith('176');
        setTrackingData({
          type: 'air',
          refNumber: normalizedRef,
          carrier: isEmirates ? 'Emirates SkyCargo (DXB Hub)' : 'Lufthansa Cargo (FRA Hub)',
          equipmentType: 'Maindeck Air Pallet (ULD)',
          origin: isEmirates ? 'DXB (Dubai)' : 'FRA (Frankfurt)',
          destination: isEmirates ? 'LHR (London)' : 'NRT (Tokyo)',
          vesselOrFlight: isEmirates ? 'Flight EK007' : 'Flight LH8400',
          currentLocation: isEmirates ? 'Overflying European Airspace' : 'Approaching Tokyo Airspace',
          status: 'IN_FLIGHT',
          eta: '2026-11-03T18:45:00Z',
          progress: 0.65,
          milestones: [
            { event: 'Freight Received at Origin Terminal', location: isEmirates ? 'Dubai (DXB)' : 'Frankfurt (FRA)', time: '2026-10-30T08:00:00Z', completed: true },
            { event: 'Customs Export Clearance Passed', location: isEmirates ? 'Dubai (DXB)' : 'Frankfurt (FRA)', time: '2026-10-30T11:30:00Z', completed: true },
            { event: 'Flight Departed (ATD)', location: 'International Airspace', time: '2026-10-30T15:45:00Z', completed: true },
            { event: 'Flight Arrived / Unloading', location: isEmirates ? 'London (LHR)' : 'Tokyo (NRT)', time: null, completed: false },
            { event: 'Delivered to Final Consignee', location: 'Client Warehouse', time: null, completed: false },
          ]
        });
      }
      setLoading(false);
    }, 500);
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    executeTrack(freightType, inputVal);
  };

  const handleModeSwitch = (newType: FreightType) => {
    setFreightType(newType);
    setInputVal('');
    setError('');
    setTrackingData(null);
  };

  return (
    <main className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col items-center justify-start py-6 px-3 sm:py-10 sm:px-6 lg:px-8 selection:bg-amber-500 selection:text-slate-950">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-10">
        
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-xs uppercase tracking-widest text-amber-500 font-semibold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Global Supply Chain Tracking
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mt-3">Multi-Modal Logistics Engine</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track Ocean Containers & Express Air Freight across Asia & Europe
          </p>
        </div>

        {/* Sea vs Air Mode Selector Switch */}
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 mb-6 gap-1 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => handleModeSwitch('sea')}
            className={`flex-1 min-h-11 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
              freightType === 'sea' 
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🚢 Ocean Freight (Sea)
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('air')}
            className={`flex-1 min-h-11 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
              freightType === 'air' 
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ✈️ Air Freight (Air)
          </button>
        </div>

        {/* Presets */}
        <div className="mb-6 bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <span className="text-slate-400 font-medium">⚡ Quick test presets</span>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex gap-2">
            {freightType === 'sea' ? (
              <>
                <button
                  type="button"
                  onClick={() => executeTrack('sea', 'MSKU9284019')}
                  className="min-h-11 bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-2 rounded-lg font-mono transition cursor-pointer border border-slate-700"
                >
                  MSKU9284019 (Maersk)
                </button>
                <button
                  type="button"
                  onClick={() => executeTrack('sea', 'MEDU8819402')}
                  className="min-h-11 bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-2 rounded-lg font-mono transition cursor-pointer border border-slate-700"
                >
                  MEDU8819402 (MSC)
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => executeTrack('air', '176-88492011')}
                  className="min-h-11 bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-2 rounded-lg font-mono transition cursor-pointer border border-slate-700"
                >
                  176-88492011 (Emirates)
                </button>
                <button
                  type="button"
                  onClick={() => executeTrack('air', '020-44910293')}
                  className="min-h-11 bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-2 rounded-lg font-mono transition cursor-pointer border border-slate-700"
                >
                  020-44910293 (Lufthansa)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3" noValidate>
          <label htmlFor="refInput" className="sr-only">Tracking number</label>
          <input
            id="refInput"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder={freightType === 'sea' ? "Enter Container No. or B/L (e.g. MSKU9284019)" : "Enter 11-digit AWB (e.g. 176-12345678)"}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? 'input-error' : undefined}
            className="flex-1 min-h-12 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="min-h-12 bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-60 text-slate-950 font-semibold px-8 py-3 rounded-xl transition shadow-lg shadow-amber-500/10 cursor-pointer text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            {loading ? 'Searching...' : `Track ${freightType === 'sea' ? 'Container' : 'AWB'}`}
          </button>
        </form>

        {error && (
          <p id="input-error" role="alert" className="mt-3 text-sm text-red-400">{error}</p>
        )}

        {/* Results Area */}
        <div aria-live="polite">
          {trackingData && (
            <div className="mt-8 border-t border-slate-800 pt-6">

              {/* Info Grid */}
              <div className="bg-slate-950/70 rounded-xl p-4 sm:p-5 border border-slate-800/80 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400 block text-xs uppercase tracking-wider">{trackingData.type === 'sea' ? 'Shipping Line' : 'Airline Carrier'}</span>
                  <span className="font-medium text-slate-200 mt-0.5 block">{trackingData.carrier}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs uppercase tracking-wider">Estimated Arrival (ETA)</span>
                  <span className="font-medium text-amber-400 mt-0.5 block">{formatTime(trackingData.eta)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs uppercase tracking-wider">Origin → Destination</span>
                  <span className="font-medium text-slate-200 mt-0.5 block">{trackingData.origin} → {trackingData.destination}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs uppercase tracking-wider">{trackingData.type === 'sea' ? 'Vessel / Voyage' : 'Flight No.'}</span>
                  <span className="font-medium text-slate-200 mt-0.5 block">{trackingData.vesselOrFlight}</span>
                </div>
              </div>

              {/* Dynamic Route Visualizer (Ship vs Plane icon) */}
              <div className="bg-slate-950 rounded-xl p-4 sm:p-5 border border-slate-800 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    {trackingData.type === 'sea' ? '🚢 Live Maritime Route' : '✈️ Live Air Transit Route'}
                  </span>
                  <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 motion-safe:animate-pulse">
                    ● Live Tracking
                  </span>
                </div>

                <div className="relative h-16">
                  {/* Track line + Dynamic marker offset */}
                  <div className="absolute left-8 right-8 top-[9px] h-0.5 bg-slate-800">
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-amber-400/80"
                      style={{ width: `${trackingData.progress * 100}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30"
                      style={{ left: `${trackingData.progress * 100}%` }}
                      aria-label="Current shipment location"
                    >
                      {trackingData.type === 'sea' ? (
                        <span className="text-base">🚢</span>
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 rotate-90" fill="currentColor" aria-hidden="true">
                          <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Origin & Destination Labels */}
                  <div className="absolute left-0 top-0 w-16 flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 mt-2">{trackingData.origin.split(' ')[0]}</span>
                    <span className="text-[11px] text-slate-400">Origin</span>
                  </div>
                  <div className="absolute right-0 top-0 w-16 flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-slate-900 border-2 border-slate-600 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
                    </div>
                    <span className="text-xs font-bold text-slate-300 mt-2">{trackingData.destination.split(' ')[0]}</span>
                    <span className="text-[11px] text-slate-400">Destination</span>
                  </div>
                </div>

                <p className="text-center text-xs text-slate-300 mt-3">
                  <span className="text-amber-400 font-semibold">Current position:</span> {trackingData.currentLocation}
                </p>
              </div>

              {/* Milestone History */}
              <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Milestone History & Transit Time</h2>
              <ol className="space-y-5 pl-2">
                {trackingData.milestones.map((m, idx) => (
                  <li key={idx} className="flex items-start gap-4 relative">
                    {idx !== trackingData.milestones.length - 1 && (
                      <div className={`absolute left-2 top-4 w-0.5 h-full -ml-[1px] ${m.completed ? 'bg-amber-400/50' : 'bg-slate-800'}`} />
                    )}
                    <div className={`w-4 h-4 rounded-full mt-1 flex-shrink-0 z-10 ${m.completed ? 'bg-amber-400 ring-4 ring-amber-400/20' : 'bg-slate-800 border border-slate-700'}`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${m.completed ? 'text-slate-100' : 'text-slate-400'}`}>{m.event}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{m.location} • {formatTime(m.time)}</p>
                    </div>
                  </li>
                ))}
              </ol>

            </div>
          )}
        </div>

      </div>
    </main>
  );
}

