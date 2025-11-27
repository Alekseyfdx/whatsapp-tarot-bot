export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  SYSTEM = 'system'
}

export enum Sender {
  USER = 'user',
  BOT = 'bot'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  text?: string;
  imageUrl?: string; // For displayed images (user upload or bot generation)
  audioUrl?: string; // For audio playback
  type: MessageType;
  sender: Sender;
  timestamp: Date;
  isThinking?: boolean;
  sources?: GroundingSource[]; // For RAG/Search results
}

export interface UserProfile {
  name: string;
  grade: string;
  subject: string;
  topic: string;
  difficulty: string;
  isComplete: boolean;
}

export enum OnboardingStep {
  NAME = 0,
  GRADE = 1,
  SUBJECT = 2,
  TOPIC = 3,
  DIFFICULTY = 4,
  COMPLETE = 5
}

// Helper for Gemini Model config
export interface GeminiConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}