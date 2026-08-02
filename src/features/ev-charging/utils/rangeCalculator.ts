/**
 * 🔋 电池消耗模型（骨架实现）
 *
 * 简化版公式（可后续扩展精确参数）：
 *   基础能耗 = 距离 × 单位能耗(Wh/km)
 *   坡度修正 = 上坡增耗 - 下坡回收
 *   速度修正 = 高速风阻（与速度平方成正比）
 *   温度修正 = 低温电池效率下降
 */
import type { RangeInput, RangeResult } from '../types';

/** 电池容量（kWh），骨架里写死，后续可从车型配置读取 */
const BATTERY_CAPACITY_KWH = 60;

export function calcRange(input: RangeInput, batteryPercent: number): RangeResult {
  const { distanceKm, elevationGainM, elevationLossM, averageSpeedKph, temperatureC } = input;

  // 基础能耗：150 Wh/km
  const baseWh = distanceKm * 150;
  // 坡度修正：上坡 +0.8 Wh/m，下坡回收 -0.3 Wh/m
  const slopeWh = elevationGainM * 0.8 - elevationLossM * 0.3;
  // 速度修正：速度相对 80km/h 的平方比，高速风阻增加
  const speedWh = distanceKm * Math.pow(averageSpeedKph / 80, 2) * 20;
  // 温度修正：低于 15°C 时每公里多耗 10 Wh（低温电池效率下降）
  const tempWh = temperatureC < 15 ? distanceKm * 10 : 0;

  const consumptionKwh = (baseWh + slopeWh + speedWh + tempWh) / 1000;
  const regenKwh = Math.max(0, (elevationLossM * 0.3) / 1000);

  const remainingPercent = batteryPercent - (consumptionKwh / BATTERY_CAPACITY_KWH) * 100;

  return {
    consumptionKwh: Math.round(consumptionKwh * 100) / 100,
    regenKwh: Math.round(regenKwh * 100) / 100,
    remainingPercent: Math.max(0, Math.round(remainingPercent * 10) / 10),
    needCharging: remainingPercent <= 20,
  };
}
