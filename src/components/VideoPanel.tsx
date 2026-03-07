import { useRef, useCallback, useEffect, RefObject } from 'react';
import { drawDetections, drawFaces, drawPoses } from '../utils/drawDetections';
import type { Detection, FaceDetection, Pose } from '../utils/drawDetections';
import type { DrawCallbacks } from '../hooks/useDetector';
import './VideoPanel.css';

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  loading: boolean;
  onVideoReady: (callbacks: DrawCallbacks) => void;
}

export default function VideoPanel({ videoRef, isActive, loading, onVideoReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const makeCallbacks = useCallback((): DrawCallbacks => {
    const getCtx = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return null;

      const rect = video.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      return {
        ctx: canvas.getContext('2d')!,
        vw: video.videoWidth,
        vh: video.videoHeight,
        cw: rect.width,
        ch: rect.height,
      };
    };

    return {
      drawDetections: (predictions: Detection[]) => {
        const info = getCtx();
        if (info) drawDetections(info.ctx, predictions, info.vw, info.vh, info.cw, info.ch);
      },
      drawFaces: (faces: FaceDetection[]) => {
        const info = getCtx();
        if (info) drawFaces(info.ctx, faces, info.vw, info.vh, info.cw, info.ch);
      },
      drawPoses: (poses: Pose[]) => {
        const info = getCtx();
        if (info) drawPoses(info.ctx, poses, info.vw, info.vh, info.cw, info.ch);
      },
    };
  }, [videoRef]);

  useEffect(() => {
    if (!isActive && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [isActive]);

  const handleLoadedData = () => {
    onVideoReady(makeCallbacks());
  };

  return (
    <div className="video-panel">
      <video ref={videoRef} autoPlay playsInline onLoadedData={handleLoadedData} />
      <canvas ref={canvasRef} className="overlay" />
      {loading && <div className="loading-overlay">模型加载中...</div>}
      {!isActive && !loading && <div className="placeholder">点击下方按钮开启摄像头或上传视频</div>}
    </div>
  );
}
