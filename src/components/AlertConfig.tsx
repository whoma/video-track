import { useState, useEffect, useCallback, useRef, type JSX } from 'react';
import './AlertConfig.css';

interface Props {
  isActive: boolean;
  detectedClasses: string[];
}

// Singleton AudioContext to survive component remounts and avoid browser limits
let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioContext();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

export default function AlertConfig({ isActive, detectedClasses }: Props): JSX.Element | null {
  const [alertClasses, setAlertClasses] = useState<Set<string>>(new Set());
  const [alertMode, setAlertMode] = useState<'sound' | 'vibrate' | 'both'>('sound');
  const lastAlertTimeRef = useRef<Record<string, number>>({});
  // Use refs for values needed in the event listener to avoid stale closures
  const alertClassesRef = useRef<Set<string>>(new Set());
  const alertModeRef = useRef<'sound' | 'vibrate' | 'both'>('sound');

  useEffect(() => {
    if (!isActive) {
      setAlertClasses(new Set());
      alertClassesRef.current = new Set();
      lastAlertTimeRef.current = {};
    }
  }, [isActive]);

  const playBeep = useCallback(() => {
    try {
      const ctx = sharedAudioCtx;
      if (!ctx || ctx.state !== 'running') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch { /* audio failed, ignore */ }
  }, []);

  // Single stable event listener using refs — no dependency churn
  useEffect(() => {
    if (!isActive) return;

    const handler = (e: Event) => {
      const classes = (e as CustomEvent<string[]>).detail;
      const watched = alertClassesRef.current;
      if (watched.size === 0) return;

      for (const cls of classes) {
        if (watched.has(cls)) {
          const now = Date.now();
          const last = lastAlertTimeRef.current[cls] || 0;
          if (now - last < 2000) break;
          lastAlertTimeRef.current[cls] = now;

          const mode = alertModeRef.current;
          if (mode === 'sound' || mode === 'both') {
            playBeep();
          }
          if (mode === 'vibrate' || mode === 'both') {
            navigator.vibrate?.(200);
          }
          break;
        }
      }
    };
    window.addEventListener('detection-classes', handler);
    return () => window.removeEventListener('detection-classes', handler);
  }, [isActive, playBeep]);

  const toggleClass = useCallback((cls: string) => {
    // Initialize AudioContext on user gesture
    getAudioCtx();
    setAlertClasses(prev => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      alertClassesRef.current = next;
      return next;
    });
  }, []);

  const handleModeChange = useCallback((mode: 'sound' | 'vibrate' | 'both') => {
    getAudioCtx();
    setAlertMode(mode);
    alertModeRef.current = mode;
  }, []);

  if (!isActive || detectedClasses.length === 0) return null;

  return (
    <div className="alert-config">
      <div className="alert-header">
        <h3>识别告警</h3>
        <div className="alert-mode">
          <button
            className={`mode-btn ${alertMode === 'sound' ? 'active' : ''}`}
            onClick={() => handleModeChange('sound')}
          >
            声音
          </button>
          <button
            className={`mode-btn ${alertMode === 'vibrate' ? 'active' : ''}`}
            onClick={() => handleModeChange('vibrate')}
          >
            震动
          </button>
          <button
            className={`mode-btn ${alertMode === 'both' ? 'active' : ''}`}
            onClick={() => handleModeChange('both')}
          >
            声音+震动
          </button>
        </div>
      </div>
      <p className="alert-hint">选择检测到时触发告警的物体:</p>
      <div className="alert-tags">
        {detectedClasses.map(cls => (
          <button
            key={cls}
            className={`alert-tag ${alertClasses.has(cls) ? 'selected' : ''}`}
            onClick={() => toggleClass(cls)}
          >
            {cls}
          </button>
        ))}
      </div>
      {alertClasses.size > 0 && (
        <p className="alert-active-hint">
          已监控: {[...alertClasses].join(', ')}
        </p>
      )}
    </div>
  );
}
