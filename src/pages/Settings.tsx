/**
 * ⚙️ 设置与偏好系统（模块八）
 *
 * 所有设置项写入 useSettingsStore（Zustand + persist，见 src/store/settingsStore.ts）。
 * 修改地图主题后，Layout 的 useEffect 会自动同步地图样式。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Palette,
  Ruler,
  Globe,
  BatteryWarning,
  Gauge,
  Volume2,
  RotateCcw,
  HardDrive,
  Trash2,
} from 'lucide-react';
import { useSettingsStore } from '../store';
import { useOnline, getTileCacheStats, clearTileCache } from '../utils/offline';
import type { DrivingMode, Language, ThemeMode, Units } from '../types';

/** 字节数格式化成可读文本（B / KB / MB） */
function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const Settings: React.FC = () => {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const resetSettings = useSettingsStore((s) => s.resetSettings);

  /* ---- 离线缓存（模块四）：在线状态 + 缓存统计 + 清理 ---- */
  const online = useOnline();
  const [cacheStats, setCacheStats] = useState({ count: 0, sizeBytes: 0 });
  const [cleared, setCleared] = useState(false);

  const refreshStats = useCallback(async () => {
    setCacheStats(await getTileCacheStats());
  }, []);

  useEffect(() => {
    refreshStats();
    // 模拟行驶时瓦片持续入缓存，定时刷新统计
    const id = setInterval(refreshStats, 3000);
    return () => clearInterval(id);
  }, [refreshStats]);

  const handleClearCache = async () => {
    await clearTileCache();
    setCleared(true);
    refreshStats();
    setTimeout(() => setCleared(false), 2000);
  };

  return (
    <div className="space-y-6 pointer-events-auto">
      {/* 头部 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gradient mb-2">设置</h1>
        <p className="text-gray-600 dark:text-gray-300">个性化你的导航体验</p>
      </div>

      {/* 地图主题 */}
      <Card icon={<Palette className="w-6 h-6 text-purple-600" />} title="地图主题">
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { value: 'day', label: '白天', desc: '明亮清爽' },
              { value: 'night', label: '夜间', desc: '护眼暗色' },
              { value: 'high-contrast', label: '高对比', desc: '强光可读' },
            ] as { value: ThemeMode; label: string; desc: string }[]
          ).map((opt) => (
            <OptionBtn
              key={opt.value}
              active={settings.theme === opt.value}
              label={opt.label}
              desc={opt.desc}
              onClick={() => updateSettings({ theme: opt.value })}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">💡 主题切换会实时同步地图底图样式（白天/夜间）</p>
      </Card>

      {/* 距离单位 */}
      <Card icon={<Ruler className="w-6 h-6 text-blue-600" />} title="距离单位">
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { value: 'metric', label: '公里 km', desc: '米制' },
              { value: 'imperial', label: '英里 mi', desc: '英制' },
            ] as { value: Units; label: string; desc: string }[]
          ).map((opt) => (
            <OptionBtn
              key={opt.value}
              active={settings.units === opt.value}
              label={opt.label}
              desc={opt.desc}
              onClick={() => updateSettings({ units: opt.value })}
            />
          ))}
        </div>
      </Card>

      {/* 语言 */}
      <Card icon={<Globe className="w-6 h-6 text-emerald-600" />} title="语言">
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { value: 'zh', label: '中文', desc: '简体' },
              { value: 'en', label: 'English', desc: '英文' },
            ] as { value: Language; label: string; desc: string }[]
          ).map((opt) => (
            <OptionBtn
              key={opt.value}
              active={settings.language === opt.value}
              label={opt.label}
              desc={opt.desc}
              onClick={() => updateSettings({ language: opt.value })}
            />
          ))}
        </div>
      </Card>

      {/* 电量焦虑阈值 */}
      <Card icon={<BatteryWarning className="w-6 h-6 text-amber-600" />} title="电量焦虑阈值">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={10}
            max={30}
            step={5}
            value={settings.anxietyThreshold}
            onChange={(e) => updateSettings({ anxietyThreshold: Number(e.target.value) })}
            className="flex-1 accent-amber-500"
          />
          <span className="text-2xl font-bold text-amber-600 w-16 text-center">
            {settings.anxietyThreshold}%
          </span>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          电量低于该值时触发充电提醒：保守型用户可调高到 30%，老司机可调到 10%
        </p>
      </Card>

      {/* 默认驾驶模式 */}
      <Card icon={<Gauge className="w-6 h-6 text-rose-600" />} title="默认驾驶模式">
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { value: 'eco', label: '节能 Eco', desc: '续航优先' },
              { value: 'normal', label: '标准 Normal', desc: '均衡' },
              { value: 'sport', label: '运动 Sport', desc: '动力优先' },
            ] as { value: DrivingMode; label: string; desc: string }[]
          ).map((opt) => (
            <OptionBtn
              key={opt.value}
              active={settings.defaultDrivingMode === opt.value}
              label={opt.label}
              desc={opt.desc}
              onClick={() => updateSettings({ defaultDrivingMode: opt.value })}
            />
          ))}
        </div>
      </Card>

      {/* 语音提示 */}
      <Card icon={<Volume2 className="w-6 h-6 text-sky-600" />} title="导航语音提示">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">语音引导</h3>
            <p className="text-sm text-gray-600">转向时播报导航指令</p>
          </div>
          <button
            onClick={() => updateSettings({ voicePromptEnabled: !settings.voicePromptEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.voicePromptEnabled ? 'bg-sky-600' : 'bg-gray-300'
            }`}
            aria-pressed={settings.voicePromptEnabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.voicePromptEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* 离线缓存（模块四） */}
      <Card icon={<HardDrive className="w-6 h-6 text-slate-600" />} title="离线缓存">
        <div className="space-y-3">
          {/* 在线/离线状态 */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}
            />
            <span className={`text-sm ${online ? 'text-emerald-600' : 'text-amber-600'}`}>
              {online ? '在线 · 地图瓦片正常加载' : '离线 · 正在使用本地瓦片缓存'}
            </span>
          </div>

          {/* 缓存统计 */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-xl font-bold">{cacheStats.count}</div>
              <div className="text-xs text-gray-500">缓存瓦片数</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-xl font-bold">{formatBytes(cacheStats.sizeBytes)}</div>
              <div className="text-xs text-gray-500">占用空间</div>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            瓦片由 Service Worker 按 Cache-First 策略缓存，断网时地图底图仍可显示。
            缓存存于浏览器本地，与账号无关。
          </p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClearCache}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            清除瓦片缓存
            {cleared && <span className="text-xs opacity-90">（已清除）</span>}
          </motion.button>
        </div>
      </Card>

      {/* 重置 */}
      <div className="flex justify-center pb-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={resetSettings}
          className="flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          恢复默认设置
        </motion.button>
      </div>
    </div>
  );
};

/* ---------- 小组件 ---------- */

/** 毛玻璃卡片容器 */
function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        {icon}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

/** 选项按钮 */
function OptionBtn({
  active,
  label,
  desc,
  onClick,
}: {
  active: boolean;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-lg text-left transition-all ${
        active
          ? 'bg-purple-100 border-2 border-purple-500'
          : 'bg-white hover:bg-gray-50 border-2 border-transparent'
      }`}
    >
      <div className="font-medium">{label}</div>
      <div className="text-sm text-gray-600">{desc}</div>
    </motion.button>
  );
}

export default Settings;
