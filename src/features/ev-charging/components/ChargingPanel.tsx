/**
 * 🔋 实时电量面板：显示后端推送的电池/耗电/速度/剩余里程
 */
import type { VehicleState } from '../types';

const fmtKm = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m.toFixed(0)} m`);

export default function ChargingPanel({
  state,
  connected,
}: {
  state: VehicleState | null;
  connected: boolean;
}) {
  const battery = state?.batteryLevel;
  // 焦虑等级：≤10% 强制 / ≤20% 警告 / 其他正常
  const anxiety =
    battery === undefined ? 'normal' : battery <= 10 ? 'critical' : battery <= 20 ? 'warning' : 'normal';
  const barColor =
    anxiety === 'critical' ? 'bg-red-500' : anxiety === 'warning' ? 'bg-amber-500' : 'bg-emerald-500';
  const textColor = barColor.replace('bg-', 'text-');

  return (
    <div className="px-4 py-3 bg-white/95 rounded-xl shadow-md">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold m-0">🔋 EV 续航与充电</h2>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            connected ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
          }`}
        >
          {connected ? '● 实时连接' : '○ 未连接'}
        </span>
      </div>

      {!state ? (
        <p className="text-sm text-gray-500 mt-2">
          选择一条路线并「开始模拟」，实时查看电池消耗与充电建议
        </p>
      ) : (
        <div className="mt-2">
          {/* 电量 */}
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-bold ${textColor}`}>{battery}%</span>
            <span className="text-sm text-gray-500 mb-1">电量</span>
            {state.arrived && (
              <span className="mb-1 px-2 py-0.5 bg-sky-100 text-sky-600 text-xs rounded-full">
                ✅ 已到达
              </span>
            )}
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full ${barColor} transition-all duration-500`}
              style={{ width: `${battery ?? 0}%` }}
            />
          </div>

          {/* 指标 */}
          <div className="grid grid-cols-3 gap-2 mt-3 text-center text-sm">
            <div>
              <div className="font-bold">{state.consumptionKwh} kWh</div>
              <div className="text-xs text-gray-400">已耗电</div>
            </div>
            <div>
              <div className="font-bold">{state.speed} km/h</div>
              <div className="text-xs text-gray-400">速度</div>
            </div>
            <div>
              <div className="font-bold">{fmtKm(state.remainingDistance)}</div>
              <div className="text-xs text-gray-400">剩余里程</div>
            </div>
          </div>

          {/* 充电建议 / 焦虑告警 */}
          {anxiety !== 'normal' && (
            <div
              className={`mt-2 px-3 py-2 rounded-lg text-sm border ${
                anxiety === 'critical'
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}
            >
              {anxiety === 'critical'
                ? '⚠️ 电量 ≤10%，强制导航到最近充电站！'
                : '⚡ 电量 ≤20%，建议尽快充电'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
