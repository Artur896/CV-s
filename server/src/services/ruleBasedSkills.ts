export interface SkillRule {
  skill: string;
  category: string;
  keywords: string[];
}

// Palabras clave editables por categoria. Permite ampliar sin tocar el motor.
export const SKILL_RULES: SkillRule[] = [
  { skill: 'Albañilería / obra negra', category: 'obra_negra', keywords: ['albañil', 'block', 'cimbra', 'cimiento', 'varilla', 'concreto', 'colado', 'castillo'] },
  { skill: 'Instalación eléctrica', category: 'obra_blanca', keywords: ['eléctric', 'cableado', 'contacto', 'apagador', 'instalación eléctrica'] },
  { skill: 'Plomería / instalación hidráulica', category: 'obra_blanca', keywords: ['plomería', 'tubería', 'pvc', 'fuga', 'hidráulic', 'sanitario'] },
  { skill: 'Acabados en pintura', category: 'acabados', keywords: ['pintura', 'pintar', 'brocha', 'rodillo', 'sellador'] },
  { skill: 'Colocación de azulejo / piso', category: 'acabados', keywords: ['azulejo', 'piso', 'loseta', 'cerámic', 'nivelador'] },
  { skill: 'Yeso y tablaroca', category: 'acabados', keywords: ['yeso', 'tablaroca', 'durock', 'pasta'] },
  { skill: 'Carpintería', category: 'acabados', keywords: ['carpinter', 'madera', 'closet', 'puerta', 'mueble'] },
  { skill: 'Soldadura', category: 'herramientas', keywords: ['soldar', 'soldadura', 'soldadora'] },
  { skill: 'Uso de herramienta eléctrica', category: 'herramientas', keywords: ['taladro', 'rotomartillo', 'sierra', 'esmeril', 'pulidora'] },
  { skill: 'Operación de maquinaria pesada', category: 'herramientas', keywords: ['montacargas', 'retroexcavadora', 'grua', 'grúa', 'mezcladora'] },
  { skill: 'Precisión en medidas y cortes', category: 'acabados', keywords: ['medida', 'nivel', 'escuadra', 'exacto', 'milímetro', 'cinta métrica'] },
  { skill: 'Resolución de problemas en obra', category: 'resolucion_problemas', keywords: ['resolví', 'solucioné', 'arreglé', 'me di cuenta', 'corregí'] },
  { skill: 'Trabajo en equipo', category: 'trabajo_equipo', keywords: ['equipo', 'compañero', 'coordinar', 'coordiné', 'ayudamos'] },
  { skill: 'Liderazgo / supervisión', category: 'trabajo_equipo', keywords: ['encargado', 'supervisor', 'responsable de', 'coordiné a', 'jefe de'] },
  { skill: 'Conocimientos de seguridad', category: 'seguridad', keywords: ['casco', 'arnés', 'arnes', 'guantes', 'seguridad', 'señalización', 'protección'] },
  { skill: 'Mantenimiento general', category: 'mantenimiento', keywords: ['mantenimiento', 'reparación', 'reparé', 'preventivo'] }
];

export interface DetectedSkillCandidate {
  skill: string;
  category: string;
  confidence: 'baja' | 'media' | 'alta';
}

export function detectSkillsFromText(text: string): DetectedSkillCandidate[] {
  const lower = text.toLowerCase();
  const found: DetectedSkillCandidate[] = [];

  for (const rule of SKILL_RULES) {
    const matches = rule.keywords.filter((kw) => lower.includes(kw));
    if (matches.length > 0) {
      found.push({
        skill: rule.skill,
        category: rule.category,
        confidence: matches.length > 1 ? 'alta' : 'media'
      });
    }
  }

  return found;
}

export function suggestRolesFromSkills(skills: string[]): string[] {
  const roles = new Set<string>();
  const skillSet = new Set(skills);

  if (skillSet.has('Albañilería / obra negra')) roles.add('Albañil / Ayudante de obra negra');
  if (skillSet.has('Instalación eléctrica')) roles.add('Electricista de obra');
  if (skillSet.has('Plomería / instalación hidráulica')) roles.add('Plomero / Instalador hidrosanitario');
  if (skillSet.has('Acabados en pintura')) roles.add('Pintor de obra');
  if (skillSet.has('Colocación de azulejo / piso')) roles.add('Colocador de pisos y azulejo');
  if (skillSet.has('Yeso y tablaroca')) roles.add('Instalador de tablaroca / yesero');
  if (skillSet.has('Carpintería')) roles.add('Carpintero de obra');
  if (skillSet.has('Soldadura')) roles.add('Soldador');
  if (skillSet.has('Operación de maquinaria pesada')) roles.add('Operador de maquinaria');
  if (skillSet.has('Mantenimiento general')) roles.add('Técnico de mantenimiento');
  if (skillSet.has('Liderazgo / supervisión')) roles.add('Supervisor / Jefe de cuadrilla');

  if (roles.size === 0) roles.add('Ayudante general de construcción');

  return Array.from(roles);
}
