import { useEffect, useRef, useState, type JSX } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DetectionStats } from '../hooks/useDetector';
import { getColor } from '../utils/colors';
import './StatsChart.css';

interface DetectionRecord {
  class: string;
  count: number;
}

interface Props {
  stats: DetectionStats | null;
  isActive: boolean;
}

export default function StatsChart({ stats, isActive }: Props): JSX.Element | null {
  const [classData, setClassData] = useState<DetectionRecord[]>([]);
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);
  const counterRef = useRef<Record<string, number>>({});

  // Reset on stop
  useEffect(() => {
    if (!isActive) {
      setClassData([]);
      setFpsHistory([]);
      counterRef.current = {};
    }
  }, [isActive]);

  // Track FPS
  useEffect(() => {
    if (stats) {
      const fps = Math.round(1000 / Number(stats.ms));
      setFpsHistory((prev) => [...prev.slice(-29), fps]);
    }
  }, [stats]);

  // Listen to detection events via custom event (dispatched from draw functions)
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      // Build chart data from the global detection counter
      const entries = Object.entries(counterRef.current)
        .map(([cls, count]) => ({ class: cls, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setClassData(entries);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Expose counter update
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

  const avgFps = fpsHistory.length > 0
    ? Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length)
    : 0;

  return (
    <div className="stats-chart">
      <div className="chart-header">
        <h3>检测统计</h3>
        <span className="fps-badge">FPS: {avgFps}</span>
      </div>

      {classData.length > 0 && (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={200}>
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
