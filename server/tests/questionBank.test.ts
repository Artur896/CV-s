import { isAnswerVague, getNextCategory, CATEGORIES_ORDER } from '../src/services/questionBank';

describe('questionBank', () => {
  it('marca como vaga una respuesta muy corta', () => {
    expect(isAnswerVague('poco')).toBe(true);
  });

  it('marca como vaga una respuesta que usa palabras genéricas', () => {
    expect(isAnswerVague('Pues la verdad no sé, algo normal nada más')).toBe(true);
  });

  it('no marca como vaga una respuesta detallada', () => {
    const detailed =
      'Trabajé tres años colocando piso cerámico y cuidando que las juntas quedaran parejas con nivel.';
    expect(isAnswerVague(detailed)).toBe(false);
  });

  it('avanza a la siguiente categoría en orden', () => {
    expect(getNextCategory(CATEGORIES_ORDER[0])).toBe(CATEGORIES_ORDER[1]);
  });

  it('devuelve null al terminar la última categoría', () => {
    const last = CATEGORIES_ORDER[CATEGORIES_ORDER.length - 1];
    expect(getNextCategory(last)).toBeNull();
  });
});
