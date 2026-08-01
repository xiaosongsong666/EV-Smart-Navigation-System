/**
 * 🚗 导航模拟动画 Hook
 *
 * 封装车标创建、requestAnimationFrame 循环、平滑航向、轨迹更新
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { Map, Marker } from 'maplibre-gl';
import { RouteResult, SimInfo } from '../types';
import { smoothBearing, calcBearing, calcDistance } from '../utils';

const BASE_DUR = 30; // 模拟总时长（秒）

interface Options {
  mapRef: React.MutableRefObject<Map | null>;
  routeCoords: [number, number][];
  routeResult: RouteResult | null;
  drawRoute: (coords: [number, number][]) => void;
}

export function useSimulation({ mapRef, routeCoords, routeResult, drawRoute }: Options) {
  const carMarker = useRef<Marker | null>(null);
  const animFrameId = useRef<number | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [simProgress, setSimProgress] = useState(0);
  const [simInfo, setSimInfo] = useState<SimInfo>({
    speed: 0,
    traveled: 0,
    remaining: 0,
    remainingTime: 0,
    bearing: 0,
  });

  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;
  const speedRef = useRef(simSpeed);
  speedRef.current = simSpeed;

  useEffect(
    () => () => {
      if (animFrameId.current !== null) cancelAnimationFrame(animFrameId.current);
      carMarker.current?.remove();
    },
    [],
  );

  const createCarArrow = (bearing: number) => {
    const root = document.createElement('div');
    root.style.cssText = 'position:relative;width:32px;height:32px;';
    const rot = document.createElement('div');
    rot.setAttribute('data-role', 'car-rot');
    rot.style.cssText =
      'width:100%;height:100%;transition:transform .12s linear;display:flex;align-items:center;justify-content:center;';
    rot.innerHTML = `<div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:22px solid #2563eb;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))"></div><div style="position:absolute;width:10px;height:10px;background:white;border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 0 4px rgba(0,0,0,0.3)"></div>`;
    rot.style.transform = `rotate(${bearing}deg)`;
    root.appendChild(rot);
    return root;
  };

  const updateTraveled = (m: Map, coords: [number, number][], progress: number) => {
    if (coords.length < 2) return;
    const cnt = Math.max(Math.floor(progress * coords.length), 2);
    const slice = coords.slice(0, cnt) as [number, number][];
    if (m.getSource('traveled-source')) {
      (m.getSource('traveled-source') as any).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: slice },
      });
    } else if (m.isStyleLoaded()) {
      m.addSource('traveled-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: slice },
        },
      });
      m.addLayer({
        id: 'traveled-line',
        type: 'line',
        source: 'traveled-source',
        paint: { 'line-color': '#22c55e', 'line-width': 6, 'line-opacity': 0.9 },
        layout: { 'line-join': 'round', 'line-cap': 'round' },
      });
    }
  };

  const start = useCallback(() => {
    const m = mapRef.current,
      coords = routeCoords,
      route = routeResult;
    if (!m || coords.length < 2 || !route) return;

    carMarker.current?.remove();
    const first = coords[0],
      second = coords[1];
    if (!first || !second) return;
    carMarker.current = new Marker({ element: createCarArrow(calcBearing(first, second)) })
      .setLngLat(first)
      .addTo(m);

    setIsSimulating(true);
    setIsPaused(false);
    setSimProgress(0);
    const totalDur = route.duration,
      segCount = coords.length - 1,
      startTime = performance.now();

    const animate = (now: number) => {
      if (!mapRef.current || isPausedRef.current) {
        animFrameId.current = requestAnimationFrame(animate);
        return;
      }
      const spd = speedRef.current;
      const progress = Math.min((now - startTime) / 1000 / (BASE_DUR / spd), 1);
      setSimProgress(Math.round(progress * 100));
      if (progress >= 1) {
        setIsSimulating(false);
        setSimInfo((p) => ({ ...p, speed: 0, remainingTime: 0 }));
        return;
      }

      const idx = progress * segCount;
      const segIdx = Math.min(Math.floor(idx), segCount - 1);
      const from = coords[segIdx],
        to = coords[segIdx + 1];
      if (!from || !to) {
        animFrameId.current = requestAnimationFrame(animate);
        return;
      }
      const frac = idx - segIdx;
      const lng = from[0] + (to[0] - from[0]) * frac,
        lat = from[1] + (to[1] - from[1]) * frac;
      if (isNaN(lng) || isNaN(lat)) {
        animFrameId.current = requestAnimationFrame(animate);
        return;
      }

      const bearing = smoothBearing(coords, idx, segCount);
      if (carMarker.current) {
        carMarker.current.setLngLat([lng, lat]);
        const rot = carMarker.current
          .getElement()
          .querySelector<HTMLElement>('[data-role="car-rot"]');
        if (rot) rot.style.transform = `rotate(${bearing}deg)`;
      }
      mapRef.current?.jumpTo({ center: [lng, lat] });

      const traveled = progress * route.distance,
        remaining = (1 - progress) * route.distance;
      const segDist = calcDistance(from, to) / 1000;
      setSimInfo({
        speed: Math.round((segDist / (BASE_DUR / spd / segCount)) * 3.6),
        traveled,
        remaining,
        remainingTime: Math.round(((1 - progress) * totalDur) / spd),
        bearing: Math.round(bearing),
      });
      updateTraveled(m, coords, progress);
      animFrameId.current = requestAnimationFrame(animate);
    };
    animFrameId.current = requestAnimationFrame(animate);
  }, [mapRef, routeCoords, routeResult]);

  const stop = useCallback(() => {
    if (animFrameId.current !== null) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    setIsSimulating(false);
    setIsPaused(false);
    setSimProgress(0);
    carMarker.current?.remove();
    carMarker.current = null;
    const m = mapRef.current;
    if (m) {
      ['traveled-line'].forEach((id) => {
        if (m.getLayer(id)) m.removeLayer(id);
      });
      if (m.getSource('traveled-source')) m.removeSource('traveled-source');
    }
    drawRoute(routeCoords);
  }, [mapRef, drawRoute, routeCoords]);

  return {
    isSimulating,
    isPaused,
    simSpeed,
    simProgress,
    simInfo,
    startSimulation: start,
    stopSimulation: stop,
    togglePause: useCallback(() => setIsPaused((p) => !p), []),
    cycleSpeed: useCallback(
      () =>
        setSimSpeed((p) => {
          const s = [1, 2, 5, 10];
          return s[(s.indexOf(p) + 1) % s.length];
        }),
      [],
    ),
  };
}
