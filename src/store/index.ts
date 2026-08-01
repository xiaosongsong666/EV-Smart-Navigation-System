import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  EmotionEntry,
  MeditationSession,
  UserSettings,
  VoiceRecognitionState,
  CameraState,
} from '../types';

interface AppState {
  // 情绪日记数据
  entries: EmotionEntry[];
  currentEntry: EmotionEntry | null;

  // 冥想数据
  meditationSessions: MeditationSession[];
  currentSession: MeditationSession | null;

  // 用户设置
  settings: UserSettings;

  // 语音识别状态
  voiceRecognition: VoiceRecognitionState;

  // 相机状态
  camera: CameraState;

  // 操作函数
  addEntry: (entry: Omit<EmotionEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEntry: (id: string, updates: Partial<EmotionEntry>) => void;
  deleteEntry: (id: string) => void;
  setCurrentEntry: (entry: EmotionEntry | null) => void;

  addMeditationSession: (session: Omit<MeditationSession, 'id' | 'createdAt'>) => void;
  updateMeditationSession: (id: string, updates: Partial<MeditationSession>) => void;
  setCurrentSession: (session: MeditationSession | null) => void;

  updateSettings: (settings: Partial<UserSettings>) => void;

  setVoiceRecognition: (state: Partial<VoiceRecognitionState>) => void;
  setCamera: (state: Partial<CameraState>) => void;
}

const defaultSettings: UserSettings = {
  theme: 'auto',
  language: 'zh-CN',
  notifications: true,
  reminderTime: '20:00',
  privacyLevel: 'private',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 初始状态
      entries: [],
      currentEntry: null,
      meditationSessions: [],
      currentSession: null,
      settings: defaultSettings,
      voiceRecognition: {
        isListening: false,
        transcript: '',
        error: null,
      },
      camera: {
        isActive: false,
        photo: null,
        error: null,
      },

      // 情绪日记操作
      addEntry: (entryData) => {
        const newEntry: EmotionEntry = {
          ...entryData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          entries: [newEntry, ...state.entries],
        }));
      },

      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, ...updates, updatedAt: new Date() } : entry,
          ),
        }));
      },

      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
        }));
      },

      setCurrentEntry: (entry) => {
        set({ currentEntry: entry });
      },

      // 冥想操作
      addMeditationSession: (sessionData) => {
        const newSession: MeditationSession = {
          ...sessionData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
        };
        set((state) => ({
          meditationSessions: [newSession, ...state.meditationSessions],
        }));
      },

      updateMeditationSession: (id, updates) => {
        set((state) => ({
          meditationSessions: state.meditationSessions.map((session) =>
            session.id === id ? { ...session, ...updates } : session,
          ),
        }));
      },

      setCurrentSession: (session) => {
        set({ currentSession: session });
      },

      // 设置操作
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      // 语音识别操作
      setVoiceRecognition: (newState) => {
        set((state) => ({
          voiceRecognition: { ...state.voiceRecognition, ...newState },
        }));
      },

      // 相机操作
      setCamera: (newState) => {
        set((state) => ({
          camera: { ...state.camera, ...newState },
        }));
      },
    }),
    {
      name: 'emotion-diary-storage',
      partialize: (state) => ({
        entries: state.entries,
        meditationSessions: state.meditationSessions,
        settings: state.settings,
      }),
    },
  ),
);
