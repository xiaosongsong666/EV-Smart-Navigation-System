/** 散点数据结构 */
export interface ScatterDataItem {
  longitude: number;
  latitude: number;
  /** 0~1 随机值, 用于映射颜色 */
  value: number;
}

/**
 * 北京多个核心商圈中心（模拟充电站/POI 的真实疏密分布）
 * weight: 该中心占的点数权重；spread: 高斯分布的离散程度（度，越大越散）
 */
const BEIJING_CENTERS = [
  { lng: 116.397, lat: 39.909, weight: 0.3, spread: 0.02 }, // 王府井/天安门
  { lng: 116.461, lat: 39.908, weight: 0.25, spread: 0.025 }, // 国贸 CBD
  { lng: 116.316, lat: 39.984, weight: 0.2, spread: 0.022 }, // 中关村
  { lng: 116.47, lat: 39.996, weight: 0.15, spread: 0.018 }, // 望京
  { lng: 116.29, lat: 39.82, weight: 0.1, spread: 0.03 }, // 丰台/南城
];

/** 按权重随机选一个中心（weight 越大越常被选中） */
function pickBeijingCenter(): { lng: number; lat: number; weight: number; spread: number } {
  let r = Math.random();
  for (const c of BEIJING_CENTERS) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return BEIJING_CENTERS[0];
}

/** 标准正态分布随机数（Box-Muller 变换） */
function gaussianRandom(): number {
  const u1 = Math.max(Math.random(), 1e-9);
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * 生成模拟海量 POI（多中心高斯分布）
 *
 * 点集中在几个核心商圈，周边逐渐稀疏——这样聚合图才有
 * 「市中心热点 vs 郊区稀疏」的层次，而不是处处均匀填满。
 * @param count 生成数量
 */
export function generateMassiveData(count: number): ScatterDataItem[] {
  const data: ScatterDataItem[] = [];
  for (let i = 0; i < count; i++) {
    const c = pickBeijingCenter();
    data.push({
      longitude: c.lng + gaussianRandom() * c.spread,
      latitude: c.lat + gaussianRandom() * c.spread * 0.85,
      value: Math.random(),
    });
  }
  return data;
}
