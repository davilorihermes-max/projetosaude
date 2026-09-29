import { PatientAnamnesisContext, LongitudinalRecord, CuratedProtocolSnippet } from './rag-prompt';

export interface CreateEvolutionInput {
  attendanceId: string;
  professionalId: string;
  rawNotes?: string;
  audioRecordingUrl?: string;
  transcriptionText?: string;
  summarizedConduct: string;
  patientFeedback?: string;
  nextSessionPlan?: string;
  aiAssisted?: boolean;
}

export interface ProtocolSearchResult extends CuratedProtocolSnippet {
  id: string;
  specialization: string;
  targetCondition: string;
  similarity: number;
}

export interface SearchProtocolsOptions {
  limit?: number;
  minSimilarity?: number;
  specialization?: string;
}

export interface CopilotRecommendationInput {
  patientId: string;
  therapistQuestion: string;
  embeddingVector?: number[]; // Vetor de 1536 dimensões (ex: text-embedding-3-small ou similar)
  maxProtocols?: number;
  recentHistoryLimit?: number;
}

export interface CopilotRecommendationContext {
  prompt: string;
  patientContext: PatientAnamnesisContext;
  recentHistory: LongitudinalRecord[];
  retrievedProtocols: ProtocolSearchResult[];
}
