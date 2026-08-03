/**
 * 📍 海量 POI 模块（路由 /bigdata）
 *
 * 在公用地图的 Deck.gl 层上做四种渲染模式切换：
 *  - 散点   ScatterplotLayer（GPU 逐个渲染）
 *  - 六边形 HexagonLayer（蜂窝聚合）
 *  - 网格   CPUGridLayer（网格聚合）
 *  - 点聚类 supercluster（按 zoom 自动合并，带数量文字）
 *
 * 模块挂载时接管共享 overlay 图层，卸载时恢复基准图层。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Supercluster from 'supercluster';
import { useMapStore } from '../store';
import { generateMassiveData, type ScatterDataItem } from '../utils/dataGenerator';
import { RTree } from '../utils/spatial';
import {
  createScatterDisplayLayer,
  createHexagonLayer,
  createGridLayer,
  createClusterLayers,
  type ClusterPoint,
} from '../layers/createAggregationLayers';

type AggMode = 'none' | 'hexagon' | 'grid' | 'cluster';

const MODES: { key: AggMode; label: string; desc: string }[] = [
  { key: 'none', label: '不聚合', desc: '全部点位直接渲染（无聚合，GPU 60fps）' },
  { key: 'hexagon', label: '六边形', desc: '蜂窝聚合，柱高+颜色=密度' },
  { key: 'grid', label: '网格', desc: '网格聚合，颜色=密度' },
  { key: 'cluster', label: '点聚类', desc: 'supercluster 按缩放合并成带数量点' },
];

const MapBigDataDemo: React.FC = () => {
  const mapReady = useMapStore((s) => s.mapReady);
  const [mode, setMode] = useState<AggMode>('cluster');
  const [visible, setVisible] = useState(true);
  const [clusterData, setClusterData] = useState<ClusterPoint[]>([]);
  /** 聚合半径（像素）：越大聚类越少、越粗，越小聚类越细 */
  const [clusterRadius, setClusterRadius] = useState(40);
  /** 当前地图 zoom（驱动六边形/网格聚合尺寸联动） */
  const [zoom, setZoom] = useState(11);
  /** 聚合粒度：六边形/网格的格子大小倍率 */
  const [aggScale, setAggScale] = useState(1);
  /** R-Tree 视口过滤开关（仅不聚合模式） */
  const [viewportFilter, setViewportFilter] = useState(false);
  /** R-Tree 查询出的视口内点 */
  const [filteredData, setFilteredData] = useState<ScatterDataItem[]>([]);
  /** 共享 overlay 的基准图层（进入时保存，离开时恢复） */
  const baseRef = useRef<any[] | null>(null);

  // 模拟 5 万 POI（模块内自持一份，与 MapView 基准层互不影响）
  const data = useMemo(() => generateMassiveData(50000), []);

  // R-Tree 空间索引（模块五：海量POI 视口过滤）
  // 用 bulkLoad 一次性建树（比逐个 insert 快），每个点退化为零面积 bbox
  const rtree = useMemo(() => {
    const tree = new RTree<ScatterDataItem>();
    tree.bulkLoad(
      data.map((p) => ({
        item: p,
        bbox: [p.longitude, p.latitude, p.longitude, p.latitude] as [
          number,
          number,
          number,
          number,
        ],
      })),
    );
    return tree;
  }, [data]);

  // supercluster 空间索引（radius 变化时重建）
  const clusterIndex = useMemo(() => {
    const idx = new Supercluster({ radius: clusterRadius, maxZoom: 16, minZoom: 3 });
    idx.load(
      data.map((d) => ({
        type: 'Feature' as const,
        properties: { value: d.value },
        geometry: { type: 'Point' as const, coordinates: [d.longitude, d.latitude] },
      })),
    );
    return idx;
  }, [data, clusterRadius]);

  // 点聚类模式：按当前视口+zoom 计算聚类
  // ⚠️ 用 moveend 而不是 move：move 在拖拽/缩放时每帧触发，
  //    每次都要重算 supercluster + setClusterData + 重建图层 → 卡死。
  //    moveend 只在"停下后"触发一次，流畅。
  useEffect(() => {
    if (mode !== 'cluster') return;
    const map = useMapStore.getState().map;
    if (!map) return;
    const update = () => {
      const b = map.getBounds();
      const clusters = clusterIndex.getClusters(
        [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        Math.floor(map.getZoom()),
      ) as any[];
      setClusterData(
        clusters.map((c) => ({
          longitude: c.geometry.coordinates[0],
          latitude: c.geometry.coordinates[1],
          count: c.properties.cluster ? c.properties.point_count : 1,
          isCluster: !!c.properties.cluster,
        })),
      );
    };
    update();
    map.on('moveend', update);
    return () => {
      map.off('moveend', update);
    };
  }, [mode, clusterIndex, mapReady]);

  // 订阅地图 zoom，让六边形/网格聚合尺寸随缩放联动
  // ⚠️ 用 zoomend 而不是 zoom：zoom 每帧触发会带动整个组件重渲染 → 卡顿。
  useEffect(() => {
    const map = useMapStore.getState().map;
    if (!map) return;
    const update = () => setZoom(map.getZoom());
    update();
    map.on('zoomend', update);
    return () => {
      map.off('zoomend', update);
    };
  }, [mapReady]);

  // R-Tree 视口过滤：开启时按当前视口 BBox 查询只保留可见点
  // ⚠️ 用 moveend 而不是 move：move 在拖拽/缩放时每帧触发，每次都要
  //    重建图层 + React 重渲染 → 卡顿；moveend 只在"停下后"触发一次，流畅。
  useEffect(() => {
    if (!viewportFilter) return;
    const map = useMapStore.getState().map;
    if (!map) return;
    const update = () => {
      const b = map.getBounds();
      const found = rtree.search([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      setFilteredData(found);
    };
    update();
    map.on('moveend', update);
    return () => {
      map.off('moveend', update);
    };
  }, [viewportFilter, rtree, mapReady]);

  // 构建当前模式的显示图层
  const displayLayers = useMemo(() => {
    // 格子尺寸随 zoom 联动：缩小（zoom 小）→ 格子大 → 聚合粗；放大 → 格子小 → 聚合细
    const aggSize = 800 * aggScale * Math.pow(2, 11 - zoom);
    switch (mode) {
      case 'none':
        // 开启 R-Tree 过滤时只渲染视口内的点，否则渲染全部
        return [createScatterDisplayLayer(viewportFilter ? filteredData : data)];
      case 'hexagon':
        return [createHexagonLayer(data, aggSize * 0.6)];
      case 'grid':
        return [createGridLayer(data, aggSize)];
      case 'cluster':
        // 聚类数据未算出时回退散点，避免点位瞬间消失
        return clusterData.length
          ? createClusterLayers(clusterData)
          : [createScatterDisplayLayer(data)];
      default:
        return [createScatterDisplayLayer(data)];
    }
  }, [mode, data, clusterData, zoom, aggScale, viewportFilter, filteredData]);

  // 挂载保存基准图层 / 卸载恢复基准图层（只在卸载时恢复一次）
  useEffect(() => {
    baseRef.current = useMapStore.getState().deckLayers ?? null;
    return () => {
      const o = useMapStore.getState().deckOverlay;
      if (o && baseRef.current) o.setProps({ layers: baseRef.current });
      baseRef.current = null;
    };
  }, []);

  // 图层随模式/可见性变化应用
  useEffect(() => {
    const s = useMapStore.getState();
    const overlay = s.deckOverlay;
    if (!overlay) return;
    const line = baseRef.current?.find((l: any) => l.id === 'line-layer');
    const layers = visible ? [...(line ? [line] : []), ...displayLayers] : line ? [line] : [];
    overlay.setProps({ layers });
  }, [displayLayers, visible]);

  return (
    <div className="h-full relative pointer-events-none">
      {/* 顶部控制面板 */}
      <div className="absolute top-20 left-20 z-10 max-w-[420px] bg-black/75 text-white p-4 rounded-lg text-sm font-mono pointer-events-auto">
        <div className="font-bold text-base mb-2">🚀 deck.gl 大数据渲染演示</div>
        <div className="mb-2 opacity-85">
          当前渲染：<strong>50,000</strong> 个点（模拟充电站 POI）
        </div>

        {/* 聚合方式切换 */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-3 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                mode === m.key ? 'bg-sky-500 text-white' : 'bg-white/15 hover:bg-white/25'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* R-Tree 视口过滤（仅不聚合模式，模块五空间索引演示） */}
        {mode === 'none' && (
          <div className="mb-3">
            <button
              onClick={() => setViewportFilter(!viewportFilter)}
              className={`px-3 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                viewportFilter ? 'bg-emerald-500 text-white' : 'bg-white/15 hover:bg-white/25'
              }`}
            >
              🌲 R-Tree 视口过滤 {viewportFilter ? '：开' : '：关'}
            </button>
            {viewportFilter && (
              <div className="text-[11px] opacity-80 mt-1">
                视口内 <strong className="text-emerald-400">{filteredData.length}</strong> /{' '}
                {data.length} 点
                {filteredData.length / data.length > 0.9 ? (
                  <div className="text-amber-400 mt-0.5">
                    👆 当前 zoom {zoom.toFixed(0)} 覆盖了几乎全部点——滚轮放大到{' '}
                    <strong>15 级以上</strong>，数量才会骤降
                  </div>
                ) : (
                  <div className="mt-0.5">拖动/缩放后数量自动更新（O(logN) 查询）</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 聚合半径滑块（仅点聚类模式） */}
        {mode === 'cluster' && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span>聚合半径（像素）</span>
              <span>{clusterRadius}px</span>
            </div>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={clusterRadius}
              onChange={(e) => setClusterRadius(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] opacity-60">
              <span>细（聚类多）</span>
              <span>粗（聚类少）</span>
            </div>
          </div>
        )}

        {/* 聚合粒度滑块（六边形/网格模式，格子大小倍率） */}
        {(mode === 'hexagon' || mode === 'grid') && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span>聚合粒度</span>
              <span>{aggScale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.5}
              value={aggScale}
              onChange={(e) => setAggScale(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] opacity-60">
              <span>细（格子小）</span>
              <span>粗（格子大）</span>
            </div>
          </div>
        )}

        {/* 总开关 */}
        <button
          onClick={() => setVisible(!visible)}
          className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer mb-3"
        >
          {visible ? '🙈 隐藏 POI' : '👁️ 显示 POI'}
        </button>

        {/* 当前模式说明 */}
        <div className="bg-white/10 p-3 rounded text-xs leading-relaxed">
          <div className="font-bold mb-1">
            💡 当前模式：{MODES.find((m) => m.key === mode)?.label}
          </div>
          {MODES.find((m) => m.key === mode)?.desc}
          <div className="mt-2 opacity-75">
            {mode === 'cluster'
              ? '缩放地图 → 聚类点自动合并/分裂'
              : '试试用鼠标拖拽缩放，感受流畅度'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapBigDataDemo;
