# 项目代码风格规范 (CODING_STYLE.md)

> 本文件定义 EV 智能导航系统的代码风格，后续所有模块按此规范编写。
> 目标：**可读、可维护、可测试**。别人打开任意文件 30 秒内能看懂"是干嘛的"。

---

## 1. 目录结构规范

```
src/
├── components/          # 组件 (一个组件一个文件夹)
│   └── MapView/
│       ├── index.tsx    # 组件入口
│       └── useMapInit.ts # 配套 Hook
├── config/              # 配置 (样式/常量/配置表)
│   └── mapStyle.ts
├── store/               # Zustand 状态
│   └── mapStore.ts
├── hooks/               # 通用自定义 Hook
│   └── useViewport.ts
├── layers/              # 地图图层创建
│   ├── createMapLayers.ts
│   └── createDeckLayer.ts
├── utils/               # 纯工具函数
│   ├── geo.ts
│   └── dataGenerator.ts
├── types/               # 类型定义
│   └── map.ts
└── features/            # 业务模块 (独立子目录)
    └── ev-route/
        ├── page.tsx
        ├── components/
        ├── hooks/
        └── types/
```

**规则**：
- 组件放 `components/`，页面放 `pages/`，业务模块放 `features/`
- 一个组件一个文件夹，统一 `index.tsx` 作为入口
- 组件的配套 Hook 放同文件夹（如 `MapView/useMapInit.ts`）
- 可复用的通用工具放 `utils/`，专属某模块的放模块内

---

## 2. 命名规范

| 类型 | 规则 | 正例 | 反例 |
|------|------|------|------|
| 组件 | PascalCase | `MapView` | `mapView` |
| Hook | `use` 前缀 + camelCase | `useMapInit` | `MapInit` |
| 函数 | camelCase + 动词开头 | `toggleVisibility` | `visChange` |
| 变量 | camelCase | `layerStates` | `layers_state` |
| 常量配置 | UPPER_SNAKE | `LAYER_CONFIG` | `layerConfig` |
| 类型/接口 | PascalCase | `Viewport` | `viewportType` |
| 布尔变量 | is/has/can/map 前缀 | `mapReady` | `ready` |
| 事件处理 | `handle` 前缀 | `handleToggle` | `onClick2` |
| 私有属性 | 下划线前缀 | `_instanced` | `instanced` |

**命名要表达意图**：
```typescript
// ❌ 不知道干嘛
const data = getData();

// ✅ 一看就懂
const visibleStations = rTree.search(viewport.bounds);
```

---

## 3. 组件设计原则

### 3.1 组件分层

```
容器组件 (编排)      ←→    纯展示组件 (UI)
- 管状态/逻辑       -     只管渲染
- import Hook/store  -     只接收 props
```

```typescript
// ✅ 容器组件: 管状态 + 回调
const MapView = () => {
  const [layerStates, setLayerStates] = useState({});
  const { toggleVisibility } = useMapInit({...});

  const handleToggle = (id) => {
    toggleVisibility(id);  // 操作地图
    setLayerStates(...);   // 更新 UI
  };

  return <LayerPanel states={layerStates} onToggle={handleToggle} />;
};

// ✅ 纯展示组件: 不碰地图/store
const LayerPanel = ({ states, onToggle }) => {
  return states.map(s => <button onClick={() => onToggle(s.id)} />);
};
```

**规则**：
- 展示组件**不允许** import 地图、store、业务逻辑
- 展示组件只通过 `props` 收数据，通过回调 `onXxx` 通知父组件
- 好处：展示组件易复用、易测试

### 3.2 组件只做编排

组件函数尽量短（< 80 行），逻辑抽到 Hook：
- 副作用 → 自定义 Hook
- 复杂计算 → 工具函数
- 纯展示 → 独立组件

---

## 4. Hook 设计原则

### 4.1 一个 Hook 管一类副作用

```typescript
// ✅ 按职责拆分
useMapInit()    // 地图生命周期 + 图层操作
useViewport()   // 读取视口
useCharging()   // 充电站查询 (后续)

// ❌ 把所有逻辑塞进一个 Hook
useEverything()  // 地图+充电站+路由+设置, 1000 行
```

### 4.2 Hook 命名即职责

`useXxx` 返回什么、管什么，名字要说清楚。

### 4.3 Hook 内部结构

```
1. 状态声明 (useState/useRef)
2. 回调定义 (useCallback)
3. 副作用 (useEffect) + 清理函数
4. 返回对象
```

```typescript
export function useMapInit({...}): ReturnType {
  // 1. 状态
  const mapRef = useRef<Map | null>(null);

  // 2. 回调
  const flyTo = useCallback((lng, lat) => {
    mapRef.current?.flyTo({...});
  }, []);

  // 3. 副作用 + 清理
  useEffect(() => {
    const map = new MapLibreMap({...});
    return () => { map.remove(); };  // 🔑 必须清理
  }, []);

  // 4. 返回
  return { flyTo, getMap, ... };
}
```

### 4.4 useCallback/useMemo 依赖

```typescript
const fn = useCallback(() => {...}, []);  // 依赖数组必填
// 空依赖 = 只创建一次 (引用稳定)
// 有依赖 = 依赖变化才重建
```

---

## 5. 状态管理规范

### 5.1 状态放哪

| 状态类型 | 放哪 | 例子 |
|---------|------|------|
| 组件局部 UI | `useState` | 面板开关 `panelOpen` |
| 跨组件共享 | Zustand store | 视口 `viewport` |
| 不触发渲染 | `useRef` | 地图实例 `map` |
| 跨模块全局 | Zustand store | map / deckOverlay |

### 5.2 Store 设计

```typescript
// ✅ 扁平结构 + 明确的 action
interface MapStore {
  map: Map | null;
  viewport: Viewport | null;
  setMap: (map) => void;
  updateViewport: (vp) => void;
}

// ❌ 深层嵌套, action 一堆逻辑
interface Store {
  mapState: { map, viewport, ready, ... };
  doSomething: () => { /* 20 行逻辑 */ };
}
```

### 5.3 事件回调里读 store

```typescript
// ✅ 非组件环境用 getState()
map.on('move', () => {
  useMapStore.getState().updateViewport(...);
});

// ❌ Hook 只能在组件顶层
map.on('move', () => {
  useMapStore();  // 报错! Hook 不能用在回调里
});
```

---

## 6. TypeScript 规范

### 6.1 类型定义

```typescript
// ✅ 复杂类型导出, 简单类型就近定义
export interface Viewport { center; zoom; pitch; bearing; bounds; }

// ✅ 联合类型表达有限值
type NavigationMode = 'free' | 'preview' | 'navigating';

// ✅ 泛型用于约束
export function useMapStore<T>(selector: (s) => T): T
```

### 6.2 避免 any

```typescript
// ❌ any 掩盖类型
const l: any = getLayer(id);

// ✅ 尽量具体 (私有 API 允许 as any, 但要加注释)
_instanced: true,  // 私有 API, as any 绕过类型检查
```

### 6.3 非空断言 `!`

```typescript
// 有明确保证时才用, 否则判空
map.current!.setStyle(...);  // 明确非空
map.current?.flyTo(...);     // 不确定, 可选链更安全
```

---

## 7. 注释规范

### 7.1 讲"为什么", 不讲"是什么"

```typescript
// ❌ 废话: 代码本身已表达
const map = createMap();  // 创建地图

// ✅ 有价值: 讲原因/坑/设计
_instanced: true,  // GPU 实例化: 5万点一个 draw call
setMap(map);       // 全局注册, 供模块二/三访问地图
```

### 7.2 文件头注释

```typescript
/**
 * useMapInit: 地图初始化 + 图层控制
 * - 创建 MapLibre 实例
 * - 添加原生/Deck.gl 图层
 * - 监听事件同步视口到 store
 */
```

### 7.3 函数 JSDoc

```typescript
/** 切换图层显隐
 * @param layerId 图层 id (与 LAYER_CONFIG 对应)
 * MapLibre 原生: setLayoutProperty / Deck.gl: clone+setProps
 */
```

### 7.4 分组注释

```typescript
// ===== 图层面板交互 =====
// ---- Ref 引用 ----
// ---- 地图初始化 ----
```

---

## 8. 性能相关规范

```typescript
// ① useMemo 缓存大计算
const data = useMemo(() => generate(50000), []);

// ② useCallback 稳定引用 (子组件不会反复重渲染)
const onToggle = useCallback((id) => {...}, []);

// ③ GPU 优先 (MapLibre Expressions / Deck.gl)
'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 15, 8];

// ④ 空间过滤 (海量数据按视口)
const visible = rTree.search(viewport.bounds);
```

---

## 9. 自检清单 (写完代码问自己)

- [ ] 这个文件只做一件事？
- [ ] 组件 < 80 行？函数 < 30 行？
- [ ] 纯展示组件没碰地图/store？
- [ ] 副作用在 Hook 里，且清理干净了？
- [ ] 命名表达意图了吗？
- [ ] 注释讲"为什么"不是"是什么"？
- [ ] 新需求要改几处？>2 处说明耦合了
- [ ] 有 `any` 吗？有的话有理由吗？
- [ ] 别人 30 秒能看懂这个文件？

---

## 10. 反面案例 (避免)

```typescript
// ❌ 大杂烩组件
const BigPage = () => {
  const [a, setA] = useState();
  const [b, setB] = useState();
  useEffect(() => { /* 地图逻辑 */ }, []);
  useEffect(() => { /* 数据逻辑 */ }, []);
  useEffect(() => { /* 其他逻辑 */ }, []);
  const handleClick = () => { /* 20行 */ };
  const handleMove = () => { /* 15行 */ };
  return <div>{/* 200 行 JSX */}</div>;
};

// ❌ 无意义注释
data.forEach(d => { ... });  // 遍历数据

// ❌ 命名不明
const do = () => {...};       // do 什么?
const x = getThing();         // x 是什么?

// ❌ 魔法数字
if (level <= 20) {...}        // 20 是什么? → 应命名 ANXIETY_THRESHOLD
```

---

## 附: 高频约定速记

```
组件 PascalCase / Hook use前缀 / 常量 UPPER
展示组件纯 props / 容器组件管状态
副作用进 Hook / 卸载必清理
配置驱动不写死 / 命名表达意图
注释讲为什么 / 避免 any / 避免魔法数字
```

> **核心心法**：代码是写给人看的，顺便让机器执行。可读性 > 炫技。你 3 个月后回来能看懂，同事能接手，就是好代码。
