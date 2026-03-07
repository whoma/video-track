import type { DetectionStats } from '../hooks/useDetector';
import './StatusBar.css';

const modelLabels: Record<string, string> = {
  'coco-ssd': '物体',
  'blazeface': '人脸',
  'posenet': '人体姿态',
};

interface Props {
  isActive: boolean;
  loading: boolean;
  stats: DetectionStats | null;
}

export default function StatusBar({ isActive, loading, stats }: Props) {
  let message = '点击"开启摄像头"或上传视频开始采集';
  if (loading) message = '正在加载识别模型，请稍候...';
  else if (isActive) message = '正在实时识别...';

  return (
    <div className="status-bar">
      <p className="status-text">{message}</p>
      {stats && (
        <p className="stats-text">
          检测到 <strong>{stats.count}</strong> 个{modelLabels[stats.model] || '目标'} | 推理耗时 <strong>{stats.ms}ms</strong>
        </p>
      )}
    </div>
  );
}
