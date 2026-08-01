/**
 * 🚗 EV 路径规划页面
 *
 * 所有子模块集中在 features/ev-route/ 下
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { Map, Marker, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RoutePoint, RouteResult } from './types';
import { decodePolyline, fmtDist } from './utils';
import { useSimulation } from './hooks/useSimulation';
import { RoutePanel } from './components/RoutePanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import MapLibreDraw from 'maplibre-gl-draw';
// ⬇️ DeckGL 通过 MapboxOverlay 集成到 MapLibre 中，实现相机联动
import { MapboxOverlay } from '@deck.gl/mapbox';
import { LineLayer } from '@deck.gl/layers';
const TD_VEC =
  'https://t0.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=be4bbd91e911191d869cf79dbc96bcc1';
const TD_CVA =
  'https://t0.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=be4bbd91e911191d869cf79dbc96bcc1';
const API_BASE = 'http://localhost:4000';
const EXAMPLES: Record<string, { s: RoutePoint; e: RoutePoint }> = {
  a: {
    s: { lat: 39.9042, lng: 116.4074, name: '天安门' },
    e: { lat: 39.9917, lng: 116.3911, name: '鸟巢' },
  },
  b: {
    s: { lat: 39.956, lng: 116.337, name: '海淀中关村' },
    e: { lat: 39.921, lng: 116.443, name: '朝阳国贸' },
  },
  c: {
    s: { lat: 39.9042, lng: 116.4074, name: '北京天安门' },
    e: { lat: 39.133, lng: 117.205, name: '天津之眼' },
  },
};

export default function EVRoutePlanner() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const startMarker = useRef<Marker | null>(null);
  const endMarker = useRef<Marker | null>(null);
  const pickingModeRef = useRef<'start' | 'end' | null>(null);

  const [startPoint, setStartPoint] = useState<RoutePoint | null>(null);
  const [endPoint, setEndPoint] = useState<RoutePoint | null>(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [costing, setCosting] = useState('auto');
  const [pickingMode, setPickingMode] = useState<'start' | 'end' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  pickingModeRef.current = pickingMode;
  const draw = useRef<MapLibreDraw | null>(null);
  // 初始化地图
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const m = new maplibregl.Map({
      container: mapContainer.current,
      center: [116.403874, 39.914885],
      zoom: 11,
      minZoom: 3,
      maxZoom: 18,
      style: {
        version: 8,
        sources: {
          tianditu_vec: { type: 'raster', tiles: [TD_VEC], tileSize: 256 },
          tianditu_cva: { type: 'raster', tiles: [TD_CVA], tileSize: 256 },
        },
        layers: [
          { id: 'vec', type: 'raster', source: 'tianditu_vec' },
          { id: 'cva', type: 'raster', source: 'tianditu_cva' },
        ],
      },
    });
    m.addControl(new NavigationControl(), 'top-right');
    m.on('click', (e) => {
      const mode = pickingModeRef.current;
      if (!mode) return;
      const pt: RoutePoint = {
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
        name: `${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}`,
      };
      if (mode === 'start') {
        setStartPoint(pt);
        setStartInput(pt.name);
        setPickingMode(null);
      } else {
        setEndPoint(pt);
        setEndInput(pt.name);
        setPickingMode(null);
      }
    });
    map.current = m;
    m.on('load', () => setMapReady(true));
    map.current.on('load', () => {
      // ----- 绘制工具（方便交互画图） -----
      draw.current = new MapLibreDraw({
        displayControlsDefault: true, //绘制图形的菜单按钮设置显示与隐藏
        controls: {
          point: true,
          line_string: true,
          polygon: true,
          trash: true,
        },
      });
      map.current!.addControl(draw.current! as any, 'top-left');
      map.current!.on('draw.create', (e) => {
        debugger;
        console.log('绘制完成，图形数据：', e.features);
      });

      // 2. 添加数据源  北京路网
      map.current!.addSource('my-local-tiles', {
        type: 'vector',
        url: 'http://localhost:8080/data/output.json',
      });

      // 3. 添加图层
      // --- 样式 A: 主干道 ---
      map.current!.addLayer({
        id: 'road-major',
        type: 'line',
        source: 'my-local-tiles',
        'source-layer': 'beijing',
        filter: ['in', 'fclass', 'motorway', 'trunk', 'primary'],
        paint: {
          'line-color': '#ff4d4f',
          'line-width': 2,
        },
      });

      // --- 样式 B: 普通街道 ---
      map.current!.addLayer({
        id: 'road-minor',
        type: 'line',
        source: 'my-local-tiles',
        'source-layer': 'beijing',
        filter: ['!in', 'fclass', 'motorway', 'trunk', 'primary'],
        paint: {
          'line-color': '#8c8c8c',
          'line-width': 1,
        },
      });

      // =============================================
      // 1️⃣ 点 (Point)
      // =============================================
      map.current!.addSource('source-point', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: '北京中心点' },
          geometry: {
            type: 'Point',
            coordinates: [116.403874, 39.914885],
          },
        },
      });

      map.current!.addLayer({
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

      map.current!.addLayer({
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

      // =============================================
      // 2️⃣ 天线 (LineString)  数据层
      // =============================================
      map.current!.addSource('source-line', {
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
      map.current!.addLayer({
        id: 'layer-line',
        type: 'line',
        source: 'source-line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#ffaa00',
          'line-width': 4,
          'line-dasharray': [0.5, 0.3],
        },
      });
      // 显示图标或者文字
      map.current!.addLayer({
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

      // =============================================
      // 3️⃣ 矩形 (Polygon)
      // =============================================
      map.current!.addSource('source-polygon', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: '矩形区域' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [116.355, 39.895],
                [116.385, 39.895],
                [116.385, 39.92],
                [116.355, 39.92],
                [116.355, 39.895],
              ],
            ],
          },
        },
      });

      map.current!.addLayer({
        id: 'layer-polygon-fill',
        type: 'fill',
        source: 'source-polygon',
        paint: {
          'fill-color': '#3388ff',
          'fill-opacity': 0.35,
        },
      });

      map.current!.addLayer({
        id: 'layer-polygon-outline',
        type: 'line',
        source: 'source-polygon',
        paint: {
          'line-color': '#3388ff',
          'line-width': 3,
        },
      });

      map.current!.addLayer({
        id: 'layer-polygon-label',
        type: 'symbol',
        source: 'source-polygon',
        layout: {
          'text-field': ['get', 'name'],
          'text-offset': [0, -1.5],
          'text-anchor': 'bottom',
          'text-size': 14,
        },
        paint: {
          'text-color': '#3388ff',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
      });

      // =============================================
      // 4️⃣ 三维图形 (fill-extrusion)
      // =============================================
      map.current!.addSource('source-3d', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: '三维大楼', height: 300 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [116.448, 39.898],
                [116.462, 39.898],
                [116.462, 39.91],
                [116.448, 39.91],
                [116.448, 39.898],
              ],
            ],
          },
        },
      });

      map.current!.addLayer({
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

      map.current!.addLayer({
        id: 'layer-3d-label',
        type: 'symbol',
        source: 'source-3d',
        layout: {
          'text-field': ['get', 'name'],
          'text-offset': [0, -2.5],
          'text-anchor': 'bottom',
          'text-size': 14,
        },
        paint: {
          'text-color': '#ff66cc',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
      });

      // 调整图层顺序
      map.current!.moveLayer('layer-3d');
      map.current!.moveLayer('layer-3d-label');
      map.current!.moveLayer('layer-polygon-fill');
      map.current!.moveLayer('layer-polygon-outline');
      map.current!.moveLayer('layer-polygon-label');

      // 加载 3D Tiles（必须在 style load 之后才能 addLayer）
      //   load3dtiles('https://pelican-public.s3.amazonaws.com/3dtiles/agi-hq/tileset.json', -300, map);

      // =============================================
      // ⬇️ Step 1: 定义数据（Feature）
      // =============================================
      const lineData = [
        { from: [116.397, 39.908] as [number, number], to: [116.407, 39.908] as [number, number] },
        { from: [116.397, 39.915] as [number, number], to: [116.407, 39.915] as [number, number] },
        { from: [116.397, 39.908] as [number, number], to: [116.397, 39.915] as [number, number] },
      ];

      // =============================================
      // ⬇️ Step 2: 基于数据创建图层（Layer）
      // =============================================
      const lineLayer = new LineLayer<{ from: [number, number]; to: [number, number] }>({
        id: 'line-layer',
        data: lineData,
        getSourcePosition: (d) => d.from,
        getTargetPosition: (d) => d.to,
        getColor: [255, 80, 80],
        getWidth: 5,
      });

      // =============================================
      // ⬇️ Step 3: 用图层构建 Overlay
      // =============================================
      const deckOverlay = new MapboxOverlay({
        layers: [lineLayer],
      });

      // =============================================
      // ⬇️ Step 4: Overlay 作为控件添加到地图
      //            MapLibre 自动调用 onAdd() 初始化，
      //            地图平移/缩放时 DeckGL 自动同步
      // =============================================
      map.current!.addControl(deckOverlay);
    });

    // 页面销毁时触发
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // 起点/终点 Marker
  const mkMarker = (color: string, label: string, pt: RoutePoint | null) => {
    if (!map.current) return null;
    if (pt === null) return null;
    return new Marker({
      element: Object.assign(document.createElement('div'), {
        innerHTML: `<div class="${color} text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-md border-2 border-white">${label}</div>`,
      }),
    })
      .setLngLat([pt.lng, pt.lat])
      .addTo(map.current);
  };
  useEffect(() => {
    startMarker.current?.remove();
    startMarker.current = mkMarker('bg-emerald-500', '起点', startPoint) ?? null;
  }, [startPoint]);
  useEffect(() => {
    endMarker.current?.remove();
    endMarker.current = mkMarker('bg-red-500', '终点', endPoint) ?? null;
  }, [endPoint]);

  // 画路线
  const drawRoute = useCallback((coords: [number, number][]) => {
    const m = map.current;
    if (!m || coords.length < 2) return;
    const doit = () => {
      ['route-line', 'route-glow'].forEach((id) => {
        if (m.getLayer(id)) m.removeLayer(id);
      });
      if (m.getSource('route-source')) m.removeSource('route-source');
      m.addSource('route-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      });
      m.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route-source',
        paint: { 'line-color': '#3b82f6', 'line-width': 8, 'line-opacity': 0.3, 'line-blur': 4 },
      });
      m.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-source',
        paint: { 'line-color': '#3b82f6', 'line-width': 4, 'line-opacity': 0.9 },
        layout: { 'line-join': 'round', 'line-cap': 'round' },
      });
      const b = new maplibregl.LngLatBounds();
      coords.forEach((c) => b.extend(c as [number, number]));
      m.fitBounds(b, { padding: 60, maxZoom: 14 });
    };
    m.isStyleLoaded() ? doit() : m.once('style.load', doit);
  }, []);
  useEffect(() => {
    drawRoute(routeCoords);
  }, [routeCoords, drawRoute]);

  // API
  const planRoute = useCallback(async () => {
    if (!startPoint || !endPoint) {
      setError('请设置起点终点');
      return;
    }
    setIsLoading(true);
    setError(null);
    setRouteResult(null);
    setRouteCoords([]);
    try {
      const r = await fetch(`${API_BASE}/api/valhalla/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: [
            { lat: startPoint.lat, lon: startPoint.lng },
            { lat: endPoint.lat, lon: endPoint.lng },
          ],
          costing,
        }),
      });
      if (!r.ok) throw new Error(`请求失败: ${r.status}`);
      const j = await r.json();
      if (j.code !== 200) throw new Error(j.message);
      const d = j.data as RouteResult;
      setRouteResult(d);
      setRouteCoords(decodePolyline(d.geometry));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [startPoint, endPoint, costing]);

  const sim = useSimulation({ mapRef: map, routeCoords, routeResult, drawRoute });

  return (
    <ErrorBoundary>
      <div className="h-[calc(100vh-200px)] flex flex-col font-sans">
        <RoutePanel
          startPoint={startPoint}
          endPoint={endPoint}
          startInput={startInput}
          endInput={endInput}
          costing={costing}
          pickingMode={pickingMode}
          isLoading={isLoading}
          routeResult={routeResult}
          error={error}
          isSimulating={sim.isSimulating}
          isPaused={sim.isPaused}
          simSpeed={sim.simSpeed}
          simProgress={sim.simProgress}
          simInfo={sim.simInfo}
          onStartInputChange={setStartInput}
          onEndInputChange={setEndInput}
          onCostingChange={setCosting}
          onPickMode={setPickingMode}
          onPlanRoute={planRoute}
          onStartSim={sim.startSimulation}
          onStopSim={sim.stopSimulation}
          onTogglePause={sim.togglePause}
          onCycleSpeed={sim.cycleSpeed}
          onDismissResult={() => {
            sim.stopSimulation();
            setRouteResult(null);
            setRouteCoords([]);
          }}
          onDismissError={() => setError(null)}
          onSetExample={(ex) => {
            const d = EXAMPLES[ex];
            if (d) {
              setStartPoint(d.s);
              setStartInput(d.s.name);
              setEndPoint(d.e);
              setEndInput(d.e.name);
            }
          }}
        />
        <div className="flex-1 flex gap-2 min-h-0">
          <div className="flex-1 rounded-xl overflow-hidden relative bg-gray-100">
            <div ref={mapContainer} className="w-full h-full" />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">地图加载中...</p>
                </div>
              </div>
            )}
          </div>
          {routeResult && routeResult.maneuvers.length > 0 && (
            <div className="w-[280px] bg-white/95 rounded-xl shadow-md p-3 overflow-y-auto text-sm">
              <h3 className="m-0 mb-2.5 text-[15px] font-bold">📋 导航指令</h3>
              {routeResult.maneuvers.map((m, i) => (
                <div
                  key={i}
                  className={`px-2.5 py-2 rounded-md mb-1.5 border-l-[3px] ${i === 0 ? 'bg-blue-50 border-l-blue-500' : 'bg-gray-50 border-l-gray-200'}`}
                >
                  <div className="font-semibold">
                    {i + 1}. {m.instruction}
                  </div>
                  <div className="text-gray-500 text-xs">{fmtDist(m.distance)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-400 text-center py-1">
          💡 规划路线后点「开始导航」→ 地图跟随小车行驶
        </p>
      </div>
    </ErrorBoundary>
  );
}
