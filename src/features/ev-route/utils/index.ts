/** 🗺️ EV 路径规划 — 地理计算工具 */

export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0,
    lat = 0,
    lng = 0;
  while (index < encoded.length) {
    let b: number,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lng / 1e6, lat / 1e6]);
  }
  return points;
}

export function calcBearing(from: [number, number], to: [number, number]): number {
  const [lng1, lat1] = from.map((d) => (d * Math.PI) / 180);
  const [lng2, lat2] = to.map((d) => (d * Math.PI) / 180);
  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function calcDistance(from: [number, number], to: [number, number]): number {
  const [lng1, lat1] = from.map((d) => (d * Math.PI) / 180);
  const [lng2, lat2] = to.map((d) => (d * Math.PI) / 180);
  const dlat = lat2 - lat1,
    dlng = lng2 - lng1;
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function smoothBearing(coords: [number, number][], idx: number, segs: number): number {
  const segIdx = Math.min(Math.floor(idx), segs - 1);
  const from = coords[segIdx],
    to = coords[segIdx + 1];
  if (!from || !to) return 0;
  const cur = calcBearing(from, to);
  const frac = idx - segIdx;
  if (frac > 0.8 && segIdx + 2 < coords.length) {
    const next = calcBearing(coords[segIdx + 1], coords[segIdx + 2]);
    const t = (frac - 0.8) / 0.2;
    let d = next - cur;
    if (d > 180) d -= 360;
    else if (d < -180) d += 360;
    return (cur + d * t + 360) % 360;
  }
  return cur;
}

export function fmtDur(s: number) {
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60);
  return h ? `${h}小时${m}分钟` : `${m}分钟`;
}

export function fmtDist(km: number) {
  return km >= 1 ? `${km.toFixed(1)} 公里` : `${(km * 1000).toFixed(0)} 米`;
}
