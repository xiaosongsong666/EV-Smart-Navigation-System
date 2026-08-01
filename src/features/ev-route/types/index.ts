/** 🚗 EV 路径规划 — 类型定义 */

export interface RoutePoint {
  lat: number;
  lng: number;
  name: string;
}

export interface RouteResult {
  distance: number;
  duration: number;
  geometry: string;
  maneuvers: { instruction: string; distance: number }[];
}

export interface SimInfo {
  speed: number;
  traveled: number;
  remaining: number;
  remainingTime: number;
  bearing: number;
}

export const COSTING_OPTIONS = [
  { value: 'auto', label: '🚗 驾车' },
  { value: 'bus', label: '🚌 公交' },
  { value: 'pedestrian', label: '🚶 步行' },
  { value: 'bicycle', label: '🚲 骑行' },
  { value: 'truck', label: '🚛 卡车' },
] as const;
