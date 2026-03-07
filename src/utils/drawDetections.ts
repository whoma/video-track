import type { DetectedObject } from '@tensorflow-models/coco-ssd';
import type { Keypoint, Pose } from '@tensorflow-models/posenet';
import type { Hand } from '@tensorflow-models/hand-pose-detection';
import type { Face } from '@tensorflow-models/face-landmarks-detection';
import { getColor } from './colors';

export type Detection = DetectedObject;

export interface FaceDetection {
  topLeft: [number, number];
  bottomRight: [number, number];
  landmarks: number[][];
  probability: number[];
}

export type { Keypoint, Pose, Hand, Face };

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
): void {
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
): void {
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
): void {
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

const HAND_CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

export function drawHands(
  ctx: CanvasRenderingContext2D,
  hands: Hand[],
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  const scaleX = canvasWidth / videoWidth;
  const scaleY = canvasHeight / videoHeight;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const colors = ['#ff6f00', '#00e5ff'];
  for (let hi = 0; hi < hands.length; hi++) {
    const hand = hands[hi];
    const kps = hand.keypoints;
    const color = colors[hi % colors.length];

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (const [a, b] of HAND_CONNECTIONS) {
      if (kps[a] && kps[b]) {
        ctx.beginPath();
        ctx.moveTo(kps[a].x * scaleX, kps[a].y * scaleY);
        ctx.lineTo(kps[b].x * scaleX, kps[b].y * scaleY);
        ctx.stroke();
      }
    }

    for (const kp of kps) {
      ctx.beginPath();
      ctx.arc(kp.x * scaleX, kp.y * scaleY, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const label = hand.handedness || 'hand';
    const score = hand.score != null ? ` ${(hand.score * 100).toFixed(0)}%` : '';
    ctx.font = 'bold 13px sans-serif';
    const text = `${label}${score}`;
    const textW = ctx.measureText(text).width + 10;
    const lx = kps[0].x * scaleX;
    const ly = kps[0].y * scaleY;
    ctx.fillStyle = color;
    ctx.fillRect(lx, ly - 22, textW, 22);
    ctx.fillStyle = '#000';
    ctx.fillText(text, lx + 5, ly - 6);
  }
}

const FACEMESH_TESSELATION_SAMPLE: [number, number][] = [
  [10,338],[338,297],[297,332],[332,284],[284,251],[251,389],[389,356],[356,454],
  [454,323],[323,361],[361,288],[288,397],[397,365],[365,379],[379,378],[378,400],
  [400,377],[377,152],[152,148],[148,176],[176,149],[149,150],[150,136],[136,172],
  [172,58],[58,132],[132,93],[93,234],[234,127],[127,162],[162,21],[21,54],
  [54,103],[103,67],[67,109],[109,10],
  [33,7],[7,163],[163,144],[144,145],[145,153],[153,154],[154,155],[155,133],
  [33,246],[246,161],[161,160],[160,159],[159,158],[158,157],[157,173],[173,133],
  [263,249],[249,390],[390,373],[373,374],[374,380],[380,381],[381,382],[382,362],
  [263,466],[466,388],[388,387],[387,386],[386,385],[385,384],[384,398],[398,362],
  [78,191],[191,80],[80,81],[81,82],[82,13],[13,312],[312,311],[311,310],[310,415],[415,308],
  [78,95],[95,88],[88,178],[178,87],[87,14],[14,317],[317,402],[402,318],[318,324],[324,308],
];

export function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  faces: Face[],
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  const scaleX = canvasWidth / videoWidth;
  const scaleY = canvasHeight / videoHeight;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  for (const face of faces) {
    const kps = face.keypoints;

    ctx.strokeStyle = 'rgba(0, 255, 170, 0.3)';
    ctx.lineWidth = 0.5;
    for (const [a, b] of FACEMESH_TESSELATION_SAMPLE) {
      if (kps[a] && kps[b]) {
        ctx.beginPath();
        ctx.moveTo(kps[a].x * scaleX, kps[a].y * scaleY);
        ctx.lineTo(kps[b].x * scaleX, kps[b].y * scaleY);
        ctx.stroke();
      }
    }

    // Draw eye and lip outlines more prominently
    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 1.5;
    const eyeL = [33,246,161,160,159,158,157,173,133,155,154,153,145,144,163,7,33];
    const eyeR = [263,466,388,387,386,385,384,398,362,382,381,380,374,373,390,249,263];
    const lips = [78,191,80,81,82,13,312,311,310,415,308,324,318,402,317,14,87,178,88,95,78];
    for (const contour of [eyeL, eyeR, lips]) {
      ctx.beginPath();
      for (let i = 0; i < contour.length; i++) {
        const kp = kps[contour[i]];
        if (!kp) continue;
        if (i === 0) ctx.moveTo(kp.x * scaleX, kp.y * scaleY);
        else ctx.lineTo(kp.x * scaleX, kp.y * scaleY);
      }
      ctx.stroke();
    }

    const score = face.box ? ` ${((face as { score?: number }).score ?? 0 * 100).toFixed(0)}%` : '';
    const label = `face mesh${score}`;
    ctx.font = 'bold 13px sans-serif';
    const textW = ctx.measureText(label).width + 10;
    const bx = face.box ? face.box.xMin * scaleX : 0;
    const by = face.box ? face.box.yMin * scaleY : 0;
    ctx.fillStyle = '#00ffaa';
    ctx.fillRect(bx, by - 22, textW, 22);
    ctx.fillStyle = '#000';
    ctx.fillText(label, bx + 5, by - 6);
  }
}

export function drawSegmentation(
  ctx: CanvasRenderingContext2D,
  maskData: ImageData,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.putImageData(maskData, 0, 0);
}
