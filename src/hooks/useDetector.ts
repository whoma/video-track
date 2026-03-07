import { useState, useRef, useCallback, useEffect } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as blazeface from '@tensorflow-models/blazeface';
import * as posenet from '@tensorflow-models/posenet';
import '@tensorflow/tfjs';
import type { Detection, FaceDetection, Pose } from '../utils/drawDetections';

export type ModelType = 'coco-ssd' | 'blazeface' | 'posenet';

export interface DetectionStats {
  count: number;
  ms: string;
  model: ModelType;
}

export type DrawFn = (predictions: Detection[]) => void;
export type DrawFaceFn = (faces: FaceDetection[]) => void;
export type DrawPoseFn = (poses: Pose[]) => void;

export interface DrawCallbacks {
  drawDetections: DrawFn;
  drawFaces: DrawFaceFn;
  drawPoses: DrawPoseFn;
}

export function useDetector() {
  const modelsRef = useRef<{
    cocoSsd?: cocoSsd.ObjectDetection;
    blazeface?: blazeface.BlazeFaceModel;
    posenet?: posenet.PoseNet;
  }>({});

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DetectionStats | null>(null);
  const [activeModel, setActiveModel] = useState<ModelType>('coco-ssd');
  const rafRef = useRef<number | null>(null);
  const detectingRef = useRef(false);
  const activeModelRef = useRef<ModelType>('coco-ssd');

  const loadModel = useCallback(async (type: ModelType) => {
    setLoading(true);
    activeModelRef.current = type;
    setActiveModel(type);

    if (type === 'coco-ssd' && !modelsRef.current.cocoSsd) {
      modelsRef.current.cocoSsd = await cocoSsd.load();
    } else if (type === 'blazeface' && !modelsRef.current.blazeface) {
      modelsRef.current.blazeface = await blazeface.load();
    } else if (type === 'posenet' && !modelsRef.current.posenet) {
      modelsRef.current.posenet = await posenet.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
      });
    }

    setLoading(false);
  }, []);

  const startDetection = useCallback((videoEl: HTMLVideoElement, callbacks: DrawCallbacks) => {
    detectingRef.current = true;

    const loop = async () => {
      if (!detectingRef.current || videoEl.paused || videoEl.ended) return;

      const model = activeModelRef.current;
      const t0 = performance.now();
      let count = 0;

      if (model === 'coco-ssd' && modelsRef.current.cocoSsd) {
        const predictions = await modelsRef.current.cocoSsd.detect(videoEl);
        callbacks.drawDetections(predictions as Detection[]);
        count = predictions.length;
      } else if (model === 'blazeface' && modelsRef.current.blazeface) {
        const faces = await modelsRef.current.blazeface.estimateFaces(videoEl, false);
        callbacks.drawFaces(faces as unknown as FaceDetection[]);
        count = faces.length;
      } else if (model === 'posenet' && modelsRef.current.posenet) {
        const poses = await modelsRef.current.posenet.estimateMultiplePoses(videoEl, {
          maxDetections: 5,
          scoreThreshold: 0.3,
          nmsRadius: 20,
        });
        callbacks.drawPoses(poses as Pose[]);
        count = poses.length;
      }

      const ms = (performance.now() - t0).toFixed(0);
      setStats({ count, ms, model });

      rafRef.current = requestAnimationFrame(loop);
    };

    loop();
  }, []);

  const switchModel = useCallback(async (type: ModelType) => {
    const wasDetecting = detectingRef.current;
    if (wasDetecting) {
      detectingRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
    await loadModel(type);
  }, [loadModel]);

  const stopDetection = useCallback(() => {
    detectingRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setStats(null);
  }, []);

  useEffect(() => {
    return () => {
      detectingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { loading, stats, activeModel, loadModel, switchModel, startDetection, stopDetection };
}
