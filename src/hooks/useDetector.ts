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
  const detectingRef = useRef(false);
  const activeModelRef = useRef<ModelType>('coco-ssd');
  const thresholdRef = useRef(0.5);

  const updateThreshold = useCallback((v: number) => {
    setThreshold(v);
    thresholdRef.current = v;
  }, []);

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

    setLoading(false);
  }, []);

  const startDetection = useCallback((videoEl: HTMLVideoElement, callbacks: DrawCallbacks) => {
    detectingRef.current = true;

    const loop = async () => {
      if (!detectingRef.current || videoEl.paused || videoEl.ended) return;

      const model = activeModelRef.current;
      const minScore = thresholdRef.current;
      const t0 = performance.now();
      let count = 0;

      if (model === 'coco-ssd' && modelsRef.current.cocoSsd) {
        const predictions = await modelsRef.current.cocoSsd.detect(videoEl);
        const filtered = predictions.filter(p => p.score >= minScore);
        callbacks.drawDetections(filtered);
        count = filtered.length;
      } else if (model === 'blazeface' && modelsRef.current.blazeface) {
        const faces = await modelsRef.current.blazeface.estimateFaces(videoEl, false);
        const converted = toFaceDetections(faces);
        const filtered = converted.filter(f => f.probability[0] >= minScore);
        callbacks.drawFaces(filtered);
        count = filtered.length;
      } else if (model === 'posenet' && modelsRef.current.posenet) {
        const poses = await modelsRef.current.posenet.estimateMultiplePoses(videoEl, {
          flipHorizontal: false,
          maxDetections: 5,
          scoreThreshold: minScore,
          nmsRadius: 20,
        });
        callbacks.drawPoses(poses);
        count = poses.length;
      } else if (model === 'hand-pose' && modelsRef.current.handPose) {
        const hands = await modelsRef.current.handPose.estimateHands(videoEl);
        const filtered = hands.filter(h => (h.score ?? 1) >= minScore);
        callbacks.drawHands(filtered);
        count = filtered.length;
      } else if (model === 'face-mesh' && modelsRef.current.faceMesh) {
        const faces = await modelsRef.current.faceMesh.estimateFaces(videoEl);
        callbacks.drawFaceMesh(faces);
        count = faces.length;
      } else if (model === 'body-seg' && modelsRef.current.bodySeg) {
        const segmentation = await modelsRef.current.bodySeg.segmentPeople(videoEl);
        if (segmentation.length > 0 && segmentation[0].mask) {
          const maskObj = segmentation[0].mask;
          const canvas = (await maskObj.toCanvasImageSource()) as HTMLCanvasElement;
          const tmpCtx = canvas.getContext?.('2d');
          if (tmpCtx) {
            const imgData = tmpCtx.getImageData(0, 0, canvas.width, canvas.height);
            // Color the mask: person=green overlay, bg=transparent
            for (let i = 0; i < imgData.data.length; i += 4) {
              const personProb = imgData.data[i]; // mask value
              if (personProb > 128) {
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
        }
        count = segmentation.length;
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

  return { loading, stats, activeModel, threshold, setThreshold: updateThreshold, loadModel, switchModel, startDetection, stopDetection };
}
