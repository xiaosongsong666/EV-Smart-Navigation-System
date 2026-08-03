/**
 * 🔋 EV 续航与充电 — 类型定义
 *
 * 对应设计文档「模块三：EV 续航与充电策略」。
 */

/** 充电站 */
export interface ChargingStation {
  id: string;
  name: string;
  position: [number, number]; // [lng, lat]
  address: string;
  brand: string; // 品牌：特来电 / 星星 / 国网等
  totalSpots: number; // 总桩位数
  availableSpots: number; // 空闲桩位数
  powerKw: number; // 充电功率 kW
  pricePerKwh: number; // 每度电价格 元
  connectorTypes: string[]; // 接口：GB/T, CCS, CHAdeMO
  isFastCharging: boolean; // 是否快充
  rating: number; // 评分
  operatingHours: string; // 营业时间
}

/** 续航计算输入 */
export interface RangeInput {
  distanceKm: number; // 路段距离 km
  elevationGainM: number; // 海拔上升 m
  elevationLossM: number; // 海拔下降 m
  averageSpeedKph: number; // 平均速度 km/h
  temperatureC: number; // 环境温度 °C
}

/** 续航计算输出 */
export interface RangeResult {
  consumptionKwh: number; // 耗电量 kWh
  remainingPercent: number; // 到末端剩余电量 %
  regenKwh: number; // 能量回收 kWh
  needCharging: boolean; // 是否建议充电
}

/** 电量焦虑等级 */
export type AnxietyLevel = 'normal' | 'warning' | 'critical';

/** 智能充电建议的一个候选站（后端 /api/ev-range/auto-charge 返回） */
export interface ChargingCandidate {
  station: ChargingStation;
  detourKm: number; // 绕路距离 km
  distToStationKm: number; // 到站路程 km
  timeToStationS: number; // 到站时间 s
  arriveBatteryPercent: number; // 到站剩余电量 %
  chargingMinutes: number; // 预计充电时长 min
  batteryAtDestPercent: number; // 充到 80% 后到终点电量 %
}

/** 智能充电建议结果 */
export interface ChargingSuggestion {
  needCharging: boolean;
  direct: {
    distanceKm: number;
    consumptionKwh: number;
    remainingPercent: number;
    insufficient: boolean;
  };
  candidates: ChargingCandidate[];
}

/** 车辆实时状态（后端 VehicleSimulator 通过 WebSocket 每秒推送） */
export interface VehicleState {
  position: [number, number]; // [lng, lat]
  heading: number; // 航向 0-360
  speed: number; // km/h
  batteryLevel: number; // 电量 %
  consumptionKwh: number; // 累计耗电 kWh
  remainingDistance: number; // 剩余距离 m
  remainingTime: number; // 剩余时间 s
  needCharging: boolean; // 是否建议充电
  arrived: boolean; // 是否到达
  timestamp: number;
}

/** WebSocket 服务端消息 */
export type WsServerMessage =
  | { type: 'vehicle_state'; data: VehicleState }
  | { type: 'sim:started'; data?: { totalDistanceM: number } }
  | { type: 'sim:paused' }
  | { type: 'sim:resumed' }
  | { type: 'sim:stopped' }
  | { type: 'error'; message: string };

/** WebSocket 客户端消息 */
export type WsClientMessage =
  | { type: 'sim:start'; path: [number, number][]; initialBattery: number; timeScale?: number }
  | { type: 'sim:pause' }
  | { type: 'sim:resume' }
  | { type: 'sim:stop' }
  | { type: 'sim:set_battery'; level: number };
