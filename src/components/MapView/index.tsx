import React, { useRef, forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'maplibre-gl-draw/dist/mapbox-gl-draw.css';
import { LAYER_CONFIG } from '../../config/mapStyle';
import { generateMassiveData } from '../../utils/dataGenerator';
import LayerPanel from '../LayerPanel';
import { useMapInit, type LayerStateMap } from './useMapInit';

interface MapViewProps {
  style?: React.CSSProperties;
  theme?: string;
  /** 是否显示图层面板（仅「地图引擎」模块 / 路由下显示） */
  showLayerPanel?: boolean;
}

export interface MapliberHandle {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  getMap: () => maplibregl.Map | null;
  toggleDark: (val: string) => void;
}

/** 图层面板分组顺序 */
const PANEL_GROUPS = ['底图', '路网', '标注', '区域', '3D', 'Deck.gl'];

/**
 * MapView 主组件
 * - MapLibre 地图引擎 (矢量瓦片底图 + 天地图标注)
 * - MapLibre 原生图层 (路网/点/线/面/3D建筑)
 * - Deck.gl 叠加层 (5 万散点 + 线段)
 * - 浮动图层面板 (显隐控制 + 透明度)
 */
const MapView = forwardRef<MapliberHandle, MapViewProps>((props, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [layerStates, setLayerStates] = useState<LayerStateMap>({});

  // 海量数据 (只在挂载时生成一次)
  const scatterData = useMemo(() => generateMassiveData(50000), []);

  // 地图初始化 Hook
  const {
    toggleVisibility: mapToggle,
    setOpacity: mapSetOpacity,
    toggleDark,
    flyTo,
    getMap,
  } = useMapInit({
    container: mapContainer,
    theme: props.theme,
    scatterData,
    onLayerStatesChange: (states) => setLayerStates(states),
  });

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({ flyTo, getMap, toggleDark }));

  // 包装 toggleVisibility: 先操作地图, 再更新面板状态
  const handleToggle = (layerId: string) => {
    mapToggle(layerId);
    const state = layerStates[layerId];
    if (state) {
      setLayerStates((prev) => ({
        ...prev,
        [layerId]: { ...prev[layerId], visible: !state.visible },
      }));
    }
  };

  // 包装 setOpacity: 先操作地图, 再更新面板状态
  const handleOpacity = (layerId: string, opacity: number) => {
    mapSetOpacity(layerId, opacity);
    setLayerStates((prev) => ({
      ...prev,
      [layerId]: { ...prev[layerId], opacity },
    }));
  };

  return (
    <div style={{ width: '100%', height: '85vh', ...props.style, position: 'relative' }}>
      {/* 地图容器 */}
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* 图层面板（仅地图引擎模块显示） */}
      {props.showLayerPanel !== false && (
        <LayerPanel
          config={LAYER_CONFIG}
          states={layerStates}
          onToggle={handleToggle}
          onSetOpacity={handleOpacity}
          groups={PANEL_GROUPS}
          open={panelOpen}
          onClose={() => setPanelOpen(!panelOpen)}
        />
      )}
    </div>
  );
});

export default MapView;
