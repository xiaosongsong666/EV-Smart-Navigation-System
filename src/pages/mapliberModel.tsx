/**
 * mapliberModel.tsx — 重新导出
 *
 * 原组件已拆分为:
 *   src/components/MapView/     (主组件)
 *   src/components/LayerPanel/  (图层面板)
 *   src/config/mapStyle.ts      (样式配置)
 *   src/layers/                 (图层创建)
 *   src/utils/                  (工具函数)
 *
 * 此文件保留向后兼容, 避免修改 Layout.tsx 的引用路径
 */
export { default, type MapliberHandle } from '../components/MapView';
