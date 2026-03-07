import { useState, useRef, useCallback } from 'react';

export interface UseRecorderReturn {
  recording: boolean;
  startRecording: (video: HTMLVideoElement, overlayCanvas: HTMLCanvasElement) => void;
  stopRecording: () => void;
}

export function useRecorder(): UseRecorderReturn {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const startRecording = useCallback((video: HTMLVideoElement, overlayCanvas: HTMLCanvasElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    compositeCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawFrame = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height);
      rafRef.current = requestAnimationFrame(drawFrame);
    };
    drawFrame();

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `detection-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      chunksRef.current = [];
    };

    recorder.start(1000);
    recorderRef.current = recorder;
    setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    compositeCanvasRef.current = null;
    setRecording(false);
  }, []);

  return { recording, startRecording, stopRecording };
}
