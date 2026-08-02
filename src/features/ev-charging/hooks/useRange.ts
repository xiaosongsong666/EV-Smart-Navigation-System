/**
 * 🔋 续航计算 Hook（骨架）
 *
 * 后续接入：读取车辆状态（电量/车型）、Valhalla 路线海拔剖面，
 * 输入到 calcRange 得到剩余电量和是否需充电。
 */
import { useCallback } from 'react';
import { calcRange } from '../utils/rangeCalculator';
import type { RangeInput, RangeResult } from '../types';

export function useRange(initialBattery: number = 80) {
  const calculate = useCallback(
    (input: RangeInput): RangeResult => calcRange(input, initialBattery),
    [initialBattery],
  );

  return { calculate };
}
