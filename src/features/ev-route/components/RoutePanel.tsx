/**
 * 🚗 路径规划控制面板 — Tailwind
 */
import { RoutePoint, RouteResult, SimInfo, COSTING_OPTIONS } from '../types';
import { fmtDur, fmtDist } from '../utils';

interface Props {
  startPoint: RoutePoint | null;
  endPoint: RoutePoint | null;
  startInput: string;
  endInput: string;
  costing: string;
  pickingMode: 'start' | 'end' | null;
  isLoading: boolean;
  routeResult: RouteResult | null;
  error: string | null;
  isSimulating: boolean;
  isPaused: boolean;
  simSpeed: number;
  simProgress: number;
  simInfo: SimInfo;
  onStartInputChange: (v: string) => void;
  onEndInputChange: (v: string) => void;
  onCostingChange: (v: string) => void;
  onPickMode: (mode: 'start' | 'end' | null) => void;
  onPlanRoute: () => void;
  onStartSim: () => void;
  onStopSim: () => void;
  onTogglePause: () => void;
  onCycleSpeed: () => void;
  onDismissResult: () => void;
  onDismissError: () => void;
  onSetExample: (ex: string) => void;
}

export function RoutePanel(props: Props) {
  const {
    startPoint,
    endPoint,
    startInput,
    endInput,
    costing,
    pickingMode,
    isLoading,
    routeResult,
    error,
    isSimulating,
    isPaused,
    simSpeed,
    simProgress,
    simInfo,
  } = props;

  return (
    <div className="px-4 py-3 bg-white/95 rounded-xl shadow-md mb-2 z-10">
      {/* 标题 */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold m-0">🚗 EV 路径规划 + 实时态势</h2>
        <div className="flex gap-1.5">
          {[
            { ex: 'a', label: '天安门→鸟巢' },
            { ex: 'b', label: '海淀→朝阳' },
            { ex: 'c', label: '北京→天津' },
          ].map(({ ex, label }) => (
            <button
              key={ex}
              onClick={() => props.onSetExample(ex)}
              className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md cursor-pointer text-xs hover:bg-gray-200 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 输入行 */}
      <div className="flex gap-3 items-end flex-wrap">
        {/* 起点 */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold mb-1">📍 起点</label>
          <div className="flex gap-1">
            <input
              className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-md text-sm h-[38px] outline-none"
              placeholder="点击地图选点..."
              value={startInput}
              onChange={(e) => props.onStartInputChange(e.target.value)}
            />
            <PickBtn
              active={pickingMode === 'start'}
              color="green"
              onClick={() => props.onPickMode(pickingMode === 'start' ? null : 'start')}
            />
          </div>
        </div>
        {/* 终点 */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold mb-1">🏁 终点</label>
          <div className="flex gap-1">
            <input
              className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-md text-sm h-[38px] outline-none"
              placeholder="点击地图选点..."
              value={endInput}
              onChange={(e) => props.onEndInputChange(e.target.value)}
            />
            <PickBtn
              active={pickingMode === 'end'}
              color="red"
              onClick={() => props.onPickMode(pickingMode === 'end' ? null : 'end')}
            />
          </div>
        </div>
        {/* 通行方式 */}
        <div className="min-w-[120px]">
          <label className="block text-xs font-semibold mb-1">🚗 通行方式</label>
          <select
            value={costing}
            onChange={(e) => props.onCostingChange(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm h-[38px] bg-white outline-none"
          >
            {COSTING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={props.onPlanRoute}
          disabled={isLoading || !startPoint || !endPoint}
          className={`px-6 h-[38px] rounded-lg text-[15px] font-bold text-white border-none transition-colors ${isLoading || !startPoint || !endPoint ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'}`}
        >
          {isLoading ? '⏳ 规划中...' : '🔄 规划路线'}
        </button>
      </div>

      {/* 路径结果 */}
      {routeResult && (
        <div className="mt-2.5 px-3.5 py-2.5 bg-blue-50 rounded-lg border border-sky-200 flex gap-6 flex-wrap items-center">
          <span className="font-bold text-sky-700">📏 {fmtDist(routeResult.distance)}</span>
          <span className="font-bold text-sky-700">⏱ {fmtDur(routeResult.duration)}</span>
          <span className="font-bold text-sky-700">📍 {routeResult.maneuvers.length} 段</span>
          {!isSimulating ? (
            <button
              onClick={props.onStartSim}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-md cursor-pointer font-bold text-xs ml-auto transition-colors"
            >
              🚗 开始导航
            </button>
          ) : (
            <div className="flex gap-1.5 ml-auto">
              <SimBtn
                bg={isPaused ? '#f59e0b' : '#6b7280'}
                label={isPaused ? '▶ 继续' : '⏸ 暂停'}
                onClick={props.onTogglePause}
              />
              <SimBtn bg="#ef4444" label="⏹ 停止" onClick={props.onStopSim} />
              <SimBtn bg="#8b5cf6" label={`⚡ ${simSpeed}x`} onClick={props.onCycleSpeed} />
            </div>
          )}
          {isSimulating && (
            <div className="w-full">
              <div className="flex justify-between text-xs text-sky-700 mb-0.5">
                <span>🚗 {simInfo.speed} km/h</span>
                <span>🧭 {simInfo.bearing}°</span>
                <span>✅ {fmtDist(simInfo.traveled)}</span>
                <span>⏳ {fmtDist(simInfo.remaining)}</span>
                <span>⏱ {simInfo.remainingTime > 0 ? fmtDur(simInfo.remainingTime) : '到达'}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-100 ${isPaused ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${simProgress}%` }}
                />
              </div>
            </div>
          )}
          <button
            onClick={props.onDismissResult}
            className="bg-none border-none cursor-pointer text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="mt-2.5 px-3.5 py-2.5 bg-red-50 rounded-lg border border-red-200 text-red-600 text-sm flex items-center gap-3">
          <span className="flex-1">❌ {error}</span>
          <button
            onClick={props.onDismissError}
            className="bg-none border-none cursor-pointer text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function PickBtn({
  active,
  color,
  onClick,
}: {
  active: boolean;
  color: 'green' | 'red';
  onClick: () => void;
}) {
  const bg = active
    ? color === 'green'
      ? 'bg-emerald-500'
      : 'bg-red-500'
    : 'bg-gray-200 hover:bg-gray-300';
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 border-none rounded-md cursor-pointer text-xs font-semibold h-[38px] transition-colors ${bg} ${active ? 'text-white' : 'text-gray-700'}`}
    >
      {active ? '选点中' : '选点'}
    </button>
  );
}

function SimBtn({ bg, label, onClick }: { bg: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 text-white border-none rounded cursor-pointer text-xs font-bold"
      style={{ background: bg }}
    >
      {label}
    </button>
  );
}
