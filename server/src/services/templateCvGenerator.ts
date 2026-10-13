import { ResponseRow } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  experiencia: 'experiencia en obra',
  herramientas: 'manejo de herramientas y materiales',
  acabados: 'atención a detalles y acabados',
  resolucion_problemas: 'resolución de problemas en obra',
  trabajo_equipo: 'trabajo en equipo',
  seguridad: 'seguridad en el trabajo',
  preferencias: 'preferencias de puesto'
};

// Reescritura simple basada en plantillas: ordena y limpia espacios, sin inventar nada.
export function templateRewrite(answer: string): string {
  const cleaned = answer.trim().replace(/\s+/g, ' ');
  if (!cleaned) return cleaned;
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return capitalized.endsWith('.') ? capitalized : `${capitalized}.`;
}

export function templateProfileSummary(responses: ResponseRow[], skills: string[]): string {
  const categories = Array.from(new Set(responses.map((r) => CATEGORY_LABELS[r.category] || r.category)));
  const categoriesText = categories.length > 0 ? categories.join(', ') : 'construcción general';
  const skillsText = skills.length > 0 ? skills.slice(0, 5).join(', ') : 'habilidades generales de obra';

  return (
    `Trabajador de la construcción con experiencia relacionada con ${categoriesText}. ` +
    `Entre sus habilidades destacan: ${skillsText}. ` +
    'Perfil basado directamente en sus respuestas de entrevista.'
  );
}
