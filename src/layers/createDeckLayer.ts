import { ScatterplotLayer, LineLayer } from '@deck.gl/layers';
import type { ScatterDataItem } from '../utils/dataGenerator';

/** LineLayer 数据项 */
interface LineDataItem {
  from: [number, number];
  to: [number, number];
}

/**
 * 构建 Deck.gl ScatterplotLayer (GPU 实例化渲染)
 * @param data 散点数据
 */
export function createScatterLayers(data: ScatterDataItem[]) {
  return new ScatterplotLayer({
    id: 'big-data-scatter',
    data,
    radiusScale: 50,
    getPosition: (d: ScatterDataItem) => [d.longitude, d.latitude],
    getRadius: (d: ScatterDataItem) => 100 + d.value * 4,
    getFillColor: (d: ScatterDataItem) => {
      const v = d.value;
      return [Math.floor(v * 255), Math.floor((1 - v) * 255), 60, 180];
    },
    stroked: true,
    getLineColor: [0, 0, 0, 50],
    getLineWidth: 1,
  } as any);
}

/**
 * 构建 Deck.gl LineLayer (示例线段)
 */
export function createLineLayer() {
  const lineData: LineDataItem[] = [
    { from: [116.397, 39.908], to: [116.407, 39.908] },
    { from: [116.397, 39.915], to: [116.407, 39.915] },
    { from: [116.397, 39.908], to: [116.397, 39.915] },
  ];

  return new LineLayer({
    id: 'line-layer',
    data: lineData,
    getSourcePosition: (d: LineDataItem) => d.from,
    getTargetPosition: (d: LineDataItem) => d.to,
    getColor: [255, 80, 80],
    getWidth: 5,
  });
}
