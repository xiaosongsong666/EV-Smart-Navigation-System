/**
 * ⚡ 充电站图层（模块三：EV 续航与充电）
 *
 * Deck.gl ScatterplotLayer，渲染真实充电站点位，颜色编码空闲状态：
 *  - 绿色  有空桩（充足）
 *  - 黄色  空闲比例 < 30%（紧张）
 *  - 红色  已满
 *
 * pickable + onClick：点充电站弹出详情。
 */
import { ScatterplotLayer } from '@deck.gl/layers';
import type { ChargingStation } from '../features/ev-charging/types';

/**
 * 构建充电站图层
 * @param stations 充电站数据（来自后端 /api/charging/stations）
 * @param onClick 点击某个充电站的回调（前端弹详情）
 */
export function createChargingLayer(
  stations: ChargingStation[],
  onClick: (station: ChargingStation) => void,
) {
  return new ScatterplotLayer({
    id: 'charging-layer',
    data: stations,
    getPosition: (d: ChargingStation) => d.position, // [lng, lat]
    // 快充桩画大一点，便于区分
    getRadius: (d: ChargingStation) => (d.isFastCharging ? 12 : 8),
    // 保证任何缩放下至少 4px，别变成不可见的亚像素
    radiusMinPixels: 4,
    getFillColor: (d: ChargingStation) => {
      const ratio = d.totalSpots > 0 ? d.availableSpots / d.totalSpots : 0;
      if (d.availableSpots === 0) return [255, 80, 80, 200]; // 红-满
      if (ratio < 0.3) return [255, 200, 0, 200]; // 黄-紧张
      return [0, 200, 100, 200]; // 绿-充足
    },
    stroked: true,
    getLineColor: [255, 255, 255, 180],
    getLineWidth: 1,
    pickable: true,
    onClick: (info: { object?: ChargingStation }) => {
      if (info.object) onClick(info.object);
    },
  } as any);
}
