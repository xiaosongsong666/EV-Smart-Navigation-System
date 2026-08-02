/**
 * 🚗 EV 路径规划页面（路由 /ev-route）
 *
 * 公用地图由 Layout 常驻渲染（MapLibre + 底图/路网/3D + Deck.gl 层）。
 * 本模块不再自建地图，而是通过 useMapStore 拿到共享地图实例，
 * 只负责本模块的业务：选点、规划路线、画路线、导航模拟、转向指令。
 *
 * 卸载时清理本模块加的 Marker / 图层 / 事件，避免跨路由残留。
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { Map, Marker, type MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RoutePoint, RouteResult } from './types';
import { decodePolyline, fmtDist } from './utils';
import { useSimulation } from './hooks/useSimulation';
import { RoutePanel } from './components/RoutePanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useMapStore } from '../../store';

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
  // 共享地图（由 mapStore 提供，Layout 的公用地图常驻）
  const mapReady = useMapStore((s) => s.mapReady);
  const mapRef = useRef<Map | null>(null);
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

  pickingModeRef.current = pickingMode;

  // 共享地图就绪后：同步 mapRef + 挂起「点击地图选点」handler
  useEffect(() => {
    if (!mapReady) return;
    const m = useMapStore.getState().map;
    if (!m) return;
    mapRef.current = m;

    const onClick = (e: MapMouseEvent) => {
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
    };
    m.on('click', onClick);

    return () => {
      m.off('click', onClick);
    };
  }, [mapReady]);

  // 起点/终点 Marker
  const mkMarker = (color: string, label: string, pt: RoutePoint | null) => {
    const m = mapRef.current;
    if (!m || pt === null) return null;
    return new Marker({
      element: Object.assign(document.createElement('div'), {
        innerHTML: `<div class="${color} text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-md border-2 border-white">${label}</div>`,
      }),
    })
      .setLngLat([pt.lng, pt.lat])
      .addTo(m);
  };
  useEffect(() => {
    startMarker.current?.remove();
    startMarker.current = mkMarker('bg-emerald-500', '起点', startPoint) ?? null;
  }, [startPoint]);
  useEffect(() => {
    endMarker.current?.remove();
    endMarker.current = mkMarker('bg-red-500', '终点', endPoint) ?? null;
  }, [endPoint]);

  // 画路线（route-source / route-glow / route-line，id 与共享地图不冲突）
  const drawRoute = useCallback((coords: [number, number][]) => {
    const m = mapRef.current;
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

  // 调用后端 Valhalla 路径规划
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

  const sim = useSimulation({ mapRef, routeCoords, routeResult, drawRoute });

  // 卸载清理：移除 Marker / 路线图层 / 已行驶图层
  useEffect(() => {
    return () => {
      startMarker.current?.remove();
      endMarker.current?.remove();
      const m = mapRef.current;
      if (m) {
        ['route-line', 'route-glow', 'traveled-line'].forEach((id) => {
          if (m.getLayer(id)) m.removeLayer(id);
        });
        ['route-source', 'traveled-source'].forEach((id) => {
          if (m.getSource(id)) m.removeSource(id);
        });
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      {/* 模块内容局限在地图区域（顶部导航之下、底部导航之上），不遮挡地图操作 */}
      <div className="absolute inset-x-0 top-16 bottom-16 flex flex-col font-sans pointer-events-none">
        <div className="pointer-events-auto px-4">
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
        </div>
        <div className="flex-1 relative">
          {routeResult && routeResult.maneuvers.length > 0 && (
            <div className="absolute right-3 top-3 w-[280px] max-h-full overflow-y-auto bg-white/95 rounded-xl shadow-md p-3 text-sm pointer-events-auto">
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
        <p className="text-xs text-gray-400 text-center py-1">
          💡 规划路线后点「开始导航」→ 地图跟随小车行驶
        </p>
      </div>
    </ErrorBoundary>
  );
}
