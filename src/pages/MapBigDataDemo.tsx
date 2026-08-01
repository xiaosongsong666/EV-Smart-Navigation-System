/**
 * ============================================================
 *  📍 deck.gl 大数据渲染演示组件
 *  --------------------------------
 *  学习目标：
 *    1. 理解为什么 MapLibre 原生图层在处理海量数据时会卡顿
 *    2. 学会用 deck.gl 的 GPU 渲染来解决大数据性能问题
 *    3. 掌握 deck.gl 与 MapLibre 集成的两种方式
 * ============================================================
 */
import React, { useEffect, useRef, useState } from 'react';
import maplibregl, { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import DeckGL from '@deck.gl/react';
import { MapViewState } from '@deck.gl/core';
import { ScatterplotLayer } from '@deck.gl/layers';

// ============================================================
// 第一步：生成海量模拟数据
// 我们用北京区域随机生成 50,000 个点
// ============================================================
function generateMassiveData(count: number) {
  const data: { longitude: number; latitude: number; value: number }[] = [];
  for (let i = 0; i < count; i++) {
    data.push({
      // 北京范围：经度 115.4 ~ 117.5，纬度 39.4 ~ 41.1
      longitude: 115.4 + Math.random() * 2.1,
      latitude: 39.4 + Math.random() * 1.7,
      // longitude: BOUNDS.minLng + Math.random() * (BOUNDS.maxLng - BOUNDS.minLng),
      // latitude: BOUNDS.maxLat +  Math.random() * (BOUNDS.maxLat - BOUNDS.minLat),
      value: Math.random(), // 随机值，用来映射颜色
    });
  }
  return data;
}

// ============================================================
// 第二步：定义 deck.gl 图层
//
// ScatterplotLayer —— deck.gl 的散点图层
// 它的特点是：
//  - 用 GPU (WebGL) 绘制，上万数据丝毫不卡
//  - 每个点是一个几何体，canvas 上直接画出来
//  - 对比 MapLibre 的 circle 图层（CPU 逐个计算样式）
// ============================================================
function createDeckLayers(data: ReturnType<typeof generateMassiveData>) {
  return [
    new ScatterplotLayer<{
      longitude: number;
      latitude: number;
      value: number;
    }>({
      id: 'big-data-scatter',
      data,
      // 半径映射：把随机值映射到 100~500 米范围
      radiusScale: 50,
      getPosition: (d: { longitude: number; latitude: number; value: number }) => [
        d.longitude,
        d.latitude,
      ],
      getRadius: (d: { longitude: number; latitude: number; value: number }) => 100 + d.value * 4,
      getFillColor: (d: { longitude: number; latitude: number; value: number }) => {
        // 绿色 → 黄色 → 红色  热力图颜色渐变
        const v = d.value;
        return [Math.floor(v * 255), Math.floor((1 - v) * 255), 60, 180];
      },
      // 开启圆圈抗锯齿，边缘平滑
      stroked: true,
      getLineColor: [0, 0, 0, 50],
      getLineWidth: 1,
      // ⚠️ 关键性能参数：把点合并到一个绘制调用
      // 减少 GPU draw call，50,000 个点也能 60fps
      // （`_instanced` 为 deck.gl 内部实验性参数，TS 类型未收录，故断言 any）
      _instanced: true,
    } as any),
  ];
}

// ============================================================
// 初始视角 —— 定位到北京
// ============================================================
const INITIAL_VIEW_STATE: MapViewState = {
  longitude: 116.4,
  latitude: 40.0,
  zoom: 9,
  minZoom: 5,
  maxZoom: 16,
};

// ============================================================
// 方式一：纯 deck.gl 独立渲染（不需要 MapLibre）
// 适合纯数据可视化，不关心底图
// ============================================================
const PureDeckGLView = () => {
  const data = React.useMemo(() => generateMassiveData(50000), []);
  const layers = React.useMemo(() => createDeckLayers(data), [data]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL initialViewState={INITIAL_VIEW_STATE} controller={true} layers={layers} />
    </div>
  );
};

// ============================================================
// 方式二：deck.gl 作为 MapLibre 的叠加层（推荐方式）
//
// 🔥 重点：这是项目中实际最常用的集成方式！
//
// 原理：
//   1. MapLibre 负责底图（卫星图、路网、POI 标注等）
//   2. deck.gl 作为透明叠加层覆盖在上面，专门渲染大数据
//   3. 两者通过同步 viewState 来保持地图操作一致性
//
// 另一种集成方式：用 @deck.gl/mapbox 的 MapboxOverlay
//   这是 deck.gl 官方推荐，把 deck.gl 作为 MapLibre 的一个
//   custom layer 注入，相机完全同步，更优雅。
//   需要安装 npm i @deck.gl/mapbox
// ============================================================
const MaplibreWithDeckGL = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);

  // deck.gl 的视角状态，由 MapLibre 驱动
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 116.4,
    latitude: 40.0,
    zoom: 9,
  });

  // 生成 50,000 个点
  const data = React.useMemo(() => generateMassiveData(50000), []);
  const layers = React.useMemo(() => createDeckLayers(data), [data]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // 创建 MapLibre 实例
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      center: [116.4, 40.0],
      zoom: 9,
      style: {
        version: 8,
        sources: {
          //   tianditu_vec: {
          //     type: 'raster',
          //     tiles: ['/bigmap0/bigmap/tile/gettile/GoogleChinaMap/{z}/{x}/{y}'],
          //     tileSize: 256,
          //   },
          tianditu_vec: {
            type: 'raster',
            tiles: [
              'https://t0.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=be4bbd91e911191d869cf79dbc96bcc1',
            ],
            tileSize: 256,
          },
          tianditu_cva: {
            type: 'raster',
            tiles: [
              'https://t0.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=be4bbd91e911191d869cf79dbc96bcc1',
            ],
            tileSize: 256,
          },
        },
        layers: [
          { id: 'vec', type: 'raster', source: 'tianditu_vec' },
          { id: 'cva', type: 'raster', source: 'tianditu_cva' },
        ],
      },
    });

    // 🔥 关键：当用户拖拽/缩放 MapLibre 时，同步更新 deck.gl 的视角
    const onMove = () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      setViewState({
        longitude: center.lng,
        latitude: center.lat,
        zoom: map.current.getZoom(),
        pitch: map.current.getPitch(),
        bearing: map.current.getBearing(),
      });
    };

    map.current.on('move', onMove);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 底层：MapLibre 负责底图 */}
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/*
        上层：deck.gl 透明覆盖，渲染大数据点
        deck.gl 设置了 transparent 背景，所以底图能透出来
      */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none', // ⚠️ 让鼠标事件穿透到底层 MapLibre
        }}
      >
        <DeckGL
          viewState={viewState}
          layers={layers}
          // 不设 controller，由底图 MapLibre 处理交互
          controller={false}
        />
      </div>
    </div>
  );
};

// ============================================================
// 主组件：两种模式切换对比
// ============================================================
const MapBigDataDemo = () => {
  const [mode, setMode] = useState<'pure-deck' | 'maplibre-deck'>('pure-deck');

  return (
    <div style={{ width: '100%', height: '85vh', position: 'relative' }}>
      {/* ===== 顶部控制面板 ===== */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 10,
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          padding: '14px 20px',
          borderRadius: 8,
          fontSize: 14,
          maxWidth: 420,
          fontFamily: 'monospace',
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
          🚀 deck.gl 大数据渲染演示
        </div>
        <div style={{ marginBottom: 8, opacity: 0.85 }}>
          当前渲染：<strong>50,000</strong> 个散点
        </div>

        {/* 模式切换按钮 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            onClick={() => setMode('pure-deck')}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              background: mode === 'pure-deck' ? '#4fc3f7' : '#555',
              color: '#fff',
            }}
          >
            纯 deck.gl（无底图）
          </button>
          <button
            onClick={() => setMode('maplibre-deck')}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              background: mode === 'maplibre-deck' ? '#4fc3f7' : '#555',
              color: '#fff',
            }}
          >
            MapLibre + deck.gl
          </button>
        </div>

        {/* 知识点卡片 —— 学习重点 */}
        <div
          style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '10px 12px',
            borderRadius: 6,
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>💡 为什么 deck.gl 不卡？</div>
          <div>
            MapLibre circle 图层 → <strong>CPU</strong> 逐个计算样式，1 万个点就开始掉帧
            <br />
            deck.gl ScatterplotLayer → <strong>GPU</strong> 批量绘制，5 万个点依然 60fps
            <br />
            <span style={{ opacity: 0.7 }}>试试用鼠标拖拽缩放，感受流畅度</span>
          </div>
        </div>
      </div>

      {/* ===== 地图区域 ===== */}
      {mode === 'pure-deck' ? <PureDeckGLView /> : <MaplibreWithDeckGL />}
    </div>
  );
};

export default MapBigDataDemo;

/*
 * ============================================================
 * 📚 延伸学习
 * ============================================================
 *
 * 1️⃣ 更多 deck.gl 大数据图层：
 *    - ArcLayer        → 弧形连线（适合航班、轨迹）
 *    - HexagonLayer    → 蜂窝聚合热力图
 *    - ScreenGridLayer → 屏幕网格热力图（50万+ 点）
 *    - GeoJsonLayer    → 标准的 GeoJSON 图层（大数据版）
 *    - TextLayer       → 文字标注层（大量标签不卡）
 *
 * 2️⃣ 官方推荐的 MapLibre 集成方式（@deck.gl/mapbox）：
 *    npm i @deck.gl/mapbox
 *    import { MapboxOverlay } from '@deck.gl/mapbox';
 *    // 然后作为 map.addLayer(new MapboxOverlay({...})) 注入
 *    // 优点是相机完全同步，不需要手动 setViewState
 *
 * 3️⃣ 什么时候用 MapLibre 原生 vs deck.gl？
 *    MapLibre 原生:  < 5000 个要素，简单标注
 *    deck.gl:       > 10000 个要素，复杂 3D 可视化，动画
 * ============================================================
 */
