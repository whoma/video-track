import { useState, useEffect, useCallback, useRef, type JSX } from 'react';
import './AlertConfig.css';

interface Props {
  isActive: boolean;
  detectedClasses: string[];
}

export default function AlertConfig({ isActive, detectedClasses }: Props): JSX.Element | null {
  const [alertClasses, setAlertClasses] = useState<Set<string>>(new Set());
  const [alertMode, setAlertMode] = useState<'sound' | 'vibrate' | 'both'>('sound');
  const lastAlertTimeRef = useRef<Record<string, number>>({});
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Reset when stopped
  useEffect(() => {
    if (!isActive) {
      setAlertClasses(new Set());
      lastAlertTimeRef.current = {};
    }
  }, [isActive]);

  const playBeep = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
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
  }, []);

  const triggerAlert = useCallback((cls: string) => {
    const now = Date.now();
    const last = lastAlertTimeRef.current[cls] || 0;
    // Throttle: at most once per 2 seconds per class
    if (now - last < 2000) return;
    lastAlertTimeRef.current[cls] = now;

    if (alertMode === 'sound' || alertMode === 'both') {
      playBeep();
    }
    if (alertMode === 'vibrate' || alertMode === 'both') {
      navigator.vibrate?.(200);
    }
  }, [alertMode, playBeep]);

  // Listen for detection events and trigger alerts
  useEffect(() => {
    if (!isActive || alertClasses.size === 0) return;

    const handler = (e: Event) => {
      const classes = (e as CustomEvent<string[]>).detail;
      for (const cls of classes) {
        if (alertClasses.has(cls)) {
          triggerAlert(cls);
          break; // one alert per frame is enough
        }
      }
    };
    window.addEventListener('detection-classes', handler);
    return () => window.removeEventListener('detection-classes', handler);
  }, [isActive, alertClasses, triggerAlert]);

  const toggleClass = useCallback((cls: string) => {
    setAlertClasses(prev => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  }, []);

  if (!isActive || detectedClasses.length === 0) return null;

  return (
    <div className="alert-config">
      <div className="alert-header">
        <h3>识别告警</h3>
        <div className="alert-mode">
          <button
            className={`mode-btn ${alertMode === 'sound' ? 'active' : ''}`}
            onClick={() => setAlertMode('sound')}
          >
            声音
          </button>
          <button
            className={`mode-btn ${alertMode === 'vibrate' ? 'active' : ''}`}
            onClick={() => setAlertMode('vibrate')}
          >
            震动
          </button>
          <button
            className={`mode-btn ${alertMode === 'both' ? 'active' : ''}`}
            onClick={() => setAlertMode('both')}
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
