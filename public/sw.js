/**
 * ============================================================
 *  🛰 Service Worker — 离线地图瓦片缓存（模块四）
 *  ============================================================
 *
 *  一、这个文件是干嘛的？
 *  Service Worker 是浏览器里的一个"网络代理脚本"，独立于页面运行。
 *  页面发起的网络请求会先经过它，它可以在请求到达网络之前：
 *    - 返回缓存里的数据（断网时地图还能显示 → 离线）
 *    - 或把网络响应存入缓存（有网时自动"预存"瓦片）
 *
 *  二、为什么离线缓存要靠它？
 *  地图瓦片是 MapLibre 在内部发起的请求，普通页面 JS 拦截不到。
 *  Service Worker 是唯一能在"浏览器层面"统一拦截瓦片请求的地方。
 *
 *  三、策略：Cache-First（缓存优先）
 *    1. 有缓存 → 直接返回缓存（快 + 断网可用）
 *    2. 没缓存 → 发网络请求
 *    3. 网络成功 → 存入缓存，下次离线可用
 *    4. 断网且无缓存 → 返回占位
 *
 *  四、只缓存 /api/tiles/*（后端瓦片代理统一出口）
 *  瓦片统一走后端 /api/tiles/:provider/:z/:x/:y，SW 只认这一个前缀，
 *  其它请求（API、页面）一律放行，不误伤。
 * ============================================================
 */

/**
 * 缓存版本号。
 * 修改缓存逻辑后把这个数字 +1，旧版本缓存会在 activate 时被自动清理。
 * ⚠️ 注意：这个名字必须和 src/utils/offline.ts 里的常量保持一致！
 */
const CACHE_VERSION = 'v1';
const TILE_CACHE = 'ev-tile-cache-' + CACHE_VERSION;

/** 只拦截后端瓦片代理请求 */
const TILE_URL_PREFIX = '/api/tiles/';

/** 缓存最大瓦片数（防止缓存无限膨胀占满磁盘） */
const MAX_TILES = 5000;

/* ------------------------------------------------------------------ */
/*  install：安装事件（首次注册时触发）                                  */
/*  skipWaiting() 让新版本 SW 立即激活，不用等用户关闭所有页面            */
/* ------------------------------------------------------------------ */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

/* ------------------------------------------------------------------ */
/*  activate：激活事件（新版本替换旧版本时触发）                          */
/*  清理旧版本缓存，避免磁盘上堆积多个版本的瓦片                          */
/* ------------------------------------------------------------------ */
self.addEventListener('activate', (event) => {
  event.waitUntil(cleanOldCaches());
});

async function cleanOldCaches() {
  const keys = await caches.keys();
  // 只删除"ev-tile-cache-"开头的旧版本，其它缓存（如果有）不碰
  await Promise.all(
    keys
      .filter((key) => key.startsWith('ev-tile-cache-') && key !== TILE_CACHE)
      .map((key) => caches.delete(key)),
  );
  // clients.claim() 让 SW 立即控制当前已打开的页面（不用刷新）
  await self.clients.claim();
}

/* ------------------------------------------------------------------ */
/*  fetch：拦截网络请求                                                  */
/*  只处理瓦片代理请求；其它请求直接放行（return 不调用 respondWith）     */
/* ------------------------------------------------------------------ */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith(TILE_URL_PREFIX)) {
    event.respondWith(cacheFirst(event.request));
  }
  // 其它请求（如 /api/valhalla/route）不缓存，走正常网络
});

/* ------------------------------------------------------------------ */
/*  Cache-First 策略实现                                                */
/* ------------------------------------------------------------------ */
async function cacheFirst(request) {
  // 1. 打开缓存
  const cache = await caches.open(TILE_CACHE);

  // 2. 查缓存：命中直接返回（不联网）
  const cached = await cache.match(request);
  if (cached) return cached;

  // 3. 未命中 → 发网络请求
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // 4. 网络成功 → 存入缓存
      // 注意 clone()：response 只能被消费一次，缓存和页面各拿一份
      await evictIfNeeded(cache);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // 5. 断网且没缓存 → 返回空响应（MapLibre 显示空白瓦片）
    return new Response(null, { status: 404, statusText: 'Offline' });
  }
}

/* ------------------------------------------------------------------ */
/*  缓存容量控制：超过 MAX_TILES 就删最早的（简单 FIFO）                 */
/*  真实项目可升级为 LRU（最近最少使用），这里为了好懂先用"删最早一半"    */
/* ------------------------------------------------------------------ */
async function evictIfNeeded(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_TILES) return;
  // 删除最早缓存的一半，给新瓦片腾出空间
  const toDelete = keys.slice(0, Math.floor(keys.length / 2));
  await Promise.all(toDelete.map((key) => cache.delete(key)));
}
