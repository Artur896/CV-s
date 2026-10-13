export type SkillSource = 'rule' | 'ai';
export type RewriteSource = 'ai' | 'template';
export type InterviewStatus = 'en_progreso' | 'completada';
export type CvStatus = 'borrador' | 'aprobado';

export interface Candidate {
  id: string;
  full_name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface Interview {
  id: string;
  candidate_id: string;
  stage: string;
  status: InterviewStatus;
  ai_calls_used: number;
  created_at: string;
  updated_at: string;
}

export interface ResponseRow {
  id: string;
  interview_id: string;
  question_id: string;
  category: string;
  question_text: string;
  original_answer: string;
  professional_rewrite: string | null;
  rewrite_approved: number;
  source_of_rewrite: RewriteSource | null;
  created_at: string;
}

export interface DetectedSkill {
  id: string;
  interview_id: string;
  skill: string;
  category: string;
  confidence: 'baja' | 'media' | 'alta';
  source: SkillSource;
  evidence_response_id: string | null;
  created_at: string;
}

export interface CvDraft {
  id: string;
  interview_id: string;
  profile_summary: string | null;
  suggested_roles_json: string | null;
  generation_source: RewriteSource;
  status: CvStatus;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  category: string;
  text: string;
  followUp?: string;
}

export interface AiStatus {
  configured: boolean;
  usedToday: number;
  limitPerDay: number;
  usedThisInterview: number;
  limitPerInterview: number;
  lastError: string | null;
}
