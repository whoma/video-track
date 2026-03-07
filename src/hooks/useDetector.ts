import { useState, useRef, useCallback, useEffect } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as blazeface from '@tensorflow-models/blazeface';
import type { NormalizedFace } from '@tensorflow-models/blazeface';
import * as posenet from '@tensorflow-models/posenet';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import '@tensorflow/tfjs';
import type { Detection, FaceDetection, Pose, Hand, Face } from '../utils/drawDetections';

export type ModelType = 'coco-ssd' | 'blazeface' | 'posenet' | 'hand-pose' | 'face-mesh' | 'body-seg';

export interface DetectionStats {
  count: number;
  ms: string;
  model: ModelType;
}

export type DrawFn = (predictions: Detection[]) => void;
export type DrawFaceFn = (faces: FaceDetection[]) => void;
export type DrawPoseFn = (poses: Pose[]) => void;
export type DrawHandFn = (hands: Hand[]) => void;
export type DrawFaceMeshFn = (faces: Face[]) => void;
export type DrawSegFn = (mask: ImageData) => void;

export interface DrawCallbacks {
  drawDetections: DrawFn;
  drawFaces: DrawFaceFn;
  drawPoses: DrawPoseFn;
  drawHands: DrawHandFn;
  drawFaceMesh: DrawFaceMeshFn;
  drawSegmentation: DrawSegFn;
}

function toFaceDetections(faces: NormalizedFace[]): FaceDetection[] {
  return faces.map((face): FaceDetection => ({
    topLeft: face.topLeft as [number, number],
    bottomRight: face.bottomRight as [number, number],
    landmarks: (face.landmarks ?? []) as number[][],
    probability: typeof face.probability === 'number'
      ? [face.probability]
      : Array.isArray(face.probability)
        ? face.probability as number[]
        : [0],
  }));
}

export interface UseDetectorReturn {
  loading: boolean;
  stats: DetectionStats | null;
  activeModel: ModelType;
  threshold: number;
  setThreshold: (v: number) => void;
  loadModel: (type: ModelType) => Promise<void>;
  switchModel: (type: ModelType) => Promise<void>;
  startDetection: (videoEl: HTMLVideoElement, callbacks: DrawCallbacks) => void;
  stopDetection: () => void;
}

export function useDetector(): UseDetectorReturn {
  const modelsRef = useRef<{
    cocoSsd?: cocoSsd.ObjectDetection;
    blazeface?: blazeface.BlazeFaceModel;
    posenet?: posenet.PoseNet;
    handPose?: handPoseDetection.HandDetector;
    faceMesh?: faceLandmarksDetection.FaceLandmarksDetector;
    bodySeg?: bodySegmentation.BodySegmenter;
  }>({});

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DetectionStats | null>(null);
  const [activeModel, setActiveModel] = useState<ModelType>('coco-ssd');
  const [threshold, setThreshold] = useState(0.5);
  const rafRef = useRef<number | null>(null);
  const activeModelRef = useRef<ModelType>('coco-ssd');
  const thresholdRef = useRef(0.5);
  // Generation counter to prevent stale async loops from continuing
  const generationRef = useRef(0);

  const updateThreshold = useCallback((v: number) => {
    setThreshold(v);
    thresholdRef.current = v;
  }, []);

  const cancelLoop = useCallback(() => {
    generationRef.current++;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const loadModel = useCallback(async (type: ModelType) => {
    setLoading(true);
    activeModelRef.current = type;
    setActiveModel(type);

    try {
      if (type === 'coco-ssd' && !modelsRef.current.cocoSsd) {
        modelsRef.current.cocoSsd = await cocoSsd.load();
      } else if (type === 'blazeface' && !modelsRef.current.blazeface) {
        modelsRef.current.blazeface = await blazeface.load();
      } else if (type === 'posenet' && !modelsRef.current.posenet) {
        modelsRef.current.posenet = await posenet.load({
          architecture: 'MobileNetV1',
          outputStride: 16,
          inputResolution: { width: 257, height: 200 },
          multiplier: 0.75,
        });
      } else if (type === 'hand-pose' && !modelsRef.current.handPose) {
        modelsRef.current.handPose = await handPoseDetection.createDetector(
          handPoseDetection.SupportedModels.MediaPipeHands,
          { runtime: 'tfjs', maxHands: 4 }
        );
      } else if (type === 'face-mesh' && !modelsRef.current.faceMesh) {
        modelsRef.current.faceMesh = await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          { runtime: 'tfjs', maxFaces: 4, refineLandmarks: true }
        );
      } else if (type === 'body-seg' && !modelsRef.current.bodySeg) {
        modelsRef.current.bodySeg = await bodySegmentation.createSegmenter(
          bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
          { runtime: 'tfjs', modelType: 'general' }
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const startDetection = useCallback((videoEl: HTMLVideoElement, callbacks: DrawCallbacks) => {
    // Increment generation so any in-flight old loop will bail out
    const gen = ++generationRef.current;

    const loop = async () => {
      // If generation has changed, this loop is stale — stop
      if (gen !== generationRef.current || videoEl.paused || videoEl.ended) return;

      const model = activeModelRef.current;
      const minScore = thresholdRef.current;
      const t0 = performance.now();
      let count = 0;

      const detectedLabels: string[] = [];

      try {
        if (model === 'coco-ssd' && modelsRef.current.cocoSsd) {
          const predictions = await modelsRef.current.cocoSsd.detect(videoEl);
          if (gen !== generationRef.current) return;
          const filtered = predictions.filter(p => p.score >= minScore);
          callbacks.drawDetections(filtered);
          count = filtered.length;
          for (const p of filtered) detectedLabels.push(p.class);
        } else if (model === 'blazeface' && modelsRef.current.blazeface) {
          const faces = await modelsRef.current.blazeface.estimateFaces(videoEl, false);
          if (gen !== generationRef.current) return;
          const converted = toFaceDetections(faces);
          const filtered = converted.filter(f => f.probability[0] >= minScore);
          callbacks.drawFaces(filtered);
          count = filtered.length;
          for (let i = 0; i < count; i++) detectedLabels.push('face');
        } else if (model === 'posenet' && modelsRef.current.posenet) {
          const poses = await modelsRef.current.posenet.estimateMultiplePoses(videoEl, {
            flipHorizontal: false,
            maxDetections: 5,
            scoreThreshold: minScore,
            nmsRadius: 20,
          });
          if (gen !== generationRef.current) return;
          callbacks.drawPoses(poses);
          count = poses.length;
          for (let i = 0; i < count; i++) detectedLabels.push('pose');
        } else if (model === 'hand-pose' && modelsRef.current.handPose) {
          const hands = await modelsRef.current.handPose.estimateHands(videoEl);
          if (gen !== generationRef.current) return;
          const filtered = hands.filter(h => (h.score ?? 1) >= minScore);
          callbacks.drawHands(filtered);
          count = filtered.length;
          for (const h of filtered) detectedLabels.push(h.handedness || 'hand');
        } else if (model === 'face-mesh' && modelsRef.current.faceMesh) {
          const faces = await modelsRef.current.faceMesh.estimateFaces(videoEl);
          if (gen !== generationRef.current) return;
          callbacks.drawFaceMesh(faces);
          count = faces.length;
          for (let i = 0; i < count; i++) detectedLabels.push('face-mesh');
        } else if (model === 'body-seg' && modelsRef.current.bodySeg) {
          const segmentation = await modelsRef.current.bodySeg.segmentPeople(videoEl);
          if (gen !== generationRef.current) return;
          if (segmentation.length > 0 && segmentation[0].mask) {
            const maskObj = segmentation[0].mask;
            const source = await maskObj.toCanvasImageSource();
            const tmpCanvas = document.createElement('canvas');
            const w = (source as HTMLCanvasElement).width ?? (source as ImageBitmap).width;
            const h = (source as HTMLCanvasElement).height ?? (source as ImageBitmap).height;
            tmpCanvas.width = w;
            tmpCanvas.height = h;
            const tmpCtx = tmpCanvas.getContext('2d');
            if (tmpCtx) {
              tmpCtx.drawImage(source, 0, 0);
              const imgData = tmpCtx.getImageData(0, 0, w, h);
              for (let i = 0; i < imgData.data.length; i += 4) {
                const v = imgData.data[i];
                if (v > 128) {
                  imgData.data[i] = 0;
                  imgData.data[i + 1] = 255;
                  imgData.data[i + 2] = 170;
                  imgData.data[i + 3] = 80;
                } else {
                  imgData.data[i + 3] = 0;
                }
              }
              callbacks.drawSegmentation(imgData);
            }
            if ('close' in source && typeof source.close === 'function') {
              source.close();
            }
          }
          count = segmentation.length;
          if (count > 0) detectedLabels.push('person');
        }
      } catch {
        if (gen !== generationRef.current) return;
      }

      // Dispatch for all models so AlertConfig and StatsChart work
      if (detectedLabels.length > 0) {
        window.dispatchEvent(new CustomEvent('detection-classes', { detail: detectedLabels }));
      }

      if (gen !== generationRef.current) return;

      const ms = (performance.now() - t0).toFixed(0);
      setStats({ count, ms, model });

      rafRef.current = requestAnimationFrame(loop);
    };

    loop();
  }, []);

  const switchModel = useCallback(async (type: ModelType) => {
    cancelLoop();
    await loadModel(type);
  }, [loadModel, cancelLoop]);

  const stopDetection = useCallback(() => {
    cancelLoop();
    setStats(null);
  }, [cancelLoop]);

  useEffect(() => {
    return () => {
      generationRef.current++;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { loading, stats, activeModel, threshold, setThreshold: updateThreshold, loadModel, switchModel, startDetection, stopDetection };
}
