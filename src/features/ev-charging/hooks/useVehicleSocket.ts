/**
 * 🔋 WebSocket 客户端 Hook
 *
 * 连接后端 valhalla-bff 的 ws://localhost:4000，接收车辆实时状态
 * （后端 VehicleSimulator 每秒推送），并发送 sim:start/pause/stop 等控制消息。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { VehicleState, WsServerMessage, WsClientMessage } from '../types';

const WS_URL = 'ws://localhost:4000';

export function useVehicleSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [vehicleState, setVehicleState] = useState<VehicleState | null>(null);

  /** 发送控制消息（连接未就绪时静默丢弃） */
  const send = useCallback((msg: WsClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as WsServerMessage;
        if (msg.type === 'vehicle_state') setVehicleState(msg.data);
      } catch {
        /* 忽略无法解析的消息 */
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  return { connected, vehicleState, send };
}
