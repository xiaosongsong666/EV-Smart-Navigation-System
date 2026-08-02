/**
 * ============================================================
 *  离线能力工具（模块四辅助）
 *  ============================================================
 *  本文件提供：
 *   1. useOnline()          —— React Hook，监听浏览器在线/离线
 *   2. getTileCacheStats()  —— 读取瓦片缓存统计（Settings 面板用）
 *   3. clearTileCache()     —— 清空瓦片缓存
 *
 *  ⚠️ 注意：TILE_CACHE 常量必须和 public/sw.js 里的一致！
 *  因为页面和 Service Worker 共享同一个 Cache API，名字不同就找不到。
 * ============================================================
 */
import { useEffect, useState } from 'react';

/** 必须与 public/sw.js 里的缓存名保持一致 */
const TILE_CACHE = 'ev-tile-cache-v1';

/**
 * React Hook：实时监听浏览器在线/离线状态
 * @returns {boolean} true=在线 false=离线
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}

/**
 * 读取瓦片缓存统计（Settings 面板展示用）
 * 页面可以直接打开 SW 写入的同一个 Cache，读取条目数和估算大小。
 */
export async function getTileCacheStats(): Promise<{ count: number; sizeBytes: number }> {
  try {
    const cache = await caches.open(TILE_CACHE);
    const keys = await cache.keys();
    let sizeBytes = 0;
    for (const key of keys) {
      const res = await cache.match(key);
      if (res) sizeBytes += (await res.arrayBuffer()).byteLength;
    }
    return { count: keys.length, sizeBytes };
  } catch {
    // caches 不可用（如不支持的环境）→ 返回空统计
    return { count: 0, sizeBytes: 0 };
  }
}

/** 清空瓦片缓存（Settings 面板"清除缓存"按钮用） */
export async function clearTileCache(): Promise<boolean> {
  try {
    await caches.delete(TILE_CACHE);
    return true;
  } catch {
    return false;
  }
}
