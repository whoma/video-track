import type { JSX } from 'react';
import type { ModelType } from '../hooks/useDetector';
import './ModelSelector.css';

interface Props {
  activeModel: ModelType;
  loading: boolean;
  onSwitch: (model: ModelType) => void;
}

const models: { type: ModelType; label: string; desc: string }[] = [
  { type: 'coco-ssd', label: 'COCO-SSD', desc: '80类物体检测' },
  { type: 'blazeface', label: 'BlazeFace', desc: '人脸检测' },
  { type: 'posenet', label: 'PoseNet', desc: '人体姿态估计' },
  { type: 'hand-pose', label: 'HandPose', desc: '手势关键点' },
  { type: 'face-mesh', label: 'FaceMesh', desc: '478点面部网格' },
  { type: 'body-seg', label: 'BodySeg', desc: '人体分割' },
];

export default function ModelSelector({ activeModel, loading, onSwitch }: Props): JSX.Element {
  return (
    <div className="model-selector">
      <span className="model-label">识别模型:</span>
      <div className="model-buttons">
        {models.map((m) => (
          <button
            key={m.type}
            className={`model-btn ${activeModel === m.type ? 'active' : ''}`}
            disabled={loading}
            onClick={() => onSwitch(m.type)}
            title={m.desc}
          >
            {m.label}
            <span className="model-desc">{m.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
