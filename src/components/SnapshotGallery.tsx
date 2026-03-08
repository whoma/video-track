import { useState, useCallback, type JSX } from 'react';
import './SnapshotGallery.css';

interface Props {
  snapshots: string[];
  onDelete: (index: number) => void;
  onClear: () => void;
}

export default function SnapshotGallery({ snapshots, onDelete, onClear }: Props): JSX.Element | null {
  const [viewIndex, setViewIndex] = useState<number | null>(null);

  const handleDownload = useCallback((src: string, index: number) => {
    const a = document.createElement('a');
    a.href = src;
    a.download = `snapshot-${index + 1}.png`;
    a.click();
  }, []);

  const handleCopy = useCallback(async (src: string) => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch { /* clipboard not supported */ }
  }, []);

  if (snapshots.length === 0) return null;

  return (
    <div className="gallery">
      <div className="gallery-header">
        <h3 className="gallery-title">截图记录 ({snapshots.length})</h3>
        <button className="gallery-clear" onClick={onClear}>清空全部</button>
      </div>
      <div className="gallery-grid">
        {snapshots.map((src, i) => (
          <div key={i} className="gallery-item">
            <img src={src} alt={`截图 ${i + 1}`} onClick={() => setViewIndex(i)} />
            <div className="gallery-actions">
              <button onClick={() => handleDownload(src, i)} title="下载">↓</button>
              <button onClick={() => handleCopy(src)} title="复制">⎘</button>
              <button onClick={() => onDelete(i)} title="删除" className="del">×</button>
            </div>
          </div>
        ))}
      </div>

      {viewIndex !== null && (
        <div className="lightbox" onClick={() => setViewIndex(null)}>
          <img src={snapshots[viewIndex]} alt="预览" onClick={(e) => e.stopPropagation()} />
          <div className="lightbox-nav">
            <button
              disabled={viewIndex <= 0}
              onClick={(e) => { e.stopPropagation(); setViewIndex(viewIndex - 1); }}
            >‹</button>
            <span>{viewIndex + 1} / {snapshots.length}</span>
            <button
              disabled={viewIndex >= snapshots.length - 1}
              onClick={(e) => { e.stopPropagation(); setViewIndex(viewIndex + 1); }}
            >›</button>
          </div>
          <button className="lightbox-close" onClick={() => setViewIndex(null)}>×</button>
        </div>
      )}
    </div>
  );
}
