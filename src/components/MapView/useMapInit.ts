import { useEffect, useRef, useCallback } from 'react';
import { NavigationControl, MapMouseEvent, Map as MapLibreMap } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import MapLibreDraw from 'maplibre-gl-draw';
import { getMapStyle, LAYER_CONFIG } from '../../config/mapStyle';
import { createScatterLayers, createLineLayer } from '../../layers/createDeckLayer';
import {
  addVectorTileSource,
  addRoadLayers,
  addPointLayer,
  addLineLayer as addMapLineLayer,
  addPolygonLayer,
  add3dBuildingLayer,
  reorderLayers,
  initDrawControl,
} from '../../layers/createMapLayers';
import type { ScatterDataItem } from '../../utils/dataGenerator';
import { useMapStore } from '../../store/mapStore';
import { extractViewport } from '../../hooks/useViewport';

export interface LayerStateMap {
  [layerId: string]: { visible: boolean; opacity: number };
}

interface UseMapInitOptions {
  container: React.RefObject<HTMLDivElement | null>;
  theme?: string;
  scatterData: ScatterDataItem[];
  onLayerStatesChange: (states: LayerStateMap) => void;
}

interface UseMapInitReturn {
  mapRef: React.RefObject<MapLibreMap | null>;
  drawRef: React.RefObject<MapLibreDraw | null>;
  overlayRef: React.RefObject<MapboxOverlay | null>;
  deckLayersRef: React.RefObject<any[]>;
  toggleVisibility: (layerId: string) => void;
  setOpacity: (layerId: string, opacity: number) => void;
  toggleDark: (val: string) => void;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  getMap: () => MapLibreMap | null;
}

/**
 * Hook: 地图初始化 + 图层控制
 * 封装了 MapLibre 实例创建、图层加载、图层面板交互逻辑
 */
export function useMapInit({
  container,
  theme,
  scatterData,
  onLayerStatesChange,
}: UseMapInitOptions): UseMapInitReturn {
  const mapRef = useRef<MapLibreMap | null>(null);
  const drawRef = useRef<MapLibreDraw | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const deckLayersRef = useRef<any[]>([]);

  // ---- 切换图层显隐 ----
  const toggleVisibility = useCallback((layerId: string) => {
    const map = mapRef.current;
    if (!map) return;

    // 读取当前状态 (由外部通过 state 管理, 这里只操作地图)
    if (map.getLayer(layerId)) {
      const vis = map.getLayoutProperty(layerId, 'visibility');
      const newVis = vis === 'none' ? 'visible' : 'none';
      map.setLayoutProperty(layerId, 'visibility', newVis);
    } else if (overlayRef.current && deckLayersRef.current.some((l: any) => l.id === layerId)) {
      // Deck.gl 图层
      const updated = deckLayersRef.current.map((l: any) =>
        l.id === layerId ? l.clone({ visible: l.props.visible === false }) : l,
      );
      deckLayersRef.current = updated;
      overlayRef.current.setProps({ layers: updated });
    }
  }, []);

  // ---- 设置透明度 ----
  const setOpacity = useCallback((layerId: string, opacity: number) => {
    const cfg = LAYER_CONFIG.find((l) => l.id === layerId);
    if (!cfg || !cfg.opacityProp) return;
    mapRef.current?.setPaintProperty(layerId, cfg.opacityProp, opacity);
  }, []);

  // ---- 主题切换 ----
  // val 取值：'day' | 'night' | 'high-contrast'（见 types/index.ts ThemeMode）
  const toggleDark = useCallback((val: string) => {
    const isDark = val === 'night' || val === 'high-contrast';
    mapRef.current?.setStyle(getMapStyle(isDark));
  }, []);

  // ---- 飞到坐标 ----
  const flyTo = useCallback((lng: number, lat: number, zoom?: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: zoom ?? 11 });
  }, []);

  const getMap = useCallback(() => mapRef.current, []);

  // ---- 地图初始化 ----
  useEffect(() => {
    if (!container.current) return;

    const map = new MapLibreMap({
      container: container.current,
      center: [116.403874, 39.914885],
      zoom: 11,
      pitch: 45,
      bearing: -17.6,

      // theme 取值：'day' | 'night' | 'high-contrast'
      style: getMapStyle(theme === 'night' || theme === 'high-contrast'),
    });

    map.addControl(new NavigationControl(), 'top-right');
    mapRef.current = map;
    // 全局注册 MapLibre 实例 (供所有模块通过 useMapStore 访问)
    useMapStore.getState().setMap(map);

    // ---- 视口同步: 地图移动时更新 store ----
    const syncViewport = () => {
      useMapStore.getState().updateViewport(extractViewport(map));
    };
    map.on('move', syncViewport);

    map.on('load', () => {
      // 地图加载完成 → 标记 ready + 初始化视口
      useMapStore.getState().setMapReady(true);
      syncViewport();

      // 绘制工具
      drawRef.current = initDrawControl(map);

      // MapLibre 原生图层
      addVectorTileSource(map);
      addRoadLayers(map);
      addPointLayer(map);
      addMapLineLayer(map);
      addPolygonLayer(map);
      add3dBuildingLayer(map);
      reorderLayers(map);

      // Deck.gl 集成
      const lineLayer = createLineLayer();
      const scatterLayer = createScatterLayers(scatterData);
      const deckLayers = [lineLayer, scatterLayer];

      const overlay = new MapboxOverlay({ layers: deckLayers });
      map.addControl(overlay);
      overlayRef.current = overlay;
      deckLayersRef.current = deckLayers;
      // 全局注册 Deck.gl Overlay (供所有模块通过 useMapStore 操作图层)
      useMapStore.getState().setDeckOverlay(overlay);

      // 初始化面板状态
      const initialStates: LayerStateMap = {};
      LAYER_CONFIG.forEach((cfg) => {
        if (cfg.group === 'Deck.gl') {
          initialStates[cfg.id] = { visible: true, opacity: 1 };
        } else {
          const layer = map.getLayer(cfg.id);
          if (layer) {
            const vis = map.getLayoutProperty(cfg.id, 'visibility');
            initialStates[cfg.id] = {
              visible: vis !== 'none',
              opacity: cfg.opacityProp
                ? ((map.getPaintProperty(cfg.id, cfg.opacityProp) as number) ?? 1)
                : 1,
            };
          }
        }
      });
      onLayerStatesChange(initialStates);
    });

    // 点击事件
    const handleClick = (e: MapMouseEvent) => {
      console.log('点击坐标：', e.lngLat);
    };
    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
      map.off('move', syncViewport);
      useMapStore.getState().setMapReady(false);
      useMapStore.getState().setMap(null);
      useMapStore.getState().setDeckOverlay(null);
      map.remove();
      mapRef.current = null;
    };
  }, []); // 只在挂载时执行一次

  return {
    mapRef,
    drawRef,
    overlayRef,
    deckLayersRef,
    toggleVisibility,
    setOpacity,
    toggleDark,
    flyTo,
    getMap,
  };
}
