import React from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Palette,
  Globe,
  Clock,
  Download,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../store';

const Settings: React.FC = () => {
  const { settings, updateSettings, entries, meditationSessions } = useAppStore();

  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    updateSettings({ theme });
  };

  const handleLanguageChange = (language: 'zh-CN' | 'en-US') => {
    updateSettings({ language });
  };

  const handleNotificationToggle = () => {
    updateSettings({ notifications: !settings.notifications });
  };

  const handlePrivacyChange = (privacyLevel: 'public' | 'private' | 'friends') => {
    updateSettings({ privacyLevel });
  };

  const handleReminderTimeChange = (time: string) => {
    updateSettings({ reminderTime: time });
  };

  const exportData = () => {
    const data = {
      entries,
      meditationSessions,
      settings,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emotion-diary-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAllData = () => {
    if (confirm('确定要删除所有数据吗？此操作不可恢复。')) {
      // 这里可以添加清除数据的逻辑
      alert('数据已清除');
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gradient mb-2">设置</h1>
        <p className="text-gray-600 dark:text-gray-300">个性化你的情绪日记体验</p>
      </div>

      {/* 外观设置 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-effect rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Palette className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold">外观设置</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-3">主题模式</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: '浅色', icon: '☀️' },
                { value: 'dark', label: '深色', icon: '🌙' },
                { value: 'auto', label: '自动', icon: '⚙️' },
              ].map((theme) => (
                <motion.button
                  key={theme.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleThemeChange(theme.value as 'light' | 'dark' | 'auto')}
                  className={`p-4 rounded-lg text-center transition-all ${
                    settings.theme === theme.value
                      ? 'bg-purple-100 border-2 border-purple-500'
                      : 'bg-white hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className="text-2xl mb-2">{theme.icon}</div>
                  <div className="text-sm font-medium">{theme.label}</div>
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">语言</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'zh-CN', label: '中文', flag: '🇨🇳' },
                { value: 'en-US', label: 'English', flag: '🇺🇸' },
              ].map((lang) => (
                <motion.button
                  key={lang.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleLanguageChange(lang.value as 'zh-CN' | 'en-US')}
                  className={`p-4 rounded-lg text-center transition-all ${
                    settings.language === lang.value
                      ? 'bg-purple-100 border-2 border-purple-500'
                      : 'bg-white hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className="text-2xl mb-2">{lang.flag}</div>
                  <div className="text-sm font-medium">{lang.label}</div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 通知设置 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-effect rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Bell className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold">通知设置</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">推送通知</h3>
              <p className="text-sm text-gray-600">接收情绪记录提醒</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleNotificationToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notifications ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </motion.button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">提醒时间</label>
            <input
              type="time"
              value={settings.reminderTime}
              onChange={(e) => handleReminderTimeChange(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </motion.div>

      {/* 隐私设置 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-effect rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold">隐私设置</h2>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">数据隐私</label>
          <div className="space-y-3">
            {[
              { value: 'private', label: '仅自己可见', description: '数据完全私密' },
              { value: 'friends', label: '好友可见', description: '与信任的人分享' },
              { value: 'public', label: '公开', description: '所有人都能看到' },
            ].map((privacy) => (
              <motion.button
                key={privacy.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  handlePrivacyChange(privacy.value as 'public' | 'private' | 'friends')
                }
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  settings.privacyLevel === privacy.value
                    ? 'bg-purple-100 border-2 border-purple-500'
                    : 'bg-white hover:bg-gray-50 border-2 border-transparent'
                }`}
              >
                <div className="font-medium">{privacy.label}</div>
                <div className="text-sm text-gray-600">{privacy.description}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 数据管理 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-effect rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <SettingsIcon className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold">数据管理</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">{entries.length}</div>
              <div className="text-sm text-gray-600">情绪记录</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {meditationSessions.length}
              </div>
              <div className="text-sm text-gray-600">冥想记录</div>
            </div>
          </div>

          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={exportData}
              className="flex-1 flex items-center justify-center space-x-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>导出数据</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={clearAllData}
              className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>清除数据</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* 关于 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-effect rounded-2xl p-6"
      >
        <h2 className="text-xl font-semibold mb-4">关于情绪日记</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <p>版本: 1.0.0</p>
          <p>这是一个帮助你管理情绪、培养正念的智能工具。</p>
          <p>通过记录情绪、进行冥想，你可以更好地了解自己，提升心理健康。</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
