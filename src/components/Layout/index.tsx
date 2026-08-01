import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Map,
  ArrowRightLeft,
  Database,
  Car,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';
import { useSettingsStore } from '../../store';
import Mapliber, { type MapliberHandle } from '../../pages/mapliberModel';

/**
 * 说明：页面（如 MapView / 路径规划）以「全屏覆盖层」的形式渲染，
 * 因此 Layout 不直接渲染 children，这里不再接收该 prop。
 */
interface LayoutProps {}

const NAV_ITEMS = [
  { path: '/', icon: Map, label: '地图引擎' },
  { path: '/ev-route', icon: ArrowRightLeft, label: '路径规划' },
  { path: '/bigdata', icon: Database, label: '海量POI' },
  { path: '/settings', icon: Settings, label: '设置' },
];

const Layout: React.FC<LayoutProps> = () => {
  const location = useLocation();
  const theme = useSettingsStore((s) => s.settings.theme);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const mapRef = useRef<MapliberHandle>(null);

  /**
   * 地图主题跟随设置同步：
   * 无论主题是从顶部按钮切换，还是在设置页修改，这里都会统一生效。
   */
  useEffect(() => {
    mapRef.current?.toggleDark(theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'day' ? 'night' : 'day';
    updateSettings({ theme: newTheme });
  };

  return (
    <div className="app-container">
      {/* ===== 全屏地图背景 ===== */}
      <div className="fixed inset-0 z-0">
        <Mapliber
          ref={mapRef}
          style={{ width: '100%', height: 'calc(100vh - 8rem)', marginTop: '4rem' }}
          theme={theme}
        />
      </div>

      {/* ===== 顶部导航栏 ===== */}
      <header className="relative z-10 glass-effect sticky top-0 border-b border-white/20 backdrop-blur-md">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center"
              >
                <Car className="w-5 h-5 text-white" />
              </motion.div>
              <span className="text-xl font-bold text-gradient">
                下一代车载 EV 智能导航系统
              </span>
            </Link>

            {/* 主题切换 */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg glass-effect hover:bg-white/20 transition-colors"
            >
              {theme === 'day' ? (
                <Sun className="w-5 h-5 text-gray-300" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ===== 底部导航栏 ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 glass-effect border-t border-white/20 backdrop-blur-md">
        <div className="max-w-[50rem] mx-auto px-4">
          <div className="flex justify-around items-center h-16">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'text-purple-600 bg-purple-100 dark:bg-purple-900/20'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Icon className="w-6 h-6" />
                  </motion.div>
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 底部安全区域 */}
      <div className="h-16"></div>
    </div>
  );
};

export default Layout;
