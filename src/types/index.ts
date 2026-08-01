/**
 * 🚗 下一代车载 EV 智能导航系统 — 全局类型定义
 *
 * 历史说明：
 *  - src/types/map.ts 存放地图相关的 BBox / Viewport 类型
 *  - 本文件存放业务类型（设置 / 偏好等）
 */

/** 地图主题模式 */
export type ThemeMode = 'day' | 'night' | 'high-contrast';

/** 距离单位 */
export type Units = 'metric' | 'imperial';

/** 界面语言 */
export type Language = 'zh' | 'en';

/** 驾驶模式 */
export type DrivingMode = 'eco' | 'normal' | 'sport';

/** 应用偏好设置（模块八：设置与偏好系统） */
export interface AppSettings {
  /** 距离单位：公里/英里 */
  units: Units;
  /** 地图主题：白天/夜间/高对比度 */
  theme: ThemeMode;
  /** 界面语言：中文/英文 */
  language: Language;
  /** 电量焦虑触发阈值（%），默认 20 —— 电量低于此值触发充电提醒 */
  anxietyThreshold: number;
  /** 默认驾驶模式 */
  defaultDrivingMode: DrivingMode;
  /** 导航语音提示开关 */
  voicePromptEnabled: boolean;
}
