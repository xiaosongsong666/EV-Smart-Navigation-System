/**
 * 🔋 EV 续航与充电页面（路由 /ev-charging）
 *
 * 公用地图由 Layout 常驻渲染，本模块叠加面板操作共享地图（useMapStore）。
 * 业务流程：
 *   1. 选预设路线 → POST /api/valhalla/route → decodePolyline 得到 path
 *   2. 「开始模拟」→ WebSocket 发 sim:start{path, initialBattery, timeScale}
 *   3. 后端 VehicleSimulator 每秒算耗电 → 推送 vehicle_state
 *   4. 本页渲染车辆 Marker 跟随 + 实时电量/耗电/充电建议
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl, { Marker } from 'maplibre-gl';
import { useMapStore } from '../../store';
import { decodePolyline } from '../ev-route/utils';
import { createChargingLayer } from '../../layers/createChargingLayer';
import { useVehicleSocket } from './hooks/useVehicleSocket';
import ChargingPanel from './components/ChargingPanel';
import SimControls from './components/SimControls';
import StationDetail from './components/StationDetail';
import ChargingSuggestion from './components/ChargingSuggestion';
import type { ChargingStation, ChargingSuggestion as SuggestionData } from './types';

const API_BASE = 'http://localhost:4000';

/** 预设路线（s/e 为 [lng, lat]） */
const PRESETS: Record<string, { label: string; s: [number, number]; e: [number, number] }> = {
  a: { label: '天安门→鸟巢', s: [116.4074, 39.9042], e: [116.3911, 39.9917] },
  b: { label: '北京→天津', s: [116.4074, 39.9042], e: [117.205, 39.133] },
  c: { label: '海淀→国贸', s: [116.337, 39.956], e: [116.443, 39.921] },
};

/** 车辆箭头 Marker 元素 */
function createCarEl(heading: number) {
  const el = document.createElement('div');
  el.style.cssText = 'width:32px;height:32px;';
  el.innerHTML = `<div style="width:100%;height:100%;transform:rotate(${heading}deg);display:flex;align-items:center;justify-content:center;">
    <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:22px solid #22c55e;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))"></div>
  </div>`;
  return el;
}

export default function EVCharging() {
  const mapReady = useMapStore((s) => s.mapReady);
  const { connected, vehicleState, send } = useVehicleSocket();

  const [path, setPath] = useState<[number, number][]>([]);
  const [routeLabel, setRouteLabel] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [paused, setPaused] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(80);
  const [timeScale, setTimeScale] = useState(60);
  const carRef = useRef<Marker | null>(null);

  /* ---- 智能充电建议（模块三：电量不足时推荐沿途充电站）---- */
  const [suggestion, setSuggestion] = useState<SuggestionData | null>(null);
  const [selectedWaypoint, setSelectedWaypoint] = useState<ChargingStation | null>(null);
  /** 当前规划路线的起终点（auto-charge 用） */
  const [routeLocations, setRouteLocations] = useState<{ lat: number; lon: number }[] | null>(
    null,
  );
  /** 基础路线名（选途经点后拼接显示，避免重复堆叠） */
  const baseLabelRef = useRef('');
  /** 焦虑模式是否已触发（电量 ≤20% 只触发一次） */
  const anxietyTriggeredRef = useRef(false);

  /** 检查电量是否不足 → 调后端拿充电建议 */
  const checkCharging = useCallback(
    async (locations: { lat: number; lon: number }[], batteryOverride?: number) => {
      try {
        const r = await fetch(`${API_BASE}/api/ev-range/auto-charge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locations,
            batteryLevel: batteryOverride ?? batteryLevel,
            temperatureC: 25,
            threshold: 20,
          }),
        });
        const j = await r.json();
        if (j.code === 200) setSuggestion(j.data.needCharging ? j.data : null);
      } catch (e) {
        console.error('充电建议获取失败', e);
      }
    },
    [batteryLevel],
  );

  /* ---- 充电站图层（模块三：充电站 POI 显示）---- */
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);
  /** 共享 overlay 的基准图层（进入保存 / 离开恢复） */
  const baseRef = useRef<any[] | null>(null);

  // 拉取真实充电站（后端从 OSM 转换的静态 JSON）
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/charging/stations`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.code === 200) setStations(j.data.stations);
      })
      .catch((e) => console.error('充电站加载失败', e));
    return () => {
      cancelled = true;
    };
  }, []);

  // 把充电站图层加到共享 overlay；卸载时恢复基准图层
  useEffect(() => {
    if (!mapReady || stations.length === 0) return;
    const s = useMapStore.getState();
    const overlay = s.deckOverlay;
    if (!overlay) return;
    if (!baseRef.current) baseRef.current = s.deckLayers ?? null;
    const line = baseRef.current?.find((l: any) => l.id === 'line-layer');
    const chargingLayer = createChargingLayer(stations, (st) => setSelectedStation(st));
    overlay.setProps({ layers: line ? [line, chargingLayer] : [chargingLayer] });

    return () => {
      const o = useMapStore.getState().deckOverlay;
      if (o && baseRef.current) o.setProps({ layers: baseRef.current });
      baseRef.current = null;
    };
  }, [stations, mapReady]);

  /** 规划预设路线 */
  const planRoute = useCallback(
    async (key: string) => {
      const p = PRESETS[key];
      if (!p) return;
      baseLabelRef.current = p.label;
      setRouteLabel(p.label);
      setSelectedWaypoint(null);
      setSuggestion(null);
      // 记住起终点坐标（供 auto-charge 和途经点重路由用）
      const locations = [
        { lat: p.s[1], lon: p.s[0] },
        { lat: p.e[1], lon: p.e[0] },
      ];
      setRouteLocations(locations);
      try {
        const r = await fetch(`${API_BASE}/api/valhalla/route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locations, costing: 'auto' }),
        });
        const j = await r.json();
        if (j.code !== 200) throw new Error(j.message);
        setPath(decodePolyline(j.data.geometry));
        setSimulating(false);
        // 规划后检查电量是否不足 → 触发充电建议
        checkCharging(locations);
      } catch (e: any) {
        console.error('路线规划失败', e);
      }
    },
    [checkCharging],
  );

  /** 选充电站为途经点 → 重规划 origin→站→dest */
  const selectWaypoint = useCallback(
    async (station: ChargingStation) => {
      if (!routeLocations) return;
      setSelectedWaypoint(station);
      setRouteLabel(`${baseLabelRef.current} → 经${station.name}`);
      const locations = [
        routeLocations[0],
        { lat: station.position[1], lon: station.position[0] },
        routeLocations[1],
      ];
      try {
        const r = await fetch(`${API_BASE}/api/valhalla/route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locations, costing: 'auto' }),
        });
        const j = await r.json();
        if (j.code !== 200) throw new Error(j.message);
        setPath(decodePolyline(j.data.geometry));
        setSimulating(false);
      } catch (e: any) {
        console.error('途经点路线失败', e);
      }
    },
    [routeLocations],
  );

  /** 把路线画到共享地图 */
  useEffect(() => {
    if (!mapReady || path.length < 2) return;
    const m = useMapStore.getState().map;
    if (!m) return;
    ['route-line', 'route-glow'].forEach((id) => {
      if (m.getLayer(id)) m.removeLayer(id);
    });
    if (m.getSource('route-source')) m.removeSource('route-source');
    m.addSource('route-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: path },
      },
    });
    m.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route-source',
      paint: { 'line-color': '#22c55e', 'line-width': 8, 'line-opacity': 0.3, 'line-blur': 4 },
    });
    m.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route-source',
      paint: { 'line-color': '#22c55e', 'line-width': 4, 'line-opacity': 0.9 },
      layout: { 'line-join': 'round', 'line-cap': 'round' },
    });
    const b = new maplibregl.LngLatBounds();
    path.forEach((c) => b.extend(c as [number, number]));
    m.fitBounds(b, { padding: 60, maxZoom: 12 });
  }, [mapReady, path]);

  /** 车辆 Marker 跟随 WS 位置 */
  useEffect(() => {
    if (!mapReady || !vehicleState) return;
    const m = useMapStore.getState().map;
    if (!m) return;
    if (!carRef.current) {
      carRef.current = new Marker({ element: createCarEl(vehicleState.heading) })
        .setLngLat(vehicleState.position)
        .addTo(m);
    } else {
      carRef.current.setLngLat(vehicleState.position);
      const rot = carRef.current.getElement().querySelector('div');
      if (rot) rot.style.transform = `rotate(${vehicleState.heading}deg)`;
    }
    m.jumpTo({ center: vehicleState.position });
  }, [vehicleState, mapReady]);

  /** 到达终点 → 结束模拟 */
  useEffect(() => {
    if (vehicleState?.arrived) setSimulating(false);
  }, [vehicleState]);

  /** 电量焦虑模式：模拟中电量 ≤20% 自动触发充电建议（只触发一次） */
  useEffect(() => {
    if (!vehicleState || !routeLocations) return;
    const bl = vehicleState.batteryLevel;
    if (bl <= 20) {
      if (!anxietyTriggeredRef.current && !suggestion) {
        anxietyTriggeredRef.current = true;
        // 用实时电量调后端，推荐沿途充电站
        checkCharging(routeLocations, bl);
      }
    } else {
      anxietyTriggeredRef.current = false;
    }
  }, [vehicleState, routeLocations, suggestion, checkCharging]);

  /** 卸载清理：车辆 Marker + 路线图层 */
  useEffect(() => {
    return () => {
      carRef.current?.remove();
      const m = useMapStore.getState().map;
      if (m) {
        ['route-line', 'route-glow'].forEach((id) => {
          if (m.getLayer(id)) m.removeLayer(id);
        });
        if (m.getSource('route-source')) m.removeSource('route-source');
      }
    };
  }, []);

  const startSim = () => {
    if (!path.length) return;
    setSimulating(true);
    setPaused(false);
    send({ type: 'sim:start', path, initialBattery: batteryLevel, timeScale });
  };

  const togglePause = () => {
    setPaused((p) => {
      send(p ? { type: 'sim:resume' } : { type: 'sim:pause' });
      return !p;
    });
  };

  return (
    <div className="absolute inset-x-0 top-16 bottom-16 flex flex-col font-sans pointer-events-none">
      <div className="pointer-events-auto px-4 space-y-2 max-w-md">
        <SimControls
          connected={connected}
          hasPath={path.length > 0}
          simulating={simulating}
          paused={paused}
          batteryLevel={batteryLevel}
          timeScale={timeScale}
          presets={Object.entries(PRESETS).map(([k, v]) => ({ key: k, label: v.label }))}
          onSelectPreset={planRoute}
          onStart={startSim}
          onStop={() => {
            send({ type: 'sim:stop' });
            setSimulating(false);
          }}
          onTogglePause={togglePause}
          onSetBattery={(v) => {
            setBatteryLevel(v);
            send({ type: 'sim:set_battery', level: v });
          }}
          onTimeScale={setTimeScale}
        />
        <ChargingPanel state={vehicleState} connected={connected} />
        {suggestion && (
          <ChargingSuggestion
            suggestion={suggestion}
            selectedStationId={selectedWaypoint?.id ?? null}
            onSelectWaypoint={selectWaypoint}
          />
        )}
      </div>
      <div className="flex-1 relative">
        {routeLabel && (
          <div className="absolute right-3 top-3 px-3 py-2 bg-white/90 rounded-lg shadow text-sm pointer-events-auto">
            🗺️ 路线：{routeLabel}
          </div>
        )}

        {/* 充电站详情卡（点击地图上的充电站弹出） */}
        {selectedStation && (
          <StationDetail
            station={selectedStation}
            onClose={() => setSelectedStation(null)}
          />
        )}
      </div>
    </div>
  );
}
