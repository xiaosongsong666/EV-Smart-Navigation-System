/**
 * 🎛️ 设置 Store（Zustand 学习示例）
 *
 * ═══════════════════════════════════════════════════════════════════
 *  📚 本文档是一份「Zustand 状态管理」教学示例，包含以下知识点：
 *
 *  1. create<T>()(...) —— 创建 store
 *  2. set()  / get()   —— 修改状态 / 读取状态
 *  3. persist 中间件    —— 状态持久化到 localStorage
 *  4. partialize       —— 只持久化部分字段（白名单）
 *  5. 派生选择器         —— 基于已有 state 计算新值
 *  6. 组件中使用 store   —— useSettingsStore(s => s.xxx) 精确订阅
 * ═══════════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, ThemeMode } from '../types';

/* ------------------------------------------------------------------ */
/* ① 默认值常量：新建 store 时的初始状态                                */
/* ------------------------------------------------------------------ */
const DEFAULT_SETTINGS: AppSettings = {
  units: 'metric',
  theme: 'day',
  language: 'zh',
  anxietyThreshold: 20, // 电量焦虑阈值，默认 20%
  defaultDrivingMode: 'normal',
  voicePromptEnabled: true,
};

/* ------------------------------------------------------------------ */
/* ② 定义 store 的「形状」：状态字段 + 操作方法                           */
/*    用 interface 声明，create<接口名>() 约束实现，保证类型安全          */
/* ------------------------------------------------------------------ */
interface SettingsStore {
  /** 当前偏好设置（整个对象作为一份 state） */
  settings: AppSettings;

  // ↓ 操作（actions）：组件调用这些方法来修改状态

  /** 部分更新设置：传入需要修改的字段，其余保持不变 */
  updateSettings: (partial: Partial<AppSettings>) => void;

  /** 重置为默认设置 */
  resetSettings: () => void;

  /** 切换地图主题（白天 ↔ 夜间），为 Layout 的切换按钮服务 */
  toggleTheme: () => void;
}

/**
 * ③ create<SettingsStore>()((set, get) => ({...})) 创建 store
 *
 *  - set：修改状态。两种写法：
 *      set({ 字段: 值 })                 → 整体覆盖式
 *      set((state) => ({ 字段: state.字段 + 1 }))  → 依赖旧值的函数式
 *  - get：在 action 内部读取当前 state（非订阅式）
 *
 * 本 store 只演示最简单的用法：整个 settings 对象作为一份 state，
 * updateSettings 用「展开合并」的方式做局部更新。
 */
export const useSettingsStore = create<SettingsStore>()(
  /**
   * ④ persist 中间件：把状态写入 localStorage
   *    刷新页面后状态自动恢复，实现「偏好记忆」。
   *    注意 create<接口>()(中间件(实现)) 的柯里化括号写法。
   */
  persist(
    (set, get) => ({
      /* ---- 初始状态 ---- */
      settings: DEFAULT_SETTINGS,

      /* ---- actions ---- */
      updateSettings: (partial) =>
        // 函数式 set：基于当前 state 做合并，而不是覆盖整个对象
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),

      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),

      toggleTheme: () => {
        const { settings } = get(); // get() 读取当前值
        const theme: ThemeMode = settings.theme === 'day' ? 'night' : 'day';
        // 复用 updateSettings，避免重复合并逻辑
        set({ settings: { ...settings, theme } });
      },
    }),
    {
      /* ---- 持久化配置 ---- */
      name: 'ev-nav-settings', // localStorage 的 key

      /**
       * ⑤ partialize：持久化白名单。
       *    默认 persist 会保存整个 state（包括函数）。
       *    这里只保存 settings 对象，函数不需要持久化（重建即可）。
       */
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
);

/* ------------------------------------------------------------------ */
/* ⑥ 派生选择器：不直接存，而是从已有 state 计算出来                      */
/*    这样「计算」只发生一次，数据源唯一，不会产生不同步的副本。            */
/* ------------------------------------------------------------------ */

/** 当前主题是否为「深色」—— 供地图引擎选择白天/夜间样式 */
export const selectIsDarkTheme = (s: SettingsStore) => s.settings.theme !== 'day';

/* ------------------------------------------------------------------ */
/* ⑦ 组件中如何消费这个 store                                          */
/*                                                                     */
/*  // 方式一：订阅单个字段（推荐，性能最好，字段变了才重渲染）            */
/*  const theme = useSettingsStore((s) => s.settings.theme);           */
/*                                                                     */
/*  // 方式二：解构整个 store（任意字段变化都会重渲染）                   */
/*  const { settings, updateSettings } = useSettingsStore();           */
/*                                                                     */
/*  // 方式三：派生选择器                                              */
/*  const isDark = useSettingsStore(selectIsDarkTheme);                */
/*                                                                     */
/*  // 在组件外（非 Hook 环境）获取/设置：                              */
/*  useSettingsStore.getState().updateSettings({ theme: 'night' });    */
/* ------------------------------------------------------------------ */
