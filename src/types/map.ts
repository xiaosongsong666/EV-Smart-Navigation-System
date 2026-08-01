/** 矩形 BBox: [west, south, east, north] */
export type BBox = [number, number, number, number];

/** 地图视口信息 */
export interface Viewport {
  center: [number, number]; // [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
  bounds: BBox;
}
