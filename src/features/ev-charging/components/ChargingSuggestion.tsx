/**
 * ⚡ 充电建议面板（模块三：智能充电建议）
 *
 * 电量不足以直达终点时显示沿途充电站列表，
 * 用户点「设为途经点」→ 重新规划经过该站的路线。
 */
import type { ChargingSuggestion, ChargingStation } from '../types';

const fmtKm = (km: number) => `${km.toFixed(1)} km`;

interface Props {
  suggestion: ChargingSuggestion;
  /** 当前选中的途经充电站 id（高亮 + 显示终点电量） */
  selectedStationId: string | null;
  onSelectWaypoint: (station: ChargingStation) => void;
}

export default function ChargingSuggestion({
  suggestion,
  selectedStationId,
  onSelectWaypoint,
}: Props) {
  return (
    <div className="pointer-events-auto px-4">
      <div className="bg-white/95 rounded-xl shadow-md p-3">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="m-0 text-[15px] font-bold">⚡ 充电建议</h3>
          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full">
            电量不足
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          直达需耗 {suggestion.direct.consumptionKwh} kWh，到达剩{' '}
          {suggestion.direct.remainingPercent}%（&lt;20%）—— 请选择沿途充电站
        </p>

        <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
          {suggestion.candidates.map((c) => {
            const selected = selectedStationId === c.station.id;
            return (
              <div
                key={c.station.id}
                className={`p-2 rounded-lg border transition-colors ${
                  selected ? 'bg-sky-50 border-sky-400' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center gap-2">
                  <div className="font-semibold text-sm truncate">{c.station.name}</div>
                  <button
                    onClick={() => onSelectWaypoint(c.station)}
                    className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                      selected
                        ? 'bg-sky-500 text-white'
                        : 'bg-sky-100 text-sky-600 hover:bg-sky-200'
                    }`}
                  >
                    {selected ? '✓ 已选' : '设为途经点'}
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>⚡{c.station.powerKw}kW</span>
                  <span>📏到站 {fmtKm(c.distToStationKm)}</span>
                  <span>🔋到达 {c.arriveBatteryPercent}%</span>
                  <span>⏱充 {c.chargingMinutes}min</span>
                  <span>↩️绕路 {fmtKm(c.detourKm)}</span>
                </div>
                {selected && (
                  <div className="text-xs text-sky-700 mt-1 bg-sky-100/70 rounded px-2 py-1">
                    途经该站充到 80% 后 → 到终点电量 <strong>{c.batteryAtDestPercent}%</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
