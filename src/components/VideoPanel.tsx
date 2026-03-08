import { useRef, useCallback, useEffect, useState, type RefObject, type JSX } from 'react';
import { drawDetections, drawFaces, drawPoses, drawHands, drawFaceMesh, drawSegmentation } from '../utils/drawDetections';
import type { Detection, FaceDetection, Pose, Hand, Face } from '../utils/drawDetections';
import type { DrawCallbacks } from '../hooks/useDetector';
import './VideoPanel.css';

interface CanvasContext {
  ctx: CanvasRenderingContext2D;
  vw: number;
  vh: number;
  cw: number;
  ch: number;
}

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  loading: boolean;
  onVideoReady: (callbacks: DrawCallbacks) => void;
}

export default function VideoPanel({ videoRef, isActive, loading, onVideoReady }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [expanded, setExpanded] = useState(false);

  const makeCallbacks = useCallback((): DrawCallbacks => {
    const getCtx = (): CanvasContext | null => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return null;

      const rect = video.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      return {
        ctx,
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
      drawHands: (hands: Hand[]) => {
        const info = getCtx();
        if (info) drawHands(info.ctx, hands, info.vw, info.vh, info.cw, info.ch);
      },
      drawFaceMesh: (faces: Face[]) => {
        const info = getCtx();
        if (info) drawFaceMesh(info.ctx, faces, info.vw, info.vh, info.cw, info.ch);
      },
      drawSegmentation: (mask: ImageData) => {
        const info = getCtx();
        if (info) drawSegmentation(info.ctx, mask, info.cw, info.ch);
      },
    };
  }, [videoRef]);

  useEffect(() => {
    if (!isActive && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [isActive]);

  const handleLoadedData = (): void => {
    onVideoReady(makeCallbacks());
  };

  return (
    <div className={`video-panel${expanded ? ' expanded' : ''}`}>
      <video ref={videoRef} autoPlay playsInline onLoadedData={handleLoadedData} />
      <canvas ref={canvasRef} className="overlay" />
      {loading && <div className="loading-overlay"><div className="loading-spinner" />模型加载中...</div>}
      {!isActive && !loading && <div className="placeholder">点击下方按钮开启摄像头或上传视频</div>}
      {isActive && (
        <button className="expand-btn" onClick={() => setExpanded(!expanded)} title={expanded ? '还原' : '放大'}>
          {expanded ? '−' : '+'}
        </button>
      )}
    </div>
  );
}
