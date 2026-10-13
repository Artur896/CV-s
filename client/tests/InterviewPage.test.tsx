import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { InterviewPage } from '../src/pages/InterviewPage';

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => body } as Response);
}

describe('InterviewPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra la siguiente pregunta y permite enviar una respuesta', async () => {
    const question = { id: 'exp_1', category: 'experiencia', text: '¿En qué tipos de trabajos...?' };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/next-question')) {
        return jsonResponse({ question, stage: 'experiencia', completed: false });
      }
      if (url.includes('/ai/status')) {
        return jsonResponse({
          configured: false,
          usedToday: 0,
          limitPerDay: 50,
          usedThisInterview: 0,
          limitPerInterview: 8,
          lastError: null
        });
      }
      if (url.includes('/responses') && !url.includes('follow-up')) {
        return jsonResponse({
          response: { id: 'r1' },
          detectedSkills: [],
          vague: false
        });
      }
      return jsonResponse({});
    }) as unknown as typeof fetch;

    render(
      <MemoryRouter initialEntries={['/interviews/abc']}>
        <Routes>
          <Route path="/interviews/:interviewId" element={<InterviewPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(question.text)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Escribe tu respuesta/i);
    fireEvent.change(textarea, { target: { value: 'Trabajo en obra negra desde hace 5 años' } });
    fireEvent.click(screen.getByText('Continuar'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/responses'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('ofrece agregar un ejemplo cuando la respuesta es muy vaga', async () => {
    const question = { id: 'exp_1', category: 'experiencia', text: '¿Cuánto tiempo llevas trabajando?' };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/next-question')) {
        return jsonResponse({ question, stage: 'experiencia', completed: false });
      }
      if (url.includes('/ai/status')) {
        return jsonResponse({
          configured: false,
          usedToday: 0,
          limitPerDay: 50,
          usedThisInterview: 0,
          limitPerInterview: 8,
          lastError: null
        });
      }
      if (url.includes('/responses')) {
        return jsonResponse({ response: { id: 'r1' }, detectedSkills: [], vague: true });
      }
      return jsonResponse({});
    }) as unknown as typeof fetch;

    render(
      <MemoryRouter initialEntries={['/interviews/abc']}>
        <Routes>
          <Route path="/interviews/:interviewId" element={<InterviewPage />} />
        </Routes>
      </MemoryRouter>
    );

    const textarea = await screen.findByPlaceholderText(/Escribe tu respuesta/i);
    fireEvent.change(textarea, { target: { value: 'poco' } });
    fireEvent.click(screen.getByText('Continuar'));

    expect(await screen.findByRole('button', { name: /Agregar un ejemplo/i })).toBeInTheDocument();
  });
});
