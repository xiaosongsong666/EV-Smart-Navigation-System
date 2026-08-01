/**
 * 🗄️ Zustand store 汇总出口（barrel file）
 *
 * 统一从 @/store 导入，避免深路径：
 *   import { useMapStore, useSettingsStore } from '@/store';
 *
 *  - mapStore.ts      → 地图实例 / Deck.gl Overlay / 视口（全局地图状态）
 *  - settingsStore.ts → 用户偏好设置（含 Zustand 教学注释，见该文件）
 */
export * from './mapStore';
export * from './settingsStore';
