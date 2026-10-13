import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { OfflineBanner } from '../src/components/OfflineBanner';

function mockFetchOnce(body: unknown, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => body
  }) as unknown as typeof fetch;
}

describe('OfflineBanner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el aviso de modo sin IA cuando Groq no está configurado', async () => {
    mockFetchOnce({
      configured: false,
      usedToday: 0,
      limitPerDay: 50,
      usedThisInterview: 0,
      limitPerInterview: 8,
      lastError: null
    });

    render(<OfflineBanner />);

    expect(await screen.findByText(/Modo sin IA/i)).toBeInTheDocument();
  });

  it('no muestra ningún aviso cuando la IA está configurada y bajo el límite', async () => {
    mockFetchOnce({
      configured: true,
      usedToday: 1,
      limitPerDay: 50,
      usedThisInterview: 0,
      limitPerInterview: 8,
      lastError: null
    });

    render(<OfflineBanner />);

    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('avisa cuando se alcanzó el límite diario de IA', async () => {
    mockFetchOnce({
      configured: true,
      usedToday: 50,
      limitPerDay: 50,
      usedThisInterview: 0,
      limitPerInterview: 8,
      lastError: null
    });

    render(<OfflineBanner />);

    expect(await screen.findByText(/límite diario/i)).toBeInTheDocument();
  });
});
