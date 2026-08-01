// import { console } from 'inspector';
import { useMapStore } from '../store/mapStore';
import type { Viewport } from '../types/map';

/**
 * 从 store 读取当前视口 (中心点/缩放/俯仰/旋转/BBox)
 * 组件在地图移动时会自动更新
 *
 * 使用示例:
 *   const viewport = useViewport();
 *   // 获取当前可视范围
 *   const bounds = viewport?.bounds;  // [west, south, east, north]
 */
export function useViewport(): Viewport | null {
  return useMapStore((state) => state.viewport);
}

/**
 * 从 MapLibre 实例提取视口信息
 * 在 map 'move' 事件回调中调用
 */
export function extractViewport(map: { getCenter: () => { lng: number; lat: number }; getZoom: () => number; getPitch: () => number; getBearing: () => number; getBounds: () => { getWest: () => number; getSouth: () => number; getEast: () => number; getNorth: () => number } }): Viewport {
  const center = map.getCenter();
  const bounds = map.getBounds();
  console.log('中间点' + center);
  console.log('视口' +  bounds)
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
    bounds: [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ],
  };
}
