import './Controls.css';

interface Props {
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
  onCapture: () => void;
}

export default function Controls({ isActive, onStart, onStop, onCapture }: Props) {
  return (
    <div className="controls">
      <button className="btn btn-start" disabled={isActive} onClick={onStart}>
        开启摄像头
      </button>
      <button className="btn btn-stop" disabled={!isActive} onClick={onStop}>
        关闭摄像头
      </button>
      <button className="btn btn-capture" disabled={!isActive} onClick={onCapture}>
        截图 (含标注)
      </button>
    </div>
  );
}
