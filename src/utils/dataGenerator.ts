/** 散点数据结构 */
export interface ScatterDataItem {
  longitude: number;
  latitude: number;
  /** 0~1 随机值, 用于映射颜色 */
  value: number;
}

/**
 * 在北京区域内生成随机散点 (模拟海量 POI)
 * @param count 生成数量
 */
export function generateMassiveData(count: number): ScatterDataItem[] {
  const data: ScatterDataItem[] = [];
  for (let i = 0; i < count; i++) {
    data.push({
      longitude: 115.4 + Math.random() * 2.1,
      latitude: 39.4 + Math.random() * 1.7,
      value: Math.random(),
    });
  }
  return data;
}
