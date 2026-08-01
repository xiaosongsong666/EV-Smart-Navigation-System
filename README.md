# 🚗 下一代车载 EV 智能导航系统

> **项目定位**：从前端主导的全栈车载项目，用于求职作品集核心展示
> **技术栈**：React 18 + TypeScript + MapLibre GL JS + Deck.gl + Zustand + Node.js + Valhalla
> **演示目标**：EV 路径规划 + 续航焦虑模式 + 离线缓存 + 海量 POI 渲染

一个面向智能座舱场景的电动汽车（EV）导航系统。基于开源地图渲染引擎 **MapLibre GL JS** 构建矢量瓦片地图引擎，用 **Deck.gl** 做 GPU 加速的海量数据可视化，接入 **Valhalla** 开源路由引擎实现路径规划，并为电动车用户设计了续航计算、充电策略、电量焦虑模式等差异化功能。

---

## ✨ 功能亮点

| 模块 | 说明 | 状态 |
|------|------|------|
| 🗺️ 地图引擎与可视化层 | MapLibre 矢量瓦片底图、数据驱动样式、3D 建筑、图层精细控制 | ✅ 已实现 |
| 🛣️ 路径规划引擎 | 接入 Valhalla 路由引擎，多 costing 模式、转向引导、路径渲染 | ✅ 已实现 |
| 🔋 EV 续航与充电策略 | 电池消耗模型、充电站推荐、续航可达范围、电量焦虑模式 | 📋 设计中 |
| 📴 离线地图缓存系统 | Service Worker + IndexedDB 瓦片缓存、Cache-First 策略 | 📋 设计中 |
| 📊 海量 POI 数据渲染 | Deck.gl GPU 渲染 + 空间索引，5 万+ 点保持 60fps | ✅ 已实现 |
| 🧭 导航交互与控制 | 目的地搜索、路线预览、导航 HUD、转向提示 | 🔄 部分实现 |
| 🚗 车辆状态模拟器 | 沿路径行驶模拟、速度/航向/电量实时动画 | 🔄 部分实现 |
| ⚙️ 设置与偏好系统 | 白天/夜间主题切换，后续支持单位、语言、焦虑阈值 | 🔄 部分实现 |

---

## 📋 目录

1. [系统架构](#1-系统架构)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [快速开始](#4-快速开始)
5. [功能模块详解](#5-功能模块详解)
6. [后端服务与 API](#6-后端服务与-api)
7. [开发路线图](#7-开发路线图)
8. [面试演示指南](#8-面试演示指南)
9. [文档](#9-文档)
10. [许可证](#10-许可证)

---

## 1. 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        前端（React 18 + TS）                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────────────┐  │
│  │ MapLibre  │  │  Deck.gl  │  │  Zustand  │  │ Service Worker │  │
│  │  GL JS    │  │  渲染层    │  │  状态管理  │  │  离线缓存*      │  │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └───────┬────────┘  │
│        └───────────────┴───────────────┴────────────────┘          │
│                           │ HTTP / WebSocket                        │
├───────────────────────────┼─────────────────────────────────────────┤
│                    后端（Node.js + Express）*                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────────────┐  │
│  │ Valhalla  │  │  充电站   │  │  EV 续航  │  │  瓦片代理服务   │  │
│  │ 路由引擎   │  │  POI 服务 │  │  计算服务  │  │  权限控制      │  │
│  └───────────┘  └───────────┘  └───────────┘  └────────────────┘  │
│                           │ Docker                                  │
│                    ┌───────────┐                                    │
│                    │  Valhalla │                                    │
│                    │  路由引擎  │                                    │
│                    └───────────┘                                    │
└─────────────────────────────────────────────────────────────────────┘
```
> `*` 表示设计中（规划阶段）的模块

**核心集成方式**：MapLibre 负责底图渲染与交互，Deck.gl 通过 `MapboxOverlay` 作为 MapLibre 的自定义图层注入，两者共享 WebGL 上下文、相机完全同步。地图实例、Deck.gl 叠加层、视口信息统一注册到 Zustand `mapStore`，供所有模块通过 `useMapStore` 全局访问。

---

## 2. 技术栈

### 前端
- **框架**：React 18 + TypeScript
- **构建工具**：Vite
- **地图引擎**：MapLibre GL JS 5.x（矢量/栅格瓦片、数据驱动样式、3D 建筑）
- **数据可视化**：Deck.gl 9.x（`ScatterplotLayer`、`LineLayer`、`MapboxOverlay`）
- **状态管理**：Zustand（`mapStore` 全局注册地图实例 / 视口 / Deck.gl 图层）
- **路由**：React Router DOM
- **UI**：Tailwind CSS + Ant Design 6 + Framer Motion
- **绘制工具**：maplibre-gl-draw
- **3D 支持**：Three.js（后续模块使用）

### 后端（规划）
- **运行时**：Node.js + Express
- **路由引擎**：Valhalla（Docker 部署，端口 8002）
- **实时通信**：WebSocket（车辆状态推送）

---

## 3. 项目结构

```
EV-Smart-Navigation-System/
├── docs/                          # 面试讲解文档
│   └── 模块一-地图引擎与可视化层-面试讲解.md
├── src/
│   ├── components/                # 通用组件
│   │   ├── MapView/               # 地图容器组件（MapLibre + Deck.gl）
│   │   │   ├── index.tsx          #   主组件（forwardRef 暴露 flyTo/getMap/toggleDark）
│   │   │   └── useMapInit.ts      #   地图初始化 + 图层控制 Hook
│   │   ├── LayerPanel/            # 浮动图层面板（显隐 + 透明度）
│   │   └── Layout/                # 主布局（顶部导航 + 底部 Tab + 全屏地图背景）
│   ├── pages/                     # 路由页面
│   │   ├── mapliberModel.tsx      #   地图引擎页（兼容导出）
│   │   ├── MapBigDataDemo.tsx     #   海量 POI 渲染演示页
│   │   └── Settings.tsx           #   设置页
│   ├── features/                  # 业务功能模块
│   │   └── ev-route/              # EV 路径规划 + 实时态势
│   │       ├── page.tsx           #   路径规划主页面
│   │       ├── components/        #   RoutePanel / ErrorBoundary
│   │       ├── hooks/             #   useSimulation 导航模拟动画
│   │       ├── types/             #   路径规划类型定义
│   │       └── utils/             #   polyline 解码 / 航向 / 距离计算
│   ├── layers/                    # 图层创建
│   │   ├── createMapLayers.ts     #   MapLibre 原生图层（路网/点/线/面/3D）
│   │   └── createDeckLayer.ts     #   Deck.gl 图层（散点/线段）
│   ├── config/                    # 配置
│   │   └── mapStyle.ts            #   底图样式（白天/夜间）+ 图层配置表
│   ├── store/                     # Zustand 状态管理
│   │   └── mapStore.ts            #   地图实例 / Deck.gl Overlay / 视口
│   ├── hooks/                     # 自定义 Hooks
│   │   └── useViewport.ts         #   视口同步 Hook
│   ├── utils/                     # 工具函数
│   │   ├── dataGenerator.ts       #   海量散点数据生成（模拟 POI）
│   │   └── geo.ts                 #   地理计算（ECEF 转换 / 墨卡托变换）
│   ├── types/                     # TypeScript 类型定义
│   │   ├── index.ts
│   │   └── map.ts                 #   视口 / BBox 类型
│   ├── router/index.tsx           # 路由配置
│   ├── App.tsx                    # 主应用组件
│   └── main.tsx                   # 应用入口
├── backend/                       # 后端项目（规划中）
│   ├── services/                  #   Valhalla 封装 / 续航计算 / 充电策略
│   ├── routes/                    #   路径规划 / 充电站 / EV 续航 / 瓦片代理
│   └── docker-compose.yml         #   Valhalla 部署
├── index.html
├── package.json
├── vite.config.ts                 # 开发端口 3000，@ 别名指向 src
└── tailwind.config.js
```

### 路由一览

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 地图引擎 | MapLibre 底图 + 图层控制 + Deck.gl 海量数据 |
| `/ev-route` | EV 路径规划 | Valhalla 路径规划 + 导航模拟 |
| `/bigdata` | 海量 POI | Deck.gl 大数据渲染对比演示 |
| `/settings` | 设置 | 主题切换等偏好设置 |

---

## 4. 快速开始

### 环境要求

- Node.js >= 18
- npm（或 pnpm）
- Docker Desktop（仅路径规划/后端功能需要）

### 启动前端

```bash
# 1. 安装依赖
npm install

# 2. 开发模式（默认 http://localhost:3000，自动打开浏览器）
npm run dev

# 3. 构建生产版本
npm run build

# 4. 预览构建结果
npm run preview

# 5. 类型检查 / 代码格式化
npm run type-check
npm run format
```

### 启动路径规划后端（Valhalla）

路径规划页（`/ev-route`）通过 `POST http://localhost:4000/api/valhalla/route` 请求路由结果，需要本地部署 Valhalla 服务：

```bash
cd backend
docker-compose up -d valhalla   # 启动 Valhalla 路由引擎（端口 8002）

# 下载中国路网数据并构建瓦片
# wget https://download.geofabrik.de/asia/china-latest.osm.pbf
# docker exec valhalla valhalla_build_tiles -c /conf/valhalla.json /data/china.osm.pbf
```

### 加载本地矢量瓦片（可选）

地图引擎页的路网图层从 `http://localhost:8080/data/output.json` 加载本地北京路网矢量瓦片。若未启动瓦片服务，底图与 Deck.gl 数据仍可正常显示。

---

## 5. 功能模块详解

### 5.1 🗺️ 模块一：地图引擎与可视化层 ✅

**MapView** 组件是整个应用的视觉基础，封装了 MapLibre GL JS 实例，负责瓦片加载、底图渲染、以及与 Deck.gl 的协调渲染。

**核心能力**：

- **底图加载与样式切换**：CartoDB 白天/夜间模式 + 天地图中文标注，通过 `map.setStyle()` 动态切换
- **数据驱动样式**：用 MapLibre Expressions 根据道路等级动态着色（高速橙红、主干道琥珀、次干道金色），道路宽度随缩放级别插值
- **图层精细控制**：浮动图层面板按「底图 / 路网 / 标注 / 区域 / 3D / Deck.gl」分组，每个图层支持显隐切换和透明度滑块
- **3D 建筑**：`fill-extrusion` 渲染三维建筑轮廓，支持俯仰视角
- **绘制工具**：集成 `maplibre-gl-draw`，支持点、线、面绘制
- **Deck.gl 同步**：通过 `MapboxOverlay` 注入，相机完全同步

**架构设计**：地图实例、Deck.gl Overlay、视口信息全部注册到 Zustand `mapStore`，任何模块都能通过全局 store 操作地图——这是后续路径渲染、充电站图层、空间索引过滤的基础。

> 演示话术参考：
> "我们基于 MapLibre GL JS 构建了地图引擎，这是目前车载领域最主流的开源地图渲染引擎。它原生支持矢量瓦片，相比栅格瓦片体积小 80%、支持动态样式切换、并且分辨率无关——在车机不同分辨率的屏幕上都能清晰显示。上层用 Deck.gl 做数据可视化，通过 MapboxOverlay 让两者共享同一个 WebGL 上下文。"

### 5.2 🛣️ 模块二：路径规划引擎 ✅

通过 Valhalla 开源路由引擎实现 EV 路径规划，前端 `features/ev-route/` 完整实现了规划交互闭环。

**核心能力**：

- **起终点选取**：支持地图点击选点 + 内置示例路线（天安门→鸟巢、海淀→朝阳、北京→天津）
- **多 costing 模式**：驾车 / 公交 / 步行 / 骑行 / 卡车
- **路径渲染**：解析 Valhalla 返回的 polyline，用「发光 + 实线」双层样式绘制，自动 `fitBounds` 到路线范围
- **转向引导（Turn-by-Turn）**：面板逐条展示导航指令，支持点击缩放定位
- **导航模拟**：车辆图标沿路径实时移动，平滑计算航向角、速度、剩余距离/时间，已行驶路段用绿色高亮，支持暂停 / 继续 / 倍速（1x/2x/5x/10x）

```typescript
// 核心类型（features/ev-route/types）
interface RouteResult {
  distance: number;              // 总距离（米）
  duration: number;              // 总时长（秒）
  geometry: string;              // polyline 编码
  maneuvers: { instruction: string; distance: number }[];  // 转向指令
}
```

### 5.3 🔋 模块三：EV 续航与充电策略 📋

项目差异化亮点。针对电动车特性增加续航计算和充电策略，**设计文档已完成，待开发**。

**规划功能**：

- 电池消耗模型：基础能耗 + 坡度修正 + 速度修正（风阻）+ 温度修正
- 充电站 POI 显示：颜色编码空闲状态（绿/黄/红）
- 续航可达范围圆：基于 Valhalla Isochrone API 生成路网可达范围
- 智能充电建议：绕路距离 / 充电功率 / 等待时间多目标优化
- **电量焦虑模式**：≤20% 温和警告 → ≤15% 询问是否充电 → ≤10% 强制导航到最近充电站

> 演示话术参考：
> "这是我们的核心差异化功能。传统导航给一条最短路径就结束了，但电动车用户真正担心的是——'我能不能开到？'我们做了三层保障：精确到路段的电池消耗预估；根据续航自动推荐充电站停靠点；当电量低于 20% 时自动进入焦虑模式，强制导航到最近充电站。"

### 5.4 📴 模块四：离线地图缓存系统 📋

车载场景下网络连接不稳定是常态。**设计文档已完成，待开发**。

**规划功能**：

- Service Worker 拦截瓦片请求，Cache-First 策略（缓存未命中再发网络请求）
- IndexedDB 瓦片缓存（含缩放级别索引、缓存大小限制、过期淘汰）
- 离线检测与状态指示器
- 瓦片预下载（WiFi 环境下框选区域下载 10-15 级瓦片）

### 5.5 📊 模块五：海量 POI 数据渲染 ✅

解决车载地图海量 POI 渲染的性能问题，展示「性能优化能力」。

**核心能力**：

- **GPU 实例化渲染**：Deck.gl `ScatterplotLayer` 一次绘制 5 万个散点（模拟充电站 POI），缩放平移保持 60fps
- **MapLibre vs Deck.gl 对比**：`/bigdata` 页面演示两种集成方式——纯 Deck.gl 渲染 vs MapLibre + Deck.gl 叠加（相机同步、事件穿透）
- **数据驱动着色**：随机值映射绿色→红色热力图渐变

**性能原理**：Deck.gl 把所有点数据打包成 Attribute Buffer 一次性上传 GPU，渲染时 GPU 并行处理顶点，CPU 完全解放；而 MapLibre 原生 circle 图层是 CPU 逐个计算样式，上万点就开始掉帧。

> 规划增强：R-Tree 空间索引按视口 BBox 动态过滤 + Web Worker 后台搜索，实现 10 万级 POI 不卡顿。

### 5.6 🧭 模块六：导航交互与控制 🔄

**已实现**：路线预览、开始导航切换、导航 HUD（剩余距离/时间、速度、航向、进度条）、转向指令列表。

**规划增强**：目的地搜索（防抖 300ms + 搜索建议）、多路线方案对比（推荐/最快/最省电）、偏航重路由、导航语音模拟、途经点管理。

### 5.7 🚗 模块七：车辆状态模拟器 🔄

**已实现**：`useSimulation` Hook 用 `requestAnimationFrame` 驱动车辆沿路径行驶，平滑计算航向角、实时更新速度/剩余里程，已行驶轨迹绿色高亮，支持暂停、倍速。

**规划增强**：后端 VehicleSimulator 服务通过 WebSocket 每秒推送车辆状态（位置/航向/速度/电量），前端 `IconLayer` 渲染带朝向的车辆图标，模拟控制台（启停/加速减速）。

### 5.8 ⚙️ 模块八：设置与偏好系统 🔄

**已实现**：地图白天/夜间主题切换（`mapStore` + `toggleDark` 联动）。

**规划增强**：公里/英里单位切换、中英文语言、电量焦虑阈值自定义、默认驾驶模式（Eco/Normal/Sport）、语音提示开关。

---

## 6. 后端服务与 API

### 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend (Vite) | 3000 | React 前端应用 |
| Valhalla (Docker) | 8002 | 路由引擎服务 |
| Node.js Backend | 4000 | API 封装 + 业务逻辑（规划） |
| 本地矢量瓦片 | 8080 | 北京路网瓦片（可选） |

### 核心 API（设计）

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/route/plan` | POST | EV 优化路径计算，返回完整路线 + 转向引导 |
| `/api/route/auto-charge` | POST | 自动规划含充电停靠的 EV 路线 |
| `/api/charging/stations` | GET | 获取视口范围内充电站 |
| `/api/ev-range/calculate` | POST | 计算路线续航消耗和预估 |
| `/api/ev-range/isochrone` | POST | 计算续航可达范围 |
| `/api/tiles/:z/:x/:y.pbf` | GET | 瓦片代理（带权限验证） |
| `ws://localhost:3001/ws` | WS | 车辆状态实时推送 |

> 详细请求/响应示例见项目设计文档 `EV智能导航系统-项目文档.md` 第 11 章。

---

## 7. 开发路线图

### 已完成 ✅
- [x] 地图引擎与可视化层（底图 / 图层控制 / 3D / Deck.gl 集成）
- [x] 路径规划引擎（Valhalla 集成 / 转向引导 / 导航模拟）
- [x] 海量 POI 渲染（5 万点 GPU 渲染演示）

### 进行中 🔄
- [ ] 导航交互完整闭环（搜索 / 多路线 / 偏航重路由）
- [ ] 车辆状态模拟器（WebSocket 后端推送）
- [ ] 设置面板完整化

### 规划中 📋
- [ ] EV 续航与充电策略（电池模型 / 充电站 / 电量焦虑模式）
- [ ] 离线地图缓存系统（Service Worker + IndexedDB）
- [ ] R-Tree 空间索引 + Web Worker
- [ ] PWA 支持与性能优化

---

## 8. 面试演示指南

**推荐演示流程（5-8 分钟）**：

1. 打开首页展示地图底图 → 切换白天/夜间样式（模块一）
2. 进入 `/ev-route`，选择示例路线 → 展示路径规划与转向指令（模块二）
3. 点击「开始导航」→ 车辆沿路行驶、速度/剩余里程实时更新（模块七）
4. 进入 `/bigdata` → 展示 5 万点 GPU 渲染流畅度（模块五）

**核心面试问题**（详见 `docs/模块一-地图引擎与可视化层-面试讲解.md`）：

- 为什么用矢量瓦片而不是栅格瓦片？
- MapLibre 和 Cesium 的区别？为什么车载场景选 MapLibre？
- 为什么 Deck.gl 渲染海量点不卡？MapLibre 原生图层卡在哪？
- A* 和 Dijkstra 的区别？Contraction Hierarchies 为什么快？
- 电池消耗模型考虑了哪些因素？
- 充电站推荐的优化目标是什么？

---

## 9. 文档

- [EV智能导航系统-项目文档.md](../项目设计/EV智能导航系统-项目文档.md) — 完整系统设计（架构 / 模块 / API / 数据模型 / 部署）
- [模块一-地图引擎与可视化层-面试讲解.md](./docs/模块一-地图引擎与可视化层-面试讲解.md) — 模块一面试复习文档（30+ 问答）

---

## 10. 许可证

MIT License
