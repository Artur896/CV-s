import { detectSkillsFromText, suggestRolesFromSkills } from '../src/services/ruleBasedSkills';

describe('ruleBasedSkills', () => {
  it('detecta habilidades por palabras clave en la respuesta', () => {
    const text = 'Trabajé colocando azulejo y también usando taladro y nivel para medidas exactas';
    const result = detectSkillsFromText(text);
    const skillNames = result.map((r) => r.skill);

    expect(skillNames).toContain('Colocación de azulejo / piso');
    expect(skillNames).toContain('Uso de herramienta eléctrica');
    expect(skillNames).toContain('Precisión en medidas y cortes');
  });

  it('no detecta nada si el texto no tiene palabras clave relevantes', () => {
    const result = detectSkillsFromText('Me gusta mucho mi trabajo y soy puntual');
    expect(result).toEqual([]);
  });

  it('sugiere un puesto general cuando no hay habilidades', () => {
    expect(suggestRolesFromSkills([])).toEqual(['Ayudante general de construcción']);
  });

  it('sugiere puestos específicos según las habilidades detectadas', () => {
    const roles = suggestRolesFromSkills(['Soldadura', 'Instalación eléctrica']);
    expect(roles).toContain('Soldador');
    expect(roles).toContain('Electricista de obra');
  });
});
