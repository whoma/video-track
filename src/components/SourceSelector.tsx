import { useRef, type JSX } from 'react';
import './SourceSelector.css';

interface Props {
  cameras: MediaDeviceInfo[];
  activeCameraId: string;
  isActive: boolean;
  onSwitchCamera: (deviceId: string) => void;
  onUploadFile: (file: File) => void;
}

export default function SourceSelector({ cameras, activeCameraId, isActive, onSwitchCamera, onUploadFile }: Props): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
  };

  return (
    <div className="source-selector">
      {cameras.length > 1 && (
        <div className="camera-select">
          <label className="source-label">摄像头:</label>
          <select
            value={activeCameraId}
            onChange={(e) => onSwitchCamera(e.target.value)}
            disabled={!isActive}
          >
            {cameras.map((cam, i) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `摄像头 ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <button className="upload-btn" onClick={() => fileRef.current?.click()}>
        上传视频文件
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
