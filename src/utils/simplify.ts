/**
 * ============================================================
 *  ✂️ Douglas-Peucker 轨迹抽稀 — 教学实现
 *  ============================================================
 *
 *  一、为什么需要它？
 *  GPS 航迹、路线点往往是几百上千个点，画在地图上 / 存储 / 传输都浪费。
 *  抽稀 = 在"保留形状"的前提下，去掉冗余点。比如 1000 个点抽到 100 个，
 *  看起来还是一条一样的路，但数据量少 90%。
 *
 *  二、算法原理（一句话）
 *  对一段 [首点, 尾点]：
 *    1. 找中间"离首尾连线最远"的点
 *    2. 如果这个最远距离 > 阈值 tolerance → 保留它，并递归处理"首→它"、"它→尾"两段
 *    3. 否则 → 说明这段路上的点都不重要，整段用一条直线（首尾）代替
 *
 *  三、用途
 *  你的军工"航迹回放"里就用它做轨迹压缩；本项目 ev-route 的路线也能抽稀。
 *
 *  面试话术："Douglas-Peucker 是 O(N log N) 的经典抽稀算法，
 *  递归找离基线最远的点，阈值控制保留多少形状细节。"
 * ============================================================
 */

/** 一个点：[lng, lat]（经纬度） */
export type LngLat = [number, number];

/**
 * 点到直线段的垂直距离（米）
 * 用叉积算"点到线段距离"，再换算成米。
 * 这里为了教学清晰，直接用经纬度近似（小范围内误差可忽略）。
 */
function pointToSegmentDistance(p: LngLat, a: LngLat, b: LngLat): number {
  // 线段向量和点向量
  const abX = b[0] - a[0];
  const abY = b[1] - a[1];
  const apX = p[0] - a[0];
  const apY = p[1] - a[1];

  // 投影比例 t：把点投影到线段 ab 上，t ∈ [0,1] 表示投影点在线段内
  const lenSq = abX * abX + abY * abY;
  let t = lenSq === 0 ? 0 : (apX * abX + apY * abY) / lenSq;
  t = Math.max(0, Math.min(1, t)); // 钳制到线段范围内

  // 投影点坐标
  const projX = a[0] + t * abX;
  const projY = a[1] + t * abY;

  // 点到投影点的距离（经纬度单位）
  const dx = p[0] - projX;
  const dy = p[1] - projY;
  // 粗略换算成"度"→"米"（1 度 ≈ 111km，这里取近似）
  return Math.sqrt(dx * dx + dy * dy) * 111000;
}

/**
 * Douglas-Peucker 轨迹抽稀（递归实现）
 * @param points   原始轨迹点 [lng, lat][]
 * @param tolerance 距离阈值（米）。越大抽得越狠，越小保留越精细
 * @returns 抽稀后的点（首尾点必保留）
 */
export function simplifyPath(points: LngLat[], tolerance: number): LngLat[] {
  if (points.length <= 2) return points.slice(); // 2 个点以下没必要抽

  // 结果容器：首点必留
  const result: LngLat[] = [points[0]];

  // 递归核心：处理 [start, end] 这一段，把该保留的点塞进 result
  const dp = (start: number, end: number) => {
    if (start + 1 >= end) return; // 没有中间点了

    // 找离首尾连线最远的中间点
    let maxDist = 0;
    let maxIndex = start;
    for (let i = start + 1; i < end; i++) {
      const d = pointToSegmentDistance(points[i], points[start], points[end]);
      if (d > maxDist) {
        maxDist = d;
        maxIndex = i;
      }
    }

    if (maxDist > tolerance) {
      // 这个点很重要，保留 → 递归处理"首→它"和"它→尾"
      dp(start, maxIndex);
      result.push(points[maxIndex]);
      dp(maxIndex, end);
    }
    // 否则：这段全用直线，中间的都不保留
  };

  dp(0, points.length - 1);
  result.push(points[points.length - 1]); // 尾点必留
  return result;
}

/**
 * 抽稀率辅助：返回抽稀前后点数的对比说明（面试/演示用）
 */
export function describeSimplify(points: LngLat[], tolerance: number): string {
  const simplified = simplifyPath(points, tolerance);
  const pct = ((simplified.length / points.length) * 100).toFixed(1);
  return `${points.length} → ${simplified.length} 点（保留 ${pct}%）`;
}

/* ============================================================
 *  自测：`runSimplifySelfTest()` 验证抽稀正确性
 *  一个直线段（应该抽掉所有中间点）+ 一个折线（应保留拐点）
 * ============================================================ */
export function runSimplifySelfTest(): boolean {
  // 1. 直线上的 5 个点 → 应该只剩首尾 2 个
  const straightLine: LngLat[] = [
    [116.0, 39.0],
    [116.1, 39.0],
    [116.2, 39.0],
    [116.3, 39.0],
    [116.4, 39.0],
  ];
  const straightResult = simplifyPath(straightLine, 50);
  const okStraight = straightResult.length === 2;

  // 2. 带拐角的折线 → 拐点应被保留（3 个点）
  const bentLine: LngLat[] = [
    [116.0, 39.0],
    [116.1, 39.0],
    [116.2, 39.05], // 拐点，离直线较远
    [116.3, 39.1],
    [116.4, 39.1],
  ];
  const bentResult = simplifyPath(bentLine, 30); // 小阈值，保留拐点
  const okBent = bentResult.length >= 3;

  // eslint-disable-next-line no-console
  console.log(
    `[DP 自测] 直线 ${straightLine.length}→${straightResult.length}（应=2）：${okStraight}；` +
      `折线 ${bentLine.length}→${bentResult.length}（应≥3 保留拐点）：${okBent}`,
  );
  return okStraight && okBent;
}
