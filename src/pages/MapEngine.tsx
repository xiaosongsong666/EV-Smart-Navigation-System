/**
 * 🗺️ 地图引擎模块（路由 /）
 *
 * 说明：公用地图（MapLibre 底图 + 图层）由 Layout 常驻渲染，
 * 本页只叠加一段提示文案；图层面板 LayerPanel 由 Layout 按路由
 * 传给 MapView（仅 / 路由显示），因此这里不需要再渲染地图。
 */
export default function MapEngine() {
  return (
    <div className="h-full flex flex-col items-center justify-end pb-4">
      <p className="px-4 py-2 text-xs text-gray-500 bg-white/80 backdrop-blur rounded-full shadow">
        🗺️ 地图引擎 · 点击右上角「图层控制」按钮切换图层显隐与透明度
      </p>
    </div>
  );
}
