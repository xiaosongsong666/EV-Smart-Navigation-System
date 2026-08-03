/**
 * ⚡ 充电站详情卡（点击地图上的充电站弹出）
 */
import type { ChargingStation } from '../types';

export default function StationDetail({
  station,
  onClose,
}: {
  station: ChargingStation;
  onClose: () => void;
}) {
  const ratio = station.totalSpots > 0 ? station.availableSpots / station.totalSpots : 0;
  const status =
    station.availableSpots === 0 ? '已满' : ratio < 0.3 ? '紧张' : '空闲';
  const statusColor =
    station.availableSpots === 0
      ? 'text-red-600'
      : ratio < 0.3
        ? 'text-amber-600'
        : 'text-emerald-600';

  return (
    <div className="absolute left-3 bottom-3 w-[260px] bg-white/95 rounded-xl shadow-lg p-4 text-sm pointer-events-auto">
      <div className="flex justify-between items-start">
        <h3 className="m-0 text-[15px] font-bold leading-snug">{station.name}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 cursor-pointer ml-2"
        >
          ✕
        </button>
      </div>
      <div className={`mt-1 font-medium ${statusColor}`}>● {status}</div>
      <div className="mt-2 space-y-1 text-xs text-gray-600">
        <div>🏷️ {station.brand}</div>
        <div>📍 {station.address}</div>
        <div>
          🔌 桩位 {station.availableSpots}/{station.totalSpots} · ⚡ {station.powerKw}kW
          {station.isFastCharging ? ' 快充' : ''}
        </div>
        <div>💰 {station.pricePerKwh} 元/度 · ⭐ {station.rating}</div>
        <div>🕐 {station.operatingHours}</div>
      </div>
    </div>
  );
}
