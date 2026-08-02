/**
 * 📊 海量 POI 聚合图层工厂
 *
 * 提供四种显示模式（由 /bigdata 模块控制切换）：
 *  - 散点   ScatterplotLayer   逐个渲染（GPU 实例化）
 *  - 六边形 HexagonLayer       蜂窝聚合，柱高/颜色 = 密度
 *  - 网格   CPUGridLayer       方形网格聚合
 *  - 点聚类 supercluster       按 zoom 自动合并成带数量的聚类点
 */
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { HexagonLayer, GridLayer } from '@deck.gl/aggregation-layers';
import type { ScatterDataItem } from '../utils/dataGenerator';

/** 点聚类输出：一个聚类点或一个独立点 */
export interface ClusterPoint {
  longitude: number;
  latitude: number;
  /** 聚类包含的点数（独立点为 1） */
  count: number;
  /** 是否聚类点（false = 高 zoom 下的独立点） */
  isCluster: boolean;
}

/** 散点模式 */
export function createScatterDisplayLayer(data: ScatterDataItem[]) {
  return new ScatterplotLayer({
    id: 'bd-scatter',
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
 * 六边形聚合模式（蜂窝，柱高+颜色 = 点密度）
 * @param radius 六边形半径（米），由外部按 zoom 传入实现缩放联动
 */
export function createHexagonLayer(data: ScatterDataItem[], radius: number) {
  return new HexagonLayer({
    id: 'bd-hexagon',
    data,
    getPosition: (d: ScatterDataItem) => [d.longitude, d.latitude],
    radius,
    elevationScale: 4,
    extruded: true,
    colorAggregation: 'SUM',
    getColorWeight: 1,
    pickable: true,
  } as any);
}

/**
 * 网格聚合模式（CPU 网格聚合）
 * @param cellSize 网格边长（米），由外部按 zoom 传入实现缩放联动
 */
export function createGridLayer(data: ScatterDataItem[], cellSize: number) {
  return new GridLayer({
    id: 'bd-grid',
    data,
    getPosition: (d: ScatterDataItem) => [d.longitude, d.latitude],
    cellSize,
    colorAggregation: 'SUM',
    getColorWeight: 1,
    pickable: true,
  } as any);
}

/** 点聚类模式（聚类圆点 + 数量文字，两层） */
export function createClusterLayers(points: ClusterPoint[]) {
  const circle = new ScatterplotLayer({
    id: 'bd-cluster',
    data: points,
    getPosition: (d: ClusterPoint) => [d.longitude, d.latitude],
    // 半径按米算，但用像素下限/上限钳制，保证任何缩放下聚类点和独立点都可见
    getRadius: (d: ClusterPoint) => (d.isCluster ? 150 + Math.sqrt(d.count) * 15 : 100),
    radiusMinPixels: 4,
    radiusMaxPixels: 40,
    getFillColor: (d: ClusterPoint) => (d.isCluster ? [255, 140, 0, 220] : [80, 200, 255, 220]),
    stroked: true,
    getLineColor: [255, 255, 255, 180],
    getLineWidth: 1,
    updateTriggers: { getRadius: [points], getFillColor: [points] },
    pickable: true,
  } as any);

  const text = new TextLayer({
    id: 'bd-cluster-text',
    data: points.filter((p) => p.isCluster),
    getPosition: (d: ClusterPoint) => [d.longitude, d.latitude],
    getText: (d: ClusterPoint) => String(d.count),
    getSize: 11,
    getColor: [255, 255, 255, 255],
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    updateTriggers: { getText: [points] },
  } as any);

  return [circle, text];
}
