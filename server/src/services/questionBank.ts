import { Question } from '../types';

// Preguntas en lenguaje sencillo y respetuoso. No evaluan ortografia ni escolaridad.
export const QUESTION_BANK: Question[] = [
  {
    id: 'exp_1',
    category: 'experiencia',
    text: '¿En qué tipos de trabajos de construcción has trabajado? Por ejemplo: obra negra, obra blanca, acabados, mantenimiento.',
    followUp: '¿Puedes contarme un ejemplo de un trabajo o proyecto en el que hayas participado?'
  },
  {
    id: 'exp_2',
    category: 'experiencia',
    text: '¿Cuánto tiempo llevas trabajando en construcción, más o menos?',
    followUp: '¿Recuerdas en qué obras o con qué personas has trabajado ese tiempo?'
  },
  {
    id: 'herramientas_1',
    category: 'herramientas',
    text: '¿Qué herramientas y materiales usas normalmente en tu trabajo?',
    followUp: '¿Puedes dar un ejemplo de cómo usaste una de esas herramientas en un trabajo reciente?'
  },
  {
    id: 'herramientas_2',
    category: 'herramientas',
    text: '¿Hay alguna máquina o equipo especial que sepas operar? Por ejemplo mezcladora, taladro, soldadora, montacargas.',
    followUp: '¿En qué trabajo usaste esa máquina o equipo?'
  },
  {
    id: 'acabados_1',
    category: 'acabados',
    text: '¿Qué tan importante es para ti que las medidas y los cortes queden exactos? Cuéntame cómo te asegurás de que todo quede bien.',
    followUp: '¿Puedes describir una vez en que cuidaste mucho un detalle o acabado?'
  },
  {
    id: 'acabados_2',
    category: 'acabados',
    text: '¿Qué haces cuando notas que algo no quedó parejo o no cumple la medida?',
    followUp: '¿Me puedes dar un ejemplo de cómo corregiste un error de medida o acabado?'
  },
  {
    id: 'problemas_1',
    category: 'resolucion_problemas',
    text: 'Cuéntame de alguna vez que algo saliera mal en el trabajo y cómo lo resolviste.',
    followUp: '¿Qué hiciste exactamente para solucionarlo?'
  },
  {
    id: 'equipo_1',
    category: 'trabajo_equipo',
    text: '¿Cómo te organizas cuando trabajas en equipo con otros compañeros?',
    followUp: '¿Puedes dar un ejemplo de un trabajo en equipo que haya salido bien?'
  },
  {
    id: 'equipo_2',
    category: 'trabajo_equipo',
    text: '¿Alguna vez has sido responsable de coordinar a otros trabajadores o de una parte de la obra?',
    followUp: '¿Qué responsabilidades tenías en esa tarea?'
  },
  {
    id: 'seguridad_1',
    category: 'seguridad',
    text: '¿Qué medidas de seguridad conoces o usas en tu trabajo? Por ejemplo casco, arnés, guantes, señalización.',
    followUp: '¿Puedes contar una situación donde la seguridad fue importante?'
  },
  {
    id: 'puesto_1',
    category: 'preferencias',
    text: '¿En qué tipo de trabajo te gustaría enfocarte o en qué te sientes más fuerte?',
  }
];

export const CATEGORIES_ORDER = [
  'experiencia',
  'herramientas',
  'acabados',
  'resolucion_problemas',
  'trabajo_equipo',
  'seguridad',
  'preferencias'
];

export function getQuestionsByCategory(category: string): Question[] {
  return QUESTION_BANK.filter((q) => q.category === category);
}

export function getQuestionById(id: string): Question | undefined {
  return QUESTION_BANK.find((q) => q.id === id);
}

export function getNextCategory(currentCategory: string): string | null {
  const idx = CATEGORIES_ORDER.indexOf(currentCategory);
  if (idx === -1 || idx === CATEGORIES_ORDER.length - 1) return null;
  return CATEGORIES_ORDER[idx + 1];
}

const VAGUE_WORDS = ['poco', 'algo', 'normal', 'nada especial', 'no sé', 'no se', 'regular'];

// Regla simple para decidir si vale la pena pedir un ejemplo/seguimiento.
export function isAnswerVague(answer: string): boolean {
  const trimmed = answer.trim();
  if (trimmed.length < 25) return true;
  const lower = trimmed.toLowerCase();
  return VAGUE_WORDS.some((w) => lower.includes(w));
}
