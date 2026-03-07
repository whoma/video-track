import { useState, useCallback, useRef, useEffect, type JSX } from 'react';
import VideoPanel from './components/VideoPanel';
import Controls from './components/Controls';
import ModelSelector from './components/ModelSelector';
import SourceSelector from './components/SourceSelector';
import StatusBar from './components/StatusBar';
import StatsChart from './components/StatsChart';
import SnapshotGallery from './components/SnapshotGallery';
import AlertConfig from './components/AlertConfig';
import { useCamera } from './hooks/useCamera';
import { useDetector, type DrawCallbacks, type ModelType } from './hooks/useDetector';
import { useRecorder } from './hooks/useRecorder';
import './App.css';

export default function App(): JSX.Element {
  const { videoRef, isActive, cameras, activeCameraId, start, loadFile, stop, switchCamera } = useCamera();
  const { loading, stats, activeModel, threshold, setThreshold, loadModel, switchModel, startDetection, stopDetection } = useDetector();
  const { recording, startRecording, stopRecording } = useRecorder();
  const [snapshots, setSnapshots] = useState<string[]>([]);
  const [detectedClasses, setDetectedClasses] = useState<string[]>([]);
  const callbacksRef = useRef<DrawCallbacks | null>(null);
  const seenClassesRef = useRef<Set<string>>(new Set());

  // Track detected classes from custom events
  useEffect(() => {
    if (!isActive) {
      seenClassesRef.current.clear();
      setDetectedClasses([]);
      return;
    }

    const handler = (e: Event) => {
      const classes = (e as CustomEvent<string[]>).detail;
      let changed = false;
      for (const cls of classes) {
        if (!seenClassesRef.current.has(cls)) {
          seenClassesRef.current.add(cls);
          changed = true;
        }
      }
      if (changed) {
        setDetectedClasses([...seenClassesRef.current]);
      }
    };
    window.addEventListener('detection-classes', handler);
    return () => window.removeEventListener('detection-classes', handler);
  }, [isActive]);

  const beginDetection = useCallback(async (callbacks: DrawCallbacks, model: ModelType) => {
    callbacksRef.current = callbacks;

    const origDraw = callbacks.drawDetections;
    callbacks.drawDetections = (predictions) => {
      origDraw(predictions);
      const classes = predictions.map((p) => p.class);
      window.dispatchEvent(new CustomEvent('detection-classes', { detail: classes }));
    };

    await loadModel(model);
    const video = videoRef.current;
    if (video) {
      startDetection(video, callbacks);
    }
  }, [loadModel, startDetection, videoRef]);

  const handleStart = useCallback(async () => {
    try {
      await start();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert('无法访问摄像头: ' + message);
    }
  }, [start]);

  const handleVideoReady = useCallback(
    (callbacks: DrawCallbacks) => {
      beginDetection(callbacks, activeModel);
    },
    [beginDetection, activeModel]
  );

  const handleStop = useCallback(() => {
    if (recording) stopRecording();
    stopDetection();
    stop();
    callbacksRef.current = null;
  }, [stopDetection, stop, recording, stopRecording]);

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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const overlayCanvas = video.parentElement?.querySelector('canvas');
    if (overlayCanvas) {
      ctx.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height);
    }

    setSnapshots((prev) => [canvas.toDataURL('image/png'), ...prev]);
  }, [videoRef]);

  const handleRecord = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const overlayCanvas = video.parentElement?.querySelector('canvas');
    if (!overlayCanvas) return;
    startRecording(video, overlayCanvas as HTMLCanvasElement);
  }, [videoRef, startRecording]);

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
        recording={recording}
        threshold={threshold}
        onStart={handleStart}
        onStop={handleStop}
        onCapture={handleCapture}
        onRecord={handleRecord}
        onStopRecord={stopRecording}
        onThresholdChange={setThreshold}
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

      <AlertConfig isActive={isActive} detectedClasses={detectedClasses} />

      <SnapshotGallery snapshots={snapshots} />
    </div>
  );
}
