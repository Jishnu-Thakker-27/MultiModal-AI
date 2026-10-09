/**
 * Academic Speech Normalizer & Phonetic Corrector
 * Corrects acoustic ambiguities and speech-to-text misinterpretations
 * (e.g. "curd fitting" / "c=kalu fitting" / "call fitting" -> "curve fitting")
 */

export interface PhoneticRule {
  pattern: RegExp;
  replacement: string;
}

export const ACADEMIC_PHONETIC_RULES: PhoneticRule[] = [
  // 1. CURVE FITTING (Handles all acoustic and accent variations)
  // "curd fitting", "c=kalu fitting", "call fitting", "cur fitting", "curb fitting", "curve fiting", "cure fitting", "court fitting", "core fitting"
  {
    pattern: /\b(?:curd|cur|call|cure|curb|kerf|karv|kerv|corve|core|court|c=kalu|kalu|cal|car|cart|curv|curve)\s*(?:fitting|fiting|feting|heating|hitting|hiting|sitting|getting|feedting|feeding|fittings)\b/gi,
    replacement: 'curve fitting',
  },
  {
    pattern: /\b(?:curd|cur|call|cure|curb|kerf|kerv|c=kalu)\s*fit\b/gi,
    replacement: 'curve fitting',
  },
  {
    pattern: /\bcurve\s*fit\b/gi,
    replacement: 'curve fitting',
  },

  // 2. FOURIER SERIES / TRANSFORM
  {
    pattern: /\b(?:four\s*year|four\s*years?|for\s*year|for\s*here|4\s*year)\s+(series|transform|integral|analysis)\b/gi,
    replacement: 'Fourier $1',
  },

  // 3. LAPLACE TRANSFORM
  {
    pattern: /\b(?:la\s*place|the\s*place|lay\s*place|lap\s*lace)\s+(transform|transforms?|equation)\b/gi,
    replacement: 'Laplace $1',
  },

  // 4. EIGENVALUES / EIGENVECTORS
  {
    pattern: /\b(?:i\s*can|eye\s*can|i\s*ken|eye\s*ken|icon|aigen)\s*(values?|vectors?|space)\b/gi,
    replacement: 'eigen$1',
  },

  // 5. DBMS & SQL
  {
    pattern: /\b(?:d\s*b\s*m\s*s|db\s*ms|db\s*mess|the\s*bms|deep\s*ms)\b/gi,
    replacement: 'DBMS',
  },
  {
    pattern: /\b(?:s\s*q\s*l|sequel)\b/gi,
    replacement: 'SQL',
  },
  {
    pattern: /\b(?:no\s*sequel|no\s*s\s*q\s*l)\b/gi,
    replacement: 'NoSQL',
  },

  // 6. NUMERICAL METHODS & ALGORITHMS
  {
    pattern: /\b(?:dike\s*stra|dijk\s*stra|dykstra|dike\s*straw|die\s*extra)(?:'s)?\b/gi,
    replacement: "Dijkstra's",
  },
  {
    pattern: /\b(?:newton\s*rafson|newton\s*raphson|newton\s*rap\s*son)\b/gi,
    replacement: 'Newton-Raphson',
  },
  {
    pattern: /\b(?:range\s*kutta|runge\s*kuta|run\s*gay\s*kutta|range\s*cutter|roongey\s*kuta)\b/gi,
    replacement: 'Runge-Kutta',
  },
  {
    pattern: /\b(?:simpson\s*rule|simpsons\s*rule)\b/gi,
    replacement: "Simpson's rule",
  },
  {
    pattern: /\b(?:trap\s*zoidal|trap\s*azoidal|trapezoid)\s+rule\b/gi,
    replacement: 'trapezoidal rule',
  },
  {
    pattern: /\b(?:least\s*square|list\s*squares?|least\s*squires)\b/gi,
    replacement: 'least squares',
  },
  {
    pattern: /\b(?:nap\s*sack|nap\s*sac)\s*(?:problem)?\b/gi,
    replacement: 'knapsack problem',
  },
  {
    pattern: /\b(?:new\s*medical|new\s*miracle)\s*(methods?|analysis)\b/gi,
    replacement: 'numerical $1',
  },

  // 7. MATHEMATICS & PROBABILITY
  {
    pattern: /\b(?:poison\s*distribution)\b/gi,
    replacement: 'Poisson distribution',
  },
  {
    pattern: /\b(?:burn\s*oily|bar\s*nooly)\b/gi,
    replacement: 'Bernoulli',
  },
  {
    pattern: /\b(?:base\s*theorem|bays\s*theorem)\b/gi,
    replacement: "Bayes' theorem",
  },
  {
    pattern: /\b(?:poly\s*normal)\b/gi,
    replacement: 'polynomial',
  },
  {
    pattern: /\b(?:prob\s*ability)\b/gi,
    replacement: 'probability',
  },
  {
    pattern: /\b(?:bull\s*in\s*algebra|boo\s*lean)\s*algebra\b/gi,
    replacement: 'Boolean algebra',
  },

  // 8. COMPUTER SCIENCE STRUCTURES
  {
    pattern: /\b(?:b\s*s\s*t|b\s*st)\b/gi,
    replacement: 'BST',
  },
  {
    pattern: /\b(?:queck\s*sort|quick\s*sword)\b/gi,
    replacement: 'quicksort',
  },
  {
    pattern: /\b(?:d\s*p)\s+problem\b/gi,
    replacement: 'dynamic programming problem',
  },
  {
    pattern: /\b(?:poly\s*more\s*fizz\s*em)\b/gi,
    replacement: 'polymorphism',
  },
];

/**
 * High-value academic keywords used to score and prioritize speech alternatives.
 */
export const ACADEMIC_KEYWORDS = [
  'curve fitting',
  'least squares',
  'probability',
  'calculus',
  'linear algebra',
  'dbms',
  'normalization',
  'dijkstra',
  'fourier',
  'laplace',
  'eigenvalue',
  'eigenvector',
  'newton-raphson',
  'runge-kutta',
  'simpson',
  'trapezoidal',
  'knapsack',
  'quicksort',
  'binary search',
  'dynamic programming',
  'numerical methods',
  'boolean algebra',
  'bayes',
  'bernoulli',
  'poisson',
  'differential equations',
];

/**
 * Normalizes speech transcript by applying domain-specific phonetic corrections.
 */
export function normalizeAcademicSpeech(text: string): string {
  if (!text) return '';
  let result = text;

  for (const rule of ACADEMIC_PHONETIC_RULES) {
    result = result.replace(rule.pattern, rule.replacement);
  }

  return result;
}

/**
 * Inspects all speech recognition candidate hypotheses and selects the one that
 * matches academic domain terms, then normalizes it.
 */
export function pickAndNormalizeSpeech(candidates: string[]): string {
  if (!candidates || candidates.length === 0) return '';

  // 1. First, check if any candidate matches an exact academic keyword after normalization
  for (const raw of candidates) {
    const normalized = normalizeAcademicSpeech(raw);
    const lower = normalized.toLowerCase();
    for (const kw of ACADEMIC_KEYWORDS) {
      if (lower.includes(kw)) {
        return normalized;
      }
    }
  }

  // 2. If none explicitly matched an academic keyword, pick candidate #0 and normalize it
  return normalizeAcademicSpeech(candidates[0]);
}

/**
 * JSGF Grammar string for Web Speech API to boost academic recognition.
 */
export const ACADEMIC_JSGF_GRAMMAR = `
#JSGF V1.0;
grammar academic;
public <concept> = curve fitting | least squares | probability | calculus | linear algebra | DBMS | normalization | Dijkstra | Fourier series | Laplace transform | eigenvalues | eigenvectors | Newton-Raphson | Runge-Kutta | Simpson's rule | trapezoidal rule | knapsack problem | quicksort | binary search tree | dynamic programming | numerical methods | Bayes theorem | Bernoulli | Poisson distribution | polynomial ;
`;
