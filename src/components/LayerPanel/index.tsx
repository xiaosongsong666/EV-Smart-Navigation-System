import React from 'react';
import type { LayerConfigItem } from '../../config/mapStyle';

/** 图层状态 */
export interface LayerState {
  visible: boolean;
  opacity: number;
}

interface LayerPanelProps {
  /** 图层配置表 */
  config: LayerConfigItem[];
  /** 各图层当前状态 */
  states: Record<string, LayerState>;
  /** 切换显隐 */
  onToggle: (layerId: string) => void;
  /** 设置透明度 */
  onSetOpacity: (layerId: string, opacity: number) => void;
  /** 分组列表 (控制显示顺序) */
  groups: string[];
  /** 面板展开/收起 */
  open: boolean;
  /** 关闭面板 */
  onClose: () => void;
}

/** 分组名 → 中文标签 */
const GROUP_LABELS: Record<string, string> = {
  '底图': '底图',
  '路网': '路网',
  '标注': '标注',
  '区域': '区域',
  '3D': '3D',
  'Deck.gl': 'Deck.gl',
};

/**
 * 浮动图层面板
 * - 按组分开展示图层
 * - 每个图层有显隐切换按钮 + 透明度滑块
 */
const LayerPanel: React.FC<LayerPanelProps> = ({
  config,
  states,
  onToggle,
  onSetOpacity,
  groups,
  open,
  onClose,
}) => {
  return (
    <>
      {/* 浮动按钮 (右上角) */}
      <button
        onClick={() => onClose()}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
          width: 40,
          height: 40,
          borderRadius: 8,
          border: 'none',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
        }}
        title="图层控制"
      >
        {open ? '✕' : '🎯'}
      </button>

      {/* 面板 */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 12,
            zIndex: 10,
            width: 220,
            maxHeight: 'calc(100% - 80px)',
            overflowY: 'auto',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(12px)',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: '12px 0',
            fontSize: 13,
          }}
        >
          {groups.map((group) => {
            const groupLayers = config.filter((l) => l.group === group);
            if (groupLayers.length === 0) return null;
            return (
              <div key={group}>
                <div
                  style={{
                    padding: '6px 16px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {GROUP_LABELS[group] || group}
                </div>
                {groupLayers.map((cfg) => {
                  const state = states[cfg.id];
                  if (!state) return null;
                  return (
                    <div
                      key={cfg.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 16px',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      {/* 显隐切换 */}
                      <button
                        onClick={() => onToggle(cfg.id)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: '1px solid #ddd',
                          background: state.visible ? '#4361ee' : '#f0f0f0',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          color: state.visible ? '#fff' : '#999',
                          transition: 'all 0.2s',
                          flexShrink: 0,
                        }}
                      >
                        {state.visible ? '✓' : '○'}
                      </button>

                      {/* 图层名 */}
                      <span
                        style={{
                          flex: 1,
                          color: state.visible ? '#333' : '#bbb',
                          fontSize: 13,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cfg.name}
                      </span>

                      {/* 透明度滑块 (仅 MapLibre 原生图层) */}
                      {cfg.opacityProp && (
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={state.opacity}
                          onChange={(e) => onSetOpacity(cfg.id, parseFloat(e.target.value))}
                          style={{
                            width: 56,
                            height: 4,
                            cursor: 'pointer',
                            accentColor: '#4361ee',
                            opacity: state.visible ? 1 : 0.3,
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default LayerPanel;
