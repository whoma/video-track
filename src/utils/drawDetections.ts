import { getColor } from './colors';

export interface Detection {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

export interface FaceDetection {
  topLeft: [number, number];
  bottomRight: [number, number];
  landmarks: [number, number][];
  probability: number[];
}

export interface Keypoint {
  position: { x: number; y: number };
  part: string;
  score: number;
}

export interface Pose {
  keypoints: Keypoint[];
  score: number;
}

const POSE_EDGES: [string, string][] = [
  ['nose', 'leftEye'], ['nose', 'rightEye'],
  ['leftEye', 'leftEar'], ['rightEye', 'rightEar'],
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'], ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'], ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle'],
];

export function drawDetections(
  ctx: CanvasRenderingContext2D,
  predictions: Detection[],
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const scaleX = canvasWidth / videoWidth;
  const scaleY = canvasHeight / videoHeight;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  for (const pred of predictions) {
    const [x, y, w, h] = pred.bbox;
    const sx = x * scaleX;
    const sy = y * scaleY;
    const sw = w * scaleX;
    const sh = h * scaleY;
    const color = getColor(pred.class);
    const score = (pred.score * 100).toFixed(0);
    const label = `${pred.class} ${score}%`;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);

    const corner = 14;
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(sx, sy + corner); ctx.lineTo(sx, sy); ctx.lineTo(sx + corner, sy);
    ctx.moveTo(sx + sw - corner, sy); ctx.lineTo(sx + sw, sy); ctx.lineTo(sx + sw, sy + corner);
    ctx.moveTo(sx, sy + sh - corner); ctx.lineTo(sx, sy + sh); ctx.lineTo(sx + corner, sy + sh);
    ctx.moveTo(sx + sw - corner, sy + sh); ctx.lineTo(sx + sw, sy + sh); ctx.lineTo(sx + sw, sy + sh - corner);
    ctx.stroke();

    ctx.font = 'bold 13px sans-serif';
    const textW = ctx.measureText(label).width + 10;
    ctx.fillStyle = color;
    ctx.fillRect(sx, sy - 22, textW, 22);

    ctx.fillStyle = '#000';
    ctx.fillText(label, sx + 5, sy - 6);
  }
}

export function drawFaces(
  ctx: CanvasRenderingContext2D,
  faces: FaceDetection[],
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const scaleX = canvasWidth / videoWidth;
  const scaleY = canvasHeight / videoHeight;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  for (const face of faces) {
    const [x1, y1] = face.topLeft;
    const [x2, y2] = face.bottomRight;
    const sx = x1 * scaleX;
    const sy = y1 * scaleY;
    const sw = (x2 - x1) * scaleX;
    const sh = (y2 - y1) * scaleY;
    const score = (face.probability[0] * 100).toFixed(0);

    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);

    // Corner accents
    const corner = 12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, sy + corner); ctx.lineTo(sx, sy); ctx.lineTo(sx + corner, sy);
    ctx.moveTo(sx + sw - corner, sy); ctx.lineTo(sx + sw, sy); ctx.lineTo(sx + sw, sy + corner);
    ctx.moveTo(sx, sy + sh - corner); ctx.lineTo(sx, sy + sh); ctx.lineTo(sx + corner, sy + sh);
    ctx.moveTo(sx + sw - corner, sy + sh); ctx.lineTo(sx + sw, sy + sh); ctx.lineTo(sx + sw, sy + sh - corner);
    ctx.stroke();

    // Landmarks
    for (const [lx, ly] of face.landmarks) {
      ctx.beginPath();
      ctx.arc(lx * scaleX, ly * scaleY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4488';
      ctx.fill();
    }

    const label = `face ${score}%`;
    ctx.font = 'bold 13px sans-serif';
    const textW = ctx.measureText(label).width + 10;
    ctx.fillStyle = '#00ffaa';
    ctx.fillRect(sx, sy - 22, textW, 22);
    ctx.fillStyle = '#000';
    ctx.fillText(label, sx + 5, sy - 6);
  }
}

export function drawPoses(
  ctx: CanvasRenderingContext2D,
  poses: Pose[],
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const scaleX = canvasWidth / videoWidth;
  const scaleY = canvasHeight / videoHeight;
  const minScore = 0.3;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  for (const pose of poses) {
    const kpMap: Record<string, Keypoint> = {};
    for (const kp of pose.keypoints) {
      kpMap[kp.part] = kp;
    }

    // Draw skeleton edges
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    for (const [a, b] of POSE_EDGES) {
      const ka = kpMap[a];
      const kb = kpMap[b];
      if (ka && kb && ka.score > minScore && kb.score > minScore) {
        ctx.beginPath();
        ctx.moveTo(ka.position.x * scaleX, ka.position.y * scaleY);
        ctx.lineTo(kb.position.x * scaleX, kb.position.y * scaleY);
        ctx.stroke();
      }
    }

    // Draw keypoints
    for (const kp of pose.keypoints) {
      if (kp.score > minScore) {
        const cx = kp.position.x * scaleX;
        const cy = kp.position.y * scaleY;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ff6f00';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}
