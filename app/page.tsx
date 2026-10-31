'use client';
import { useEffect, useRef, useState } from 'react';

type Milestone = {
  event: string;
  location: string;
  time: string | null; // ISO 8601 in UTC, null = pending
  completed: boolean;
};

type Tracking = {
  awbNumber: string;
  airline: string;
  origin: string;
  destination: string;
  currentLocation: string;
  status: string;
  eta: string; // ISO 8601 in UTC
  progress: number; // 0..1 along the route
  milestones: Milestone[];
};

// Show times in the viewer's own timezone (Dubai, London, Tokyo...) with the zone label.
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

// Accepts "176-88492011", "17688492011", "176 8849 2011" -> "176-88492011" or null
const normalizeAwb = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 11 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : null;
};

export default function AWBTracker() {
  const [awb, setAwb] = useState('');
  const [trackingData, setTrackingData] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending request if the component unmounts
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const executeTrack = (raw: string) => {
    const trackingNumber = normalizeAwb(raw);
    if (!trackingNumber) {
      setError('Enter 11 digits: a 3-digit airline prefix and 8-digit number (e.g. 176-12345678).');
      setTrackingData(null);
      return;
    }
    setError('');
    setAwb(trackingNumber);
    setLoading(true);

    // Cancel any earlier request so a slow one can't overwrite a newer result
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const isEmirates = trackingNumber.startsWith('176');
      setTrackingData({
        awbNumber: trackingNumber,
        airline: isEmirates ? 'Emirates SkyCargo (DXB Hub)' : 'Lufthansa Cargo (FRA Hub)',
        origin: isEmirates ? 'DXB (Dubai)' : 'FRA (Frankfurt)',
        destination: isEmirates ? 'LHR (London)' : 'NRT (Tokyo)',
        currentLocation: isEmirates ? 'Overflying European Airspace' : 'Approaching Destination Terminal',
        status: 'IN_TRANSIT',
        eta: '2026-11-03T18:45:00Z',
        progress: 0.6,
        milestones: [
          { event: 'Freight Received at Origin Terminal', location: isEmirates ? 'Dubai (DXB)' : 'Frankfurt (FRA)', time: '2026-10-30T08:00:00Z', completed: true },
          { event: 'Customs Export Clearance Passed', location: isEmirates ? 'Dubai (DXB)' : 'Frankfurt (FRA)', time: '2026-10-30T11:30:00Z', completed: true },
          { event: 'Flight Departed (ATD)', location: 'International Airspace', time: '2026-10-30T15:45:00Z', completed: true },
          { event: 'Flight Arrived / Unloading', location: isEmirates ? 'London (LHR)' : 'Tokyo (NRT)', time: null, completed: false },
          { event: 'Delivered to Final Consignee', location: 'Client Warehouse', time: null, completed: false },
        ],
      });
      setLoading(false);
    }, 500);
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    executeTrack(awb);
  };

  return (
    <main className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col items-center justify-start py-6 px-3 sm:py-10 sm:px-6 lg:px-8 selection:bg-amber-500 selection:text-slate-950">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-10">

        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-xs uppercase tracking-widest text-amber-500 font-semibold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Live Cargo Tracking Prototype
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mt-3">Air Cargo & Transit Engine</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track air freight across Asia & Europe
          </p>
        </div>

        {/* Demo presets: stacked full-width on phones, inline from sm up */}
        <div className="mb-6 bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <span className="text-slate-400 font-medium">⚡ Quick test presets</span>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex gap-2">
            <button
              type="button"
              onClick={() => executeTrack('176-88492011')}
              className="min-h-11 bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-2 rounded-lg font-mono transition cursor-pointer border border-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              176-88492011 (Emirates)
            </button>
            <button
              type="button"
              onClick={() => executeTrack('020-44910293')}
              className="min-h-11 bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-2 rounded-lg font-mono transition cursor-pointer border border-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              020-44910293 (Lufthansa)
            </button>
          </div>
        </div>

        {/* Search form */}
        <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3" noValidate>
          <label htmlFor="awb" className="sr-only">Air waybill number</label>
          <input
            id="awb"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="Enter 11-digit AWB (e.g. 176-12345678)"
            value={awb}
            onChange={(e) => setAwb(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? 'awb-error' : undefined}
            // text-base (16px) stops iOS Safari from zooming the page when the field is focused
            className="flex-1 min-h-12 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="min-h-12 bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-60 text-slate-950 font-semibold px-8 py-3 rounded-xl transition shadow-lg shadow-amber-500/10 cursor-pointer text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            {loading ? 'Searching...' : 'Track AWB'}
          </button>
        </form>

        {error && (
          <p id="awb-error" role="alert" className="mt-3 text-sm text-red-400">{error}</p>
        )}

        {/* Results (announced to screen readers when they appear) */}
        <div aria-live="polite">
          {trackingData && (
            <div className="mt-8 border-t border-slate-800 pt-6">

              {/* Info grid */}
              <div className="bg-slate-950/70 rounded-xl p-4 sm:p-5 border border-slate-800/80 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400 block text-xs uppercase tracking-wider">Airline Carrier</span>
                  <span className="font-medium text-slate-200 mt-0.5 block">{trackingData.airline}</span>
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
                  <span className="text-slate-400 block text-xs uppercase tracking-wider">Current Status</span>
                  <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-1">
                    {trackingData.status}
                  </span>
                </div>
              </div>

              {/* Route visualizer: plane sits at the real progress point, not a fixed spot */}
              <div className="bg-slate-950 rounded-xl p-4 sm:p-5 border border-slate-800 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Live Route Visualizer</span>
                  <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 motion-safe:animate-pulse">● Live Air Transit</span>
                </div>

                <div className="relative h-16">
                  {/* Track + progress, inset to the centre of each end marker (w-16 => 2rem) */}
                  <div className="absolute left-8 right-8 top-[9px] h-0.5 bg-slate-800">
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-amber-400/80"
                      style={{ width: `${trackingData.progress * 100}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30"
                      style={{ left: `${trackingData.progress * 100}%` }}
                      aria-label="Shipment position"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 rotate-90" fill="currentColor" aria-hidden="true">
                        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                      </svg>
                    </div>
                  </div>

                  {/* End markers */}
                  <div className="absolute left-0 top-0 w-16 flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 mt-2">{trackingData.origin.slice(0, 3)}</span>
                    <span className="text-[11px] text-slate-400">Origin</span>
                  </div>
                  <div className="absolute right-0 top-0 w-16 flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-slate-900 border-2 border-slate-600 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
                    </div>
                    <span className="text-xs font-bold text-slate-300 mt-2">{trackingData.destination.slice(0, 3)}</span>
                    <span className="text-[11px] text-slate-400">Destination</span>
                  </div>
                </div>

                {/* Full location text lives below the graphic so it never truncates on phones */}
                <p className="text-center text-xs text-slate-300 mt-3">
                  <span className="text-amber-400 font-semibold">En route:</span> {trackingData.currentLocation}
                </p>
              </div>

              {/* Timeline */}
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