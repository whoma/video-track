import { useEffect, useRef, useState, type JSX } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import type { DetectionStats } from '../hooks/useDetector';
import { getColor } from '../utils/colors';
import './StatsChart.css';

interface DetectionRecord {
  class: string;
  count: number;
}

interface FpsPoint {
  t: number;
  fps: number;
}

interface Props {
  stats: DetectionStats | null;
  isActive: boolean;
}

export default function StatsChart({ stats, isActive }: Props): JSX.Element | null {
  const [classData, setClassData] = useState<DetectionRecord[]>([]);
  const [fpsData, setFpsData] = useState<FpsPoint[]>([]);
  const counterRef = useRef<Record<string, number>>({});
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      setClassData([]);
      setFpsData([]);
      counterRef.current = {};
      startTimeRef.current = 0;
    } else {
      startTimeRef.current = Date.now();
    }
  }, [isActive]);

  useEffect(() => {
    if (stats) {
      const ms = Number(stats.ms);
      const fps = ms > 0 ? Math.round(1000 / ms) : 0;
      const t = Math.round((Date.now() - startTimeRef.current) / 1000);
      setFpsData(prev => [...prev.slice(-59), { t, fps }]);
    }
  }, [stats]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      const entries = Object.entries(counterRef.current)
        .map(([cls, count]) => ({ class: cls, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setClassData(entries);
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    const handler = (e: Event): void => {
      const detail = (e as CustomEvent<string[]>).detail;
      for (const cls of detail) {
        counterRef.current[cls] = (counterRef.current[cls] || 0) + 1;
      }
    };
    window.addEventListener('detection-classes', handler);
    return () => window.removeEventListener('detection-classes', handler);
  }, []);

  if (!isActive) return null;

  const currentFps = fpsData.length > 0 ? fpsData[fpsData.length - 1].fps : 0;
  const avgFps = fpsData.length > 0
    ? Math.round(fpsData.reduce((a, b) => a + b.fps, 0) / fpsData.length)
    : 0;
  const inferMs = stats?.ms ?? '-';

  return (
    <div className="stats-chart">
      <div className="chart-header">
        <h3>检测统计</h3>
        <div className="stats-badges">
          <span className="fps-badge">FPS: {currentFps}</span>
          <span className="fps-badge avg">平均: {avgFps}</span>
          <span className="fps-badge ms">{inferMs}ms</span>
        </div>
      </div>

      {fpsData.length > 2 && (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={fpsData} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="t" stroke="#555" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}s`} />
              <YAxis stroke="#555" tick={{ fontSize: 10 }} width={30} />
              <Tooltip
                contentStyle={{ background: '#222', border: '1px solid #444', borderRadius: 8, fontSize: 12 }}
                labelFormatter={(v) => `${v}s`}
              />
              <Line type="monotone" dataKey="fps" stroke="#4ecca3" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {classData.length > 0 && (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={Math.min(200, classData.length * 28 + 30)}>
            <BarChart data={classData} layout="vertical" margin={{ left: 60, right: 20 }}>
              <XAxis type="number" stroke="#555" />
              <YAxis type="category" dataKey="class" stroke="#888" width={55} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#222', border: '1px solid #444', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {classData.map((entry) => (
                  <Cell key={entry.class} fill={getColor(entry.class)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
