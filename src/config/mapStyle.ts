import maplibregl from 'maplibre-gl';

/**
 * 后端瓦片代理地址。
 * 瓦片统一走后端 /api/tiles/*，好处：
 *   1. 前端 Service Worker 只缓存这一个源 → 离线可用（模块四）
 *   2. 天地图密钥等藏在后端，不暴露给浏览器
 */
const API_BASE = 'http://localhost:4000';

/** 图层配置项 */
export interface LayerConfigItem {
  id: string;
  name: string;
  group: string;
  /** MapLibre paint 透明度属性名, 空串表示 Deck.gl 图层 */
  opacityProp: string;
}

/** 图层配置表 (面板渲染和图层操作共用) */
export const LAYER_CONFIG: LayerConfigItem[] = [
  { id: 'cartodb_layer', name: '地图底图', group: '底图', opacityProp: 'raster-opacity' },
  { id: 'tianditu_labels_layer', name: '标注', group: '底图', opacityProp: 'raster-opacity' },
  { id: 'road-major', name: '主干道', group: '路网', opacityProp: 'line-opacity' },
  { id: 'road-minor', name: '普通街道', group: '路网', opacityProp: 'line-opacity' },
  { id: 'layer-point', name: '标记点', group: '标注', opacityProp: 'circle-opacity' },
  { id: 'layer-polygon-fill', name: '区域填充', group: '区域', opacityProp: 'fill-opacity' },
  { id: 'layer-polygon-outline', name: '区域边框', group: '区域', opacityProp: 'line-opacity' },
  { id: 'layer-3d', name: '3D建筑', group: '3D', opacityProp: 'fill-extrusion-opacity' },
  { id: 'line-layer', name: '线段(Deck)', group: 'Deck.gl', opacityProp: '' },
  { id: 'big-data-scatter', name: '海量数据点', group: 'Deck.gl', opacityProp: '' },
];

/**
 * 生成 MapLibre Style 配置
 * @param isDarkMode true=夜间 false=白天
 */
export function getMapStyle(isDarkMode: boolean): maplibregl.StyleSpecification {
  // 瓦片走后端代理：前端只请求 /api/tiles/:provider/:z/:x/:y
  const baseLayerUrl = `${API_BASE}/api/tiles/${isDarkMode ? 'carto_dark' : 'carto_light'}/{z}/{x}/{y}`;

  return {
    version: 8,
    sources: {
      cartodb_base: {
        type: 'raster',
        tiles: [baseLayerUrl],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
      // 天地图标注：密钥由后端代理添加（config/tiles.js），前端不暴露 tk
      tianditu_labels: {
        type: 'raster',
        tiles: [`${API_BASE}/api/tiles/tianditu_vec/{z}/{x}/{y}`],
        tileSize: 256,
      },
    },
    layers: [
      { id: 'cartodb_layer', type: 'raster', source: 'cartodb_base' },
      { id: 'tianditu_labels_layer', type: 'raster', source: 'tianditu_labels' },
    ],
  };
}
