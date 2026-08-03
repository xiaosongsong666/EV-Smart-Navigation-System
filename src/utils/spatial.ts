/**
 * ============================================================
 *  🌳 R-Tree 空间索引 — 教学实现（模块五：海量 POI 渲染的配套）
 *  ============================================================
 *
 *  一、为什么需要它？
 *  地图上要显示几十万 POI。如果每个都遍历一遍判断"在不在视口内"，
 *  那是 O(N)，数据一多就卡。R-Tree 用一棵平衡树把空间切分，
 *  查询"某个范围内的元素"只需 O(log N)。
 *
 *  二、核心思想（先理解这个，再读代码）
 *  - 每个节点维护一个「包围盒 bbox」（能包住它所有子元素的最小矩形）
 *  - 叶子节点：直接存数据条目（item + item 的 bbox）
 *  - 内部节点：存子节点，bbox = 所有子节点 bbox 的并集
 *  - 查询：从根往下，凡是"bbox 和查询框不相交"的子树整个剪掉
 *
 *  三、和你项目的关系
 *  设计文档里规划它做「海量 POI 视口过滤」——只渲染当前视口内的点，
 *  而不是把所有点都传给 GPU。MapBigDataDemo 里我接了它的演示。
 *
 *  面试话术："我用 R-Tree 做视口空间过滤，查询复杂度从 O(N) 降到
 *  O(log N)，配合 Web Worker 不阻塞主线程。"
 * ============================================================
 */

/** 包围盒：[minX, minY, maxX, maxY]（地图场景里就是 [west, south, east, north]） */
export type BBox = [number, number, number, number];

/** 一个数据条目：数据本身 + 它的包围盒 */
interface RTreeEntry<T> {
  item: T;
  bbox: BBox;
}

/** R-Tree 节点：叶子存 items，内部节点存 children */
interface RTreeNode<T> {
  bbox: BBox;
  leaf: boolean;
  height: number;
  children?: RTreeNode<T>[];
  items?: RTreeEntry<T>[];
}

/** 每个节点最多容纳的子节点/条目数（超过就分裂） */
const MAX_ENTRIES = 9;

/* ---------- 包围盒工具 ---------- */

/** 空包围盒：用正负无穷表示"还没有任何内容" */
function emptyBox(): BBox {
  return [Infinity, Infinity, -Infinity, -Infinity];
}

/** 两个包围盒的并集（能同时包住两者的最小矩形） */
function unionBox(a: BBox, b: BBox): BBox {
  return [
    Math.min(a[0], b[0]),
    Math.min(a[1], b[1]),
    Math.max(a[2], b[2]),
    Math.max(a[3], b[3]),
  ];
}

/** 包围盒面积（用于选择插入路径时的"增量最小"判断） */
function boxArea(b: BBox): number {
  return (b[2] - b[0]) * (b[3] - b[1]);
}

/** 两个包围盒是否相交（视口查询用） */
function intersects(a: BBox, b: BBox): boolean {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

/* ---------- 节点创建 ---------- */

function createLeaf<T>(): RTreeNode<T> {
  return { bbox: emptyBox(), leaf: true, height: 1, items: [] };
}

function createInternal<T>(children: RTreeNode<T>[], height: number): RTreeNode<T> {
  const node: RTreeNode<T> = { bbox: emptyBox(), leaf: false, height, children };
  node.bbox = computeNodeBBox(node);
  return node;
}

/** 重算一个节点的 bbox（插入后根/父节点的 bbox 会变化） */
function computeNodeBBox<T>(node: RTreeNode<T>): BBox {
  let box = emptyBox();
  if (node.leaf) {
    for (const e of node.items!) box = unionBox(box, e.bbox);
  } else {
    for (const c of node.children!) box = unionBox(box, c.bbox);
  }
  return box;
}

/* ============================================================
 *  RTree 类：对外暴露 insert / search / remove / clear / all / bulkLoad
 * ============================================================ */
export class RTree<T> {
  private root: RTreeNode<T> = createLeaf<T>();

  /** 插入一个元素 + 它的包围盒 */
  insert(item: T, bbox: BBox): void {
    const result = insertRecursive(this.root, { item, bbox });
    // 插入可能让根分裂 → 需要新建一个根
    if (result.splitNode) {
      const oldRoot = this.root;
      this.root = createInternal([oldRoot, result.splitNode], oldRoot.height + 1);
    }
  }

  /** 查询与 query 相交的所有元素（视口过滤核心） */
  search(query: BBox): T[] {
    const found: T[] = [];
    searchRecursive(this.root, query, found);
    return found;
  }

  /** 删除指定 bbox 内的第一个匹配 item（简单实现，教学够用） */
  remove(item: T, bbox: BBox): boolean {
    return removeRecursive(this.root, item, bbox);
  }

  /** 清空 */
  clear(): void {
    this.root = createLeaf<T>();
  }

  /** 返回所有元素（遍历整棵树） */
  all(): T[] {
    const out: T[] = [];
    collectRecursive(this.root, out);
    return out;
  }

  /**
   * 批量插入（比逐个 insert 更快）。
   * 用 STR 策略：按 x 排序 → 分组 → 按 y 排序 → 分组 → 递归构建。
   */
  bulkLoad(entries: Array<{ item: T; bbox: BBox }>): void {
    if (entries.length === 0) return;
    // 根据数据量算树高：每层最多 MAX_ENTRIES 个分支
    // 高度 = ceil(log_9(N)) + 1，例如 5 万点 → 高度约 6，建出真正的平衡树
    const height = Math.max(1, Math.ceil(Math.log(entries.length) / Math.log(MAX_ENTRIES)) + 1);
    this.root = bulkBuild(entries, height);
  }
}

/* ---------- 插入 ---------- */

/**
 * 递归插入。返回值如果带 splitNode，说明本层需要分裂。
 * 策略：往下找"bbox 增量最小"的子节点，插进去后向上更新 bbox。
 */
function insertRecursive<T>(
  node: RTreeNode<T>,
  entry: RTreeEntry<T>,
): { splitNode?: RTreeNode<T> } {
  // 叶子：直接塞进去
  if (node.leaf) {
    node.items!.push(entry);
    node.bbox = unionBox(node.bbox, entry.bbox);
    // 超容量 → 分裂这个叶子，把分裂出的新叶子返回给父级
    if (node.items!.length > MAX_ENTRIES) {
      return { splitNode: splitLeaf(node) };
    }
    return {};
  }

  // 内部节点：选一个"插进去后 bbox 扩大最少"的子节点
  const child = chooseChild(node, entry.bbox);
  const result = insertRecursive(child, entry);
  node.bbox = unionBox(node.bbox, entry.bbox);

  // 子节点分裂了 → 把新子节点挂上来，自己也检查要不要分裂
  if (result.splitNode) {
    node.children!.push(result.splitNode);
    node.bbox = unionBox(node.bbox, result.splitNode.bbox);
    if (node.children!.length > MAX_ENTRIES) {
      return { splitNode: splitInternal(node) };
    }
  }
  return {};
}

/** 选"插入该 bbox 后包围盒增量最小"的子节点（贪心，保证树不畸形） */
function chooseChild<T>(node: RTreeNode<T>, bbox: BBox): RTreeNode<T> {
  let best: RTreeNode<T> = node.children![0];
  let bestEnlargement = Infinity;
  for (const child of node.children!) {
    const union = unionBox(child.bbox, bbox);
    // 增量 = 合并后的面积 - 原面积
    const enlargement = boxArea(union) - boxArea(child.bbox);
    if (enlargement < bestEnlargement) {
      bestEnlargement = enlargement;
      best = child;
    }
  }
  return best;
}

/* ---------- 分裂 ---------- */

/**
 * 叶子分裂：沿"最长的轴"排序后从中间切两半。
 * （教学版用最简单的按坐标排序切分；生产 R*Tree 会用更复杂的策略）
 */
function splitLeaf<T>(node: RTreeNode<T>): RTreeNode<T> {
  const items = node.items!;
  const axis = longestAxis(computeNodeBBox(node));
  // 按中心坐标排序
  items.sort((a, b) => center(a.bbox, axis) - center(b.bbox, axis));
  const mid = Math.floor(items.length / 2);
  const leftItems = items.slice(0, mid);
  const rightItems = items.slice(mid);

  node.items = leftItems;
  node.bbox = computeNodeBBox(node);

  const newLeaf = createLeaf<T>();
  newLeaf.items = rightItems;
  newLeaf.bbox = computeNodeBBox(newLeaf);
  return newLeaf;
}

/** 内部节点分裂：同样按最长的轴排序后切半 */
function splitInternal<T>(node: RTreeNode<T>): RTreeNode<T> {
  const children = node.children!;
  const axis = longestAxis(computeNodeBBox(node));
  children.sort((a, b) => center(a.bbox, axis) - center(b.bbox, axis));
  const mid = Math.floor(children.length / 2);
  const leftChildren = children.slice(0, mid);
  const rightChildren = children.slice(mid);

  node.children = leftChildren;
  node.bbox = computeNodeBBox(node);

  const newInternal = createInternal(rightChildren, node.height);
  return newInternal;
}

/** 求包围盒最长的轴（0=x, 1=y），分裂时沿长轴切效果更好 */
function longestAxis(bbox: BBox): 0 | 1 {
  return bbox[2] - bbox[0] >= bbox[3] - bbox[1] ? 0 : 1;
}

/** 条目/节点中心在某轴上的坐标 */
function center(bbox: BBox, axis: 0 | 1): number {
  return (bbox[axis] + bbox[axis + 2]) / 2;
}

/* ---------- 查询 ---------- */

function searchRecursive<T>(node: RTreeNode<T>, query: BBox, out: T[]): void {
  // 剪枝：节点 bbox 和查询框不相交 → 整棵子树不用看
  if (!intersects(node.bbox, query)) return;
  if (node.leaf) {
    for (const e of node.items!) {
      if (intersects(e.bbox, query)) out.push(e.item);
    }
    return;
  }
  for (const child of node.children!) {
    searchRecursive(child, query, out);
  }
}

/* ---------- 删除 / 遍历 ---------- */

function removeRecursive<T>(node: RTreeNode<T>, item: T, bbox: BBox): boolean {
  if (!intersects(node.bbox, bbox)) return false;
  if (node.leaf) {
    const idx = node.items!.findIndex((e) => e.item === item);
    if (idx === -1) return false;
    node.items!.splice(idx, 1);
    node.bbox = computeNodeBBox(node);
    return true;
  }
  for (const child of node.children!) {
    if (removeRecursive(child, item, bbox)) {
      node.bbox = computeNodeBBox(node);
      return true;
    }
  }
  return false;
}

function collectRecursive<T>(node: RTreeNode<T>, out: T[]): void {
  if (node.leaf) {
    for (const e of node.items!) out.push(e.item);
    return;
  }
  for (const child of node.children!) collectRecursive(child, out);
}

/* ---------- 批量构建（STR：Sort-Tile-Recursive） ---------- */

function bulkBuild<T>(
  entries: Array<{ item: T; bbox: BBox }>,
  height: number,
): RTreeNode<T> {
  if (height === 1) {
    // 最底层：直接做叶子
    const leaf = createLeaf<T>();
    leaf.items = entries;
    leaf.bbox = computeNodeBBox(leaf);
    return leaf;
  }
  // 先按 x 排序，分成若干组，每组再按 y 排序、继续递归
  entries.sort((a, b) => a.bbox[0] - b.bbox[0]);
  const groupSize = Math.ceil(entries.length / MAX_ENTRIES);
  const groups: Array<Array<{ item: T; bbox: BBox }>> = [];
  for (let i = 0; i < entries.length; i += groupSize) {
    groups.push(entries.slice(i, i + groupSize));
  }
  const children = groups.map((g) => bulkBuild(g, height - 1));
  return createInternal(children, height);
}

/* ============================================================
 *  自测函数：`runSpatialSelfTest()` 可在浏览器控制台或测试里运行
 *  验证逻辑：把 100 个点同时存进 R-Tree 和普通数组，
 *  用随机查询框对比"R-Tree 结果"和"暴力 O(N) 过滤结果"是否一致。
 *  一致 = 实现正确。
 * ============================================================ */
export function runSpatialSelfTest(): boolean {
  type P = { id: number; lng: number; lat: number };

  const tree = new RTree<P>();
  const points: P[] = [];

  // 造 200 个随机点（北京范围附近）
  for (let i = 0; i < 200; i++) {
    const p: P = { id: i, lng: 115.5 + Math.random() * 2.5, lat: 39.3 + Math.random() * 1.9 };
    tree.insert(p, [p.lng, p.lat, p.lng, p.lat]); // 点退化为零面积 bbox
    points.push(p);
  }

  // 跑 50 个随机查询框，逐个对比
  let allOk = true;
  for (let q = 0; q < 50; q++) {
    const cx = 115.5 + Math.random() * 2.5;
    const cy = 39.3 + Math.random() * 1.9;
    const r = 0.3 + Math.random() * 0.6;
    const query: BBox = [cx - r, cy - r, cx + r, cy + r];

    const rTreeResult = tree.search(query).map((p) => p.id).sort((a, b) => a - b);
    // 暴力过滤：线性遍历所有点，看谁落在查询框内
    const bruteResult = points
      .filter((p) => p.lng >= query[0] && p.lng <= query[2] && p.lat >= query[1] && p.lat <= query[3])
      .map((p) => p.id)
      .sort((a, b) => a - b);

    // 两组结果必须完全一致
    if (JSON.stringify(rTreeResult) !== JSON.stringify(bruteResult)) {
      allOk = false;
      // eslint-disable-next-line no-console
      console.log(`[R-Tree 自测] 第 ${q} 个查询框不一致! R-Tree=${rTreeResult.length}，暴力=${bruteResult.length}`);
    }
  }

  const totalCount = tree.all().length;
  // eslint-disable-next-line no-console
  console.log(`[R-Tree 自测] 总数=${totalCount}，50 个查询框对比全部一致=${allOk}`);
  return allOk && totalCount === 200;
}
