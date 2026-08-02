/**
 * 🔋 模拟控制面板：选路线 / 开始停止 / 暂停 / 倍速 / 电量滑块
 */
interface RoutePreset {
  key: string;
  label: string;
}

interface Props {
  connected: boolean;
  hasPath: boolean;
  simulating: boolean;
  paused: boolean;
  batteryLevel: number;
  timeScale: number;
  presets: RoutePreset[];
  onSelectPreset: (key: string) => void;
  onStart: () => void;
  onStop: () => void;
  onTogglePause: () => void;
  onSetBattery: (level: number) => void;
  onTimeScale: (v: number) => void;
}

const TIME_SCALES = [1, 30, 60, 120];

export default function SimControls({
  connected,
  hasPath,
  simulating,
  paused,
  batteryLevel,
  timeScale,
  presets,
  onSelectPreset,
  onStart,
  onStop,
  onTogglePause,
  onSetBattery,
  onTimeScale,
}: Props) {
  return (
    <div className="px-4 py-3 bg-white/95 rounded-xl shadow-md mb-2">
      {/* 路线预设 */}
      <div className="flex gap-2 flex-wrap">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => onSelectPreset(p.key)}
            className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md cursor-pointer text-xs hover:bg-gray-200 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 模拟控制 */}
      <div className="flex gap-2 items-center mt-2 flex-wrap">
        <button
          onClick={onStart}
          disabled={!hasPath || !connected}
          className={`px-4 h-9 rounded-lg text-sm font-bold text-white border-none transition-colors ${
            hasPath && connected
              ? 'bg-emerald-500 hover:bg-emerald-600 cursor-pointer'
              : 'bg-emerald-300 cursor-not-allowed'
          }`}
        >
          {simulating ? '🔄 重新开始' : '🚗 开始模拟'}
        </button>

        {simulating && (
          <button
            onClick={onTogglePause}
            className="px-3 h-9 rounded-lg text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 cursor-pointer"
          >
            {paused ? '▶ 继续' : '⏸ 暂停'}
          </button>
        )}

        <button
          onClick={onStop}
          className="px-3 h-9 rounded-lg text-sm font-bold text-white bg-red-500 hover:bg-red-600 cursor-pointer"
        >
          ⏹ 停止
        </button>

        <select
          value={timeScale}
          onChange={(e) => onTimeScale(Number(e.target.value))}
          className="h-9 px-2 border border-gray-300 rounded-md text-sm bg-white outline-none"
        >
          {TIME_SCALES.map((s) => (
            <option key={s} value={s}>
              {s}× 倍速
            </option>
          ))}
        </select>

        {!connected && (
          <span className="text-xs text-red-500">⚠ 后端未连接（请启动 valhalla-bff）</span>
        )}
      </div>

      {/* 电量设置 */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-gray-600 whitespace-nowrap">起始电量</span>
        <input
          type="range"
          min={5}
          max={100}
          value={batteryLevel}
          onChange={(e) => onSetBattery(Number(e.target.value))}
          className="flex-1 accent-sky-500 cursor-pointer"
        />
        <span className="text-xs font-bold w-10 text-right">{batteryLevel}%</span>
      </div>
    </div>
  );
}
