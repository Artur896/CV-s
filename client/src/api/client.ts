import {
  AiStatus,
  Candidate,
  CvDraft,
  DetectedSkill,
  Interview,
  NextQuestionResponse,
  ResponseRow
} from '../types';

export class ApiError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    let code: string | undefined;
    try {
      const body = await res.json();
      message = body.error || message;
      code = body.code;
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new ApiError(message, res.status, code);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listCandidates: () => request<Candidate[]>('/candidates'),
  getCandidate: (id: string) => request<Candidate>(`/candidates/${id}`),
  createCandidate: (data: { full_name: string; phone?: string; notes?: string }) =>
    request<Candidate>('/candidates', { method: 'POST', body: JSON.stringify(data) }),

  listInterviews: (candidateId: string) => request<Interview[]>(`/interviews?candidate_id=${candidateId}`),
  createInterview: (candidateId: string) =>
    request<Interview>('/interviews', { method: 'POST', body: JSON.stringify({ candidate_id: candidateId }) }),
  getInterview: (id: string) => request<Interview>(`/interviews/${id}`),
  getNextQuestion: (interviewId: string) =>
    request<NextQuestionResponse>(`/interviews/${interviewId}/next-question`),
  getResponses: (interviewId: string) => request<ResponseRow[]>(`/interviews/${interviewId}/responses`),

  submitResponse: (
    interviewId: string,
    data: { question_id: string; category: string; question_text: string; answer: string }
  ) =>
    request<{ response: ResponseRow; detectedSkills: DetectedSkill[]; vague: boolean }>(
      `/interviews/${interviewId}/responses`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  requestFollowUp: (interviewId: string, question_id: string, answer: string) =>
    request<{ question: string; source: 'ai' | 'template'; aiNote?: string }>(
      `/interviews/${interviewId}/follow-up`,
      { method: 'POST', body: JSON.stringify({ question_id, answer }) }
    ),

  getSkills: (interviewId: string) => request<DetectedSkill[]>(`/interviews/${interviewId}/skills`),
  deleteSkill: (interviewId: string, skillId: string) =>
    request<void>(`/interviews/${interviewId}/skills/${skillId}`, { method: 'DELETE' }),

  generateCv: (interviewId: string, useAi: boolean) =>
    request<{ draft: CvDraft; generationSource: 'ai' | 'template'; aiNote: string | null }>(
      `/interviews/${interviewId}/cv/generate`,
      { method: 'POST', body: JSON.stringify({ useAi }) }
    ),
  getCv: (interviewId: string) =>
    request<{ draft: CvDraft; responses: ResponseRow[]; skills: DetectedSkill[] }>(
      `/interviews/${interviewId}/cv`
    ),
  updateCvResponse: (
    interviewId: string,
    responseId: string,
    data: { professional_rewrite?: string; approved?: boolean }
  ) =>
    request<ResponseRow>(`/interviews/${interviewId}/cv/responses/${responseId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  cvPdfUrl: (interviewId: string) => `/api/interviews/${interviewId}/cv/pdf`,

  getAiStatus: (interviewId?: string) =>
    request<AiStatus>(`/ai/status${interviewId ? `?interview_id=${interviewId}` : ''}`)
};
