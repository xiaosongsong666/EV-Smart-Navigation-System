import { create } from 'zustand';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { MapboxOverlay } from '@deck.gl/mapbox';
import type { Viewport } from '../types/map';

interface MapStore {
  /** MapLibre 地图实例 (全局注册, 供任意组件操作地图) */
  map: MapLibreMap | null;
  /** Deck.gl MapboxOverlay 实例 (全局注册, 供任意组件操作 Deck.gl 图层) */
  deckOverlay: MapboxOverlay | null;
  /** Deck.gl 图层数组 (供模块 clone + setProps 切换显隐, 如 /bigdata 的散点层) */
  deckLayers: any[] | null;
  /** 当前视口信息 (由地图 move 事件驱动) */
  viewport: Viewport | null;
  /** 地图是否已加载完成 */
  mapReady: boolean;
  /** 注册/销毁 MapLibre 实例 */
  setMap: (map: MapLibreMap | null) => void;
  /** 注册/销毁 Deck.gl Overlay */
  setDeckOverlay: (overlay: MapboxOverlay | null) => void;
  /** 注册/更新 Deck.gl 图层数组 */
  setDeckLayers: (layers: any[] | null) => void;
  /** 更新视口 */
  updateViewport: (viewport: Viewport) => void;
  /** 标记地图加载完成 */
  setMapReady: (ready: boolean) => void;
}

/**
 * 地图全局 store
 * 暴露 map + deckOverlay + viewport, 供所有模块使用:
 *  - 模块二: map.addLayer(routeLayer) 画路径
 *  - 模块三: map 缩放定位 + deckOverlay 更新充电站图层
 *  - 模块五: viewport.bounds 做 R-Tree 空间过滤
 */
export const useMapStore = create<MapStore>()((set) => ({
  map: null,
  deckOverlay: null,
  deckLayers: null,
  viewport: null,
  mapReady: false,
  setMap: (map) => set({ map }),
  setDeckOverlay: (deckOverlay) => set({ deckOverlay }),
  setDeckLayers: (deckLayers) => set({ deckLayers }),
  updateViewport: (viewport) => set({ viewport }),
  setMapReady: (ready) => set({ mapReady: ready }),
}));
