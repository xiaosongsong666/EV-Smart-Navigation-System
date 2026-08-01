export interface EmotionEntry {
  id: string;
  date: string;
  emotion: EmotionType;
  intensity: number;
  content: string;
  voiceUrl?: string;
  tags: string[];
  weather?: string;
  activities?: string[];
  mood: number; // 1-10 scale
  createdAt: Date;
  updatedAt: Date;
}

export type EmotionType = 'happy' | 'sad' | 'angry' | 'anxious' | 'calm' | 'excited' | 'neutral';

export interface MeditationSession {
  id: string;
  date: string;
  duration: number; // in minutes
  type: MeditationType;
  completed: boolean;
  notes?: string;
  createdAt: Date;
}

export type MeditationType =
  'breathing' | 'mindfulness' | 'loving-kindness' | 'body-scan' | 'walking';

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  notifications: boolean;
  reminderTime: string;
  privacyLevel: 'public' | 'private' | 'friends';
}

export interface AnalyticsData {
  emotionTrends: EmotionTrend[];
  weeklyMood: WeeklyMood[];
  meditationStats: MeditationStats;
  insights: Insight[];
}

export interface EmotionTrend {
  date: string;
  emotions: Record<EmotionType, number>;
  averageMood: number;
}

export interface WeeklyMood {
  week: string;
  averageMood: number;
  dominantEmotion: EmotionType;
  entriesCount: number;
}

export interface MeditationStats {
  totalSessions: number;
  totalMinutes: number;
  averageDuration: number;
  completionRate: number;
  favoriteType: MeditationType;
}

export interface Insight {
  id: string;
  type: 'mood' | 'emotion' | 'meditation' | 'pattern';
  title: string;
  description: string;
  date: string;
  actionable: boolean;
  actionText?: string;
}

export interface VoiceRecognitionState {
  isListening: boolean;
  transcript: string;
  error: string | null;
}

export interface CameraState {
  isActive: boolean;
  photo: string | null;
  error: string | null;
}
