import maplibregl from 'maplibre-gl';
import MapLibreDraw from 'maplibre-gl-draw';

/**
 * 添加本地矢量瓦片数据源 (北京路网)
 */
export function addVectorTileSource(map: maplibregl.Map) {
  map.addSource('my-local-tiles', {
    type: 'vector',
    url: 'http://localhost:8080/data/output.json',
  });
}

/**
 * 创建路网图层 (数据驱动样式)
 */
export function addRoadLayers(map: maplibregl.Map) {
  // 主干道 (高速/主干路)
  map.addLayer({
    id: 'road-major',
    type: 'line',
    source: 'my-local-tiles',
    'source-layer': 'beijing',
    filter: ['in', 'fclass', 'motorway', 'trunk', 'primary'],
    paint: {
      'line-color': [
        'match',
        ['get', 'class'],
        'motorway', '#FF6B35',
        'primary', '#FFB347',
        'secondary', '#FFD700',
        '#CCCCCC',
      ],
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 15, 8, 18, 15],
    },
  });

  // 普通街道
  map.addLayer({
    id: 'road-minor',
    type: 'line',
    source: 'my-local-tiles',
    'source-layer': 'beijing',
    filter: ['!in', 'fclass', 'motorway', 'trunk', 'primary'],
    paint: { 'line-color': '#8c8c8c', 'line-width': 1 },
  });
}

/**
 * 创建点图层 (北京中心标记)
 */
export function addPointLayer(map: maplibregl.Map) {
  map.addSource('source-point', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: { name: '北京中心点' },
      geometry: { type: 'Point', coordinates: [116.403874, 39.914885] },
    },
  });
  map.addLayer({
    id: 'layer-point',
    type: 'circle',
    source: 'source-point',
    paint: {
      'circle-radius': 10,
      'circle-color': '#ff4444',
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
    },
  });
  map.addLayer({
    id: 'layer-point-label',
    type: 'symbol',
    source: 'source-point',
    layout: {
      'text-field': ['get', 'name'],
      'text-offset': [0, -2],
      'text-anchor': 'bottom',
      'text-size': 14,
    },
    paint: {
      'text-color': '#ff4444',
      'text-halo-color': '#ffffff',
      'text-halo-width': 2,
    },
  });
}

/**
 * 创建线图层 (辅助线)
 */
export function addLineLayer(map: maplibregl.Map) {
  map.addSource('source-line', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: { name: '天线' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [116.428, 39.908],
          [116.428, 39.925],
          [116.433, 39.93],
        ],
      },
    },
  });
  map.addLayer({
    id: 'layer-line',
    type: 'line',
    source: 'source-line',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': [
        'match', ['get', 'class'],
        'motorway', '#FF6B35', 'primary', '#FFB347',
        'secondary', '#FFD700', '#CCCCCC',
      ],
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 15, 8, 18, 15],
    },
  });
  map.addLayer({
    id: 'layer-line-label',
    type: 'symbol',
    source: 'source-line',
    layout: {
      'text-field': ['get', 'name'],
      'text-offset': [0, -1.5],
      'text-anchor': 'bottom',
      'text-size': 14,
    },
    paint: {
      'text-color': '#ffaa00',
      'text-halo-color': '#ffffff',
      'text-halo-width': 2,
    },
  });
}

/**
 * 创建面图层 (矩形区域)
 */
export function addPolygonLayer(map: maplibregl.Map) {
  map.addSource('source-polygon', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: { name: '矩形区域' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [116.355, 39.895], [116.385, 39.895],
          [116.385, 39.92], [116.355, 39.92],
          [116.355, 39.895],
        ]],
      },
    },
  });
  map.addLayer({
    id: 'layer-polygon-fill', type: 'fill', source: 'source-polygon',
    paint: { 'fill-color': '#3388ff', 'fill-opacity': 0.35 },
  });
  map.addLayer({
    id: 'layer-polygon-outline', type: 'line', source: 'source-polygon',
    paint: { 'line-color': '#3388ff', 'line-width': 3 },
  });
  map.addLayer({
    id: 'layer-polygon-label', type: 'symbol', source: 'source-polygon',
    layout: {
      'text-field': ['get', 'name'], 'text-offset': [0, -1.5],
      'text-anchor': 'bottom', 'text-size': 14,
    },
    paint: {
      'text-color': '#3388ff', 'text-halo-color': '#ffffff', 'text-halo-width': 2,
    },
  });
}

/**
 * 创建三维建筑图层 (fill-extrusion)
 */
export function add3dBuildingLayer(map: maplibregl.Map) {
  map.addSource('source-3d', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: { name: '三维大楼', height: 300 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [116.448, 39.898], [116.462, 39.898],
          [116.462, 39.91], [116.448, 39.91],
          [116.448, 39.898],
        ]],
      },
    },
  });
  map.addLayer({
    id: 'layer-3d',
    type: 'fill-extrusion',
    source: 'source-3d',
    paint: {
      'fill-extrusion-color': '#ff66cc',
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.8,
    },
  });
  map.addLayer({
    id: 'layer-3d-label',
    type: 'symbol', source: 'source-3d',
    layout: {
      'text-field': ['get', 'name'], 'text-offset': [0, -2.5],
      'text-anchor': 'bottom', 'text-size': 14,
    },
    paint: {
      'text-color': '#ff66cc', 'text-halo-color': '#ffffff', 'text-halo-width': 2,
    },
  });
}

/**
 * 调整图层渲染顺序
 */
export function reorderLayers(map: maplibregl.Map) {
  map.moveLayer('layer-3d');
  map.moveLayer('layer-3d-label');
  map.moveLayer('layer-polygon-fill');
  map.moveLayer('layer-polygon-outline');
  map.moveLayer('layer-polygon-label');
}

/**
 * 初始化 MapLibreDraw 绘制工具
 */
export function initDrawControl(map: maplibregl.Map): MapLibreDraw {
  const draw = new MapLibreDraw({
    displayControlsDefault: true,
    controls: { point: true, line_string: true, polygon: true, trash: true },
  });
  map.addControl(draw as any, 'top-left');
  map.on('draw.create', (e) => {
    console.log('绘制完成，图形数据：', e.features);
  });
  return draw;
}
