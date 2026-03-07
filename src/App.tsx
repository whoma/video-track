import { useState, useCallback, useRef } from 'react';
import VideoPanel from './components/VideoPanel';
import Controls from './components/Controls';
import ModelSelector from './components/ModelSelector';
import SourceSelector from './components/SourceSelector';
import StatusBar from './components/StatusBar';
import StatsChart from './components/StatsChart';
import SnapshotGallery from './components/SnapshotGallery';
import { useCamera } from './hooks/useCamera';
import { useDetector, type DrawCallbacks, type ModelType } from './hooks/useDetector';
import './App.css';

export default function App() {
  const { videoRef, isActive, cameras, activeCameraId, start, loadFile, stop, switchCamera } = useCamera();
  const { loading, stats, activeModel, loadModel, switchModel, startDetection, stopDetection } = useDetector();
  const [snapshots, setSnapshots] = useState<string[]>([]);
  const callbacksRef = useRef<DrawCallbacks | null>(null);

  const beginDetection = useCallback(async (callbacks: DrawCallbacks, model: ModelType) => {
    callbacksRef.current = callbacks;

    // Dispatch detection class events for the stats chart
    const origDraw = callbacks.drawDetections;
    callbacks.drawDetections = (predictions) => {
      origDraw(predictions);
      const classes = predictions.map((p) => p.class);
      window.dispatchEvent(new CustomEvent('detection-classes', { detail: classes }));
    };

    await loadModel(model);
    startDetection(videoRef.current!, callbacks);
  }, [loadModel, startDetection, videoRef]);

  const handleStart = useCallback(async () => {
    try {
      await start();
    } catch (err) {
      alert('无法访问摄像头: ' + (err as Error).message);
    }
  }, [start]);

  const handleVideoReady = useCallback(
    (callbacks: DrawCallbacks) => {
      beginDetection(callbacks, activeModel);
    },
    [beginDetection, activeModel]
  );

  const handleStop = useCallback(() => {
    stopDetection();
    stop();
    callbacksRef.current = null;
  }, [stopDetection, stop]);

  const handleModelSwitch = useCallback(async (model: ModelType) => {
    await switchModel(model);
    if (callbacksRef.current && videoRef.current) {
      startDetection(videoRef.current, callbacksRef.current);
    }
  }, [switchModel, startDetection, videoRef]);

  const handleUploadFile = useCallback((file: File) => {
    stopDetection();
    loadFile(file);
  }, [stopDetection, loadFile]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    const overlayCanvas = video.parentElement?.querySelector('canvas');
    if (overlayCanvas) {
      ctx.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height);
    }

    setSnapshots((prev) => [canvas.toDataURL('image/png'), ...prev]);
  }, [videoRef]);

  return (
    <div className="app">
      <header className="header">
        <h1>视频采集 - 实时物体识别</h1>
        <p className="subtitle">基于 TensorFlow.js 的浏览器端实时检测 | 支持多模型 · 多视频源</p>
      </header>

      <VideoPanel
        videoRef={videoRef}
        isActive={isActive}
        loading={loading}
        onVideoReady={handleVideoReady}
      />

      <Controls
        isActive={isActive}
        onStart={handleStart}
        onStop={handleStop}
        onCapture={handleCapture}
      />

      <ModelSelector
        activeModel={activeModel}
        loading={loading}
        onSwitch={handleModelSwitch}
      />

      <SourceSelector
        cameras={cameras}
        activeCameraId={activeCameraId}
        isActive={isActive}
        onSwitchCamera={switchCamera}
        onUploadFile={handleUploadFile}
      />

      <StatusBar isActive={isActive} loading={loading} stats={stats} />

      <StatsChart stats={stats} isActive={isActive} />

      <SnapshotGallery snapshots={snapshots} />
    </div>
  );
}
