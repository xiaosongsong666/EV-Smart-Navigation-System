import maplibregl from 'maplibre-gl';

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
  const baseLayerUrl = isDarkMode
    ? 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
    : 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png';

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
      tianditu_labels: {
        type: 'raster',
        tiles: [
          'https://t0.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=be4bbd91e911191d869cf79dbc96bcc1',
        ],
        tileSize: 256,
      },
    },
    layers: [
      { id: 'cartodb_layer', type: 'raster', source: 'cartodb_base' },
      { id: 'tianditu_labels_layer', type: 'raster', source: 'tianditu_labels' },
    ],
  };
}
