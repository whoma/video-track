import type { JSX } from 'react';
import './Controls.css';

interface Props {
  isActive: boolean;
  recording: boolean;
  threshold: number;
  onStart: () => void;
  onStop: () => void;
  onCapture: () => void;
  onRecord: () => void;
  onStopRecord: () => void;
  onThresholdChange: (v: number) => void;
}

export default function Controls({
  isActive, recording, threshold,
  onStart, onStop, onCapture, onRecord, onStopRecord, onThresholdChange
}: Props): JSX.Element {
  return (
    <div className="controls">
      <div className="controls-row">
        <button className="btn btn-start" disabled={isActive} onClick={onStart}>
          开启摄像头
        </button>
        <button className="btn btn-stop" disabled={!isActive} onClick={onStop}>
          关闭摄像头
        </button>
        <button className="btn btn-capture" disabled={!isActive} onClick={onCapture}>
          截图 (含标注)
        </button>
        {!recording ? (
          <button className="btn btn-record" disabled={!isActive} onClick={onRecord}>
            录制视频
          </button>
        ) : (
          <button className="btn btn-record recording" onClick={onStopRecord}>
            停止录制
          </button>
        )}
      </div>
      <div className="threshold-row">
        <label className="threshold-label">
          置信度阈值: <strong>{(threshold * 100).toFixed(0)}%</strong>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={threshold * 100}
          onChange={(e) => onThresholdChange(Number(e.target.value) / 100)}
          className="threshold-slider"
        />
      </div>
    </div>
  );
}
