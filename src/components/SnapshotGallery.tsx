import './SnapshotGallery.css';

interface Props {
  snapshots: string[];
}

export default function SnapshotGallery({ snapshots }: Props) {
  if (snapshots.length === 0) return null;

  return (
    <div className="gallery">
      <h3 className="gallery-title">截图记录</h3>
      <div className="gallery-grid">
        {snapshots.map((src, i) => (
          <img key={i} src={src} alt={`截图 ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}
