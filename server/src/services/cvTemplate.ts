import fs from 'fs';
import path from 'path';
import type { Browser } from 'puppeteer-core';
import puppeteerCore from 'puppeteer-core';
import { Candidate, ResponseRow, DetectedSkill, CvDraft } from '../types';

// En Vercel (y otros entornos serverless) no se puede usar el Chromium completo que descarga
// `puppeteer` (excede el límite de tamaño de las funciones). Ahí se usa `puppeteer-core` con el
// binario optimizado de `@sparticuz/chromium`. En desarrollo local se usa el Chromium que `puppeteer`
// descarga al instalar dependencias.
async function launchBrowser(): Promise<Browser> {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true
    });
  }

  const puppeteer = (await import('puppeteer')).default;
  return puppeteer.launch({ headless: true, args: ['--no-sandbox'] }) as unknown as Promise<Browser>;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface CvRenderData {
  candidate: Candidate;
  draft: CvDraft;
  responses: ResponseRow[];
  skills: DetectedSkill[];
  suggestedRoles: string[];
}

export function buildCvHtml(data: CvRenderData): string {
  const templatePath = path.join(__dirname, '..', 'templates', 'cv.html');
  let html = fs.readFileSync(templatePath, 'utf-8');

  const skillsHtml = data.skills
    .map((s) => `<span class="skill-chip">${escapeHtml(s.skill)}</span>`)
    .join('');

  const rolesHtml = data.suggestedRoles
    .map((r) => `<div class="role-item">• ${escapeHtml(r)}</div>`)
    .join('');

  const responsesHtml = data.responses
    .map((r) => {
      const text = r.rewrite_approved && r.professional_rewrite ? r.professional_rewrite : r.original_answer;
      return `<div class="response-block">
        <div class="response-category">${escapeHtml(r.category)}</div>
        <p>${escapeHtml(text)}</p>
      </div>`;
    })
    .join('');

  const sourceNote =
    data.draft.generation_source === 'ai'
      ? 'Redacción apoyada por IA (Groq), revisada por el entrevistador.'
      : 'Redacción generada por plantilla (modo sin IA), revisada por el entrevistador.';

  html = html
    .replace('{{fullName}}', escapeHtml(data.candidate.full_name))
    .replace('{{phone}}', escapeHtml(data.candidate.phone || ''))
    .replace('{{profileSummary}}', escapeHtml(data.draft.profile_summary || ''))
    .replace('{{suggestedRoles}}', rolesHtml || '<div class="role-item">Sin puestos sugeridos todavía.</div>')
    .replace('{{skills}}', skillsHtml || '<span class="skill-chip">Sin habilidades detectadas aún</span>')
    .replace('{{responseBlocks}}', responsesHtml)
    .replace('{{sourceNote}}', sourceNote);

  return html;
}

export async function renderCvPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm' } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
