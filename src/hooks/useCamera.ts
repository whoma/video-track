import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';

export type VideoSourceType = 'camera' | 'file';

export interface UseCameraReturn {
  videoRef: RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  sourceType: VideoSourceType;
  cameras: MediaDeviceInfo[];
  activeCameraId: string;
  start: (deviceId?: string) => Promise<void>;
  loadFile: (file: File) => void;
  stop: () => void;
  switchCamera: (deviceId: string) => Promise<void>;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [sourceType, setSourceType] = useState<VideoSourceType>('camera');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');

  // Enumerate available cameras
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((devices) => {
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setCameras(videoDevices);
    });
  }, []);

  const start = useCallback(async (deviceId?: string) => {
    const constraints: MediaStreamConstraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: 1280, height: 720 }
        : { width: 1280, height: 720, facingMode: 'user' },
      audio: false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.loop = false;
    }
    setSourceType('camera');
    setIsActive(true);

    // Re-enumerate after permission granted
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === 'videoinput');
    setCameras(videoDevices);
    if (deviceId) setActiveCameraId(deviceId);
    else if (videoDevices.length > 0) setActiveCameraId(videoDevices[0].deviceId);
  }, []);

  const loadFile = useCallback((file: File) => {
    // Stop existing camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    const url = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.loop = true;
    }
    setSourceType('file');
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      if (videoRef.current.src && videoRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(videoRef.current.src);
      }
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute('src');
    }
    setIsActive(false);
  }, []);

  const switchCamera = useCallback(async (deviceId: string) => {
    // Stop current stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    await start(deviceId);
  }, [start]);

  return { videoRef, isActive, sourceType, cameras, activeCameraId, start, loadFile, stop, switchCamera };
}
