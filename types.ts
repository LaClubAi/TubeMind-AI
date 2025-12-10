
export interface AnalysisResult {
  summary: string;
  themes: string[];
  educationalPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  sources?: { title: string; uri: string }[];
  fullTranscript?: string; // New field for full text/transcript
}

export interface VideoConcept {
  title: string;
  hook: string;
  outline: string[];
  targetAudience: string;
}

export interface GeneratedArticle {
  title: string;
  content: string; // Markdown
}

export enum AppState {
  IDLE,
  ANALYZING,
  COMPLETE,
  ERROR
}

export enum TabView {
  DASHBOARD = 'DASHBOARD',
  ARTICLE = 'ARTICLE',
  CONCEPT = 'CONCEPT',
  NOTES = 'NOTES'
}
