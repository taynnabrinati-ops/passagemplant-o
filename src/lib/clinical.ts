/** Clinical vocabularies used across the unit boards. */

export type CfmPriorityValue = "P1" | "P2" | "P3" | "P4" | "P5";

export interface CfmPriority {
  value: CfmPriorityValue;
  label: string;
  short: string;
  description: string;
}

/** CFM admission-priority scale for intensive care. */
export const CFM_PRIORITIES: CfmPriority[] = [
  {
    value: "P1",
    label: "Prioridade 1",
    short: "P1",
    description:
      "Instável, necessita suporte intensivo (ventilação, DVA titulados) — máxima prioridade.",
  },
  {
    value: "P2",
    label: "Prioridade 2",
    short: "P2",
    description:
      "Necessita monitorização intensiva por alto risco de deterioração e intervenção imediata.",
  },
  {
    value: "P3",
    label: "Prioridade 3",
    short: "P3",
    description:
      "Instável, com pouca chance de recuperação por doença de base ou aguda — suporte com limites.",
  },
  {
    value: "P4",
    label: "Prioridade 4",
    short: "P4",
    description:
      "Benefício do CTI pouco provável (baixo risco ou terminal irreversível) — admissão a critério.",
  },
  {
    value: "P5",
    label: "Prioridade 5",
    short: "P5",
    description:
      "Doença terminal ou morte iminente, sem possibilidade de recuperação — em geral não admitir.",
  },
];

export function cfmPriority(value?: string | null): CfmPriority | null {
  if (!value) return null;
  return CFM_PRIORITIES.find((priority) => priority.value === value) ?? null;
}

export interface InvasionKind {
  kind: string;
  sites?: string[];
  placeholder?: string;
}

export const INVASION_KINDS: InvasionKind[] = [
  {
    kind: "CVC",
    sites: [
      "Subclávia Direita",
      "Subclávia Esquerda",
      "Jugular Direita",
      "Jugular Esquerda",
      "Femoral Direito",
      "Femoral Esquerdo",
    ],
  },
  { kind: "SVD" },
  {
    kind: "Linha arterial (PAM)",
    sites: [
      "Radial Direito",
      "Radial Esquerdo",
      "Femoral Direito",
      "Femoral Esquerdo",
      "Braquial Direito",
      "Braquial Esquerdo",
      "Pediosa Direita",
      "Pediosa Esquerda",
    ],
  },
  {
    kind: "Acesso periférico",
    sites: [
      "Membro Superior Direito",
      "Membro Superior Esquerdo",
      "Membro Inferior Direito",
      "Membro Inferior Esquerdo",
      "Jugular externa Direita",
      "Jugular externa Esquerda",
    ],
  },
  { kind: "Dreno de tórax", sites: ["Direito", "Esquerdo", "Bilateral"] },
  { kind: "Dreno de pericárdio" },
  { kind: "Dreno de mediastino" },
  { kind: "SNE" },
  { kind: "SNG" },
  { kind: "TOT / IOT" },
  { kind: "Dreno de cavidade", placeholder: "Ex.: Blake FID, Penrose subhepático" },
  { kind: "Colostomia" },
  { kind: "Ileostomia" },
  { kind: "Traqueostomia" },
  { kind: "GTT" },
  { kind: "Cistostomia" },
  { kind: "PICC", sites: ["Membro Superior Direito", "Membro Superior Esquerdo"] },
  { kind: "PIC" },
  { kind: "Outros", placeholder: "Descreva a invasão" },
];

export interface MedicationKind {
  kind: string;
  drugs?: string[];
  placeholder?: string;
}

export const MEDICATION_KINDS: MedicationKind[] = [
  {
    kind: "Amina vasoativa",
    drugs: [
      "Noradrenalina",
      "Adrenalina",
      "Vasopressina",
      "Dobutamina",
      "Dopamina",
      "Milrinona",
      "Fenilefrina",
    ],
    placeholder: "Ex.: NORA 0,3 mcg/kg/min",
  },
  {
    kind: "Nitrato venoso",
    drugs: ["Nitroglicerina (Tridil)", "Nitroprussiato"],
    placeholder: "Ex.: NTG 20 mcg/min",
  },
  {
    kind: "Sedação",
    drugs: [
      "Fentanil",
      "Midazolam",
      "Propofol",
      "Dexmedetomidina",
      "Cetamina",
      "Morfina",
      "Remifentanil",
    ],
    placeholder: "Ex.: Fentanil 100 mcg/h — RASS -2",
  },
  {
    kind: "Bloqueador neuromuscular",
    drugs: ["Cisatracúrio", "Rocurônio", "Atracúrio", "Succinilcolina", "Pancurônio"],
    placeholder: "Ex.: Cisatracúrio 2 mcg/kg/min",
  },
  {
    kind: "Antibiótico",
    drugs: [
      "Amicacina",
      "Ampicilina-sulbactam",
      "Amoxicilina-clavulanato",
      "Amoxicilina-sulbactam",
      "Azitromicina",
      "Cefazolina",
      "Cefepime",
      "Ceftriaxona",
      "Ceftazidima-avibactam",
      "Ciprofloxacina",
      "Clindamicina",
      "Daptomicina",
      "Gentamicina",
      "Linezolida",
      "Meropenem",
      "Metronidazol",
      "Piperacilina-tazobactam",
      "Polimixina B",
      "Tigeciclina",
      "Teicoplanina",
      "Vancomicina",
    ],
    placeholder: "Ex.: 1 g 8/8h · D3",
  },
  {
    kind: "Antifúngico",
    drugs: [
      "Fluconazol",
      "Anfotericina B lipossomal",
      "Micafungina",
      "Voriconazol",
      "Anidulafungina",
    ],
  },
  { kind: "Antiviral", drugs: ["Oseltamivir", "Aciclovir", "Ganciclovir", "Remdesivir"] },
  {
    kind: "Anticoagulação",
    drugs: [
      "Heparina não fracionada (BIC)",
      "Enoxaparina profilática",
      "Enoxaparina plena",
      "Fondaparinux",
      "Argatroban",
      "Varfarina",
      "Apixabana",
      "Rivaroxabana",
    ],
    placeholder: "Ex.: HNF BIC 18 UI/kg/h",
  },
  {
    kind: "Corticoide",
    drugs: ["Hidrocortisona", "Metilprednisolona", "Dexametasona", "Prednisona"],
    placeholder: "Ex.: Hidrocortisona 50 mg 6/6h",
  },
  { kind: "Insulina", drugs: ["Insulina regular (BIC)", "Insulina NPH", "Esquema SC"] },
  { kind: "Antiarrítmico", drugs: ["Amiodarona", "Lidocaína", "Esmolol", "Diltiazem", "Metoprolol"] },
  {
    kind: "Diurético",
    drugs: ["Furosemida (BIC)", "Furosemida (bolus)", "Espironolactona", "Hidroclorotiazida"],
  },
  {
    kind: "Anti-hipertensivo",
    drugs: ["Nicardipino", "Clevidipino", "Hidralazina", "Captopril", "Anlodipino"],
  },
  {
    kind: "Broncodilatador",
    drugs: ["Salbutamol", "Ipratrópio", "Aminofilina", "Sulfato de magnésio"],
  },
  { kind: "Pulsoterapia", placeholder: "Ex.: Metilpred 1 g/dia — D2/5" },
  {
    kind: "Imunossupressor / Imunobiológico",
    drugs: [
      "Tocilizumabe",
      "Rituximabe",
      "Ciclofosfamida",
      "Micofenolato",
      "Tacrolimus",
      "Ciclosporina",
    ],
  },
  { kind: "Quimioterapia", placeholder: "Ex.: esquema e ciclo" },
  {
    kind: "Hemoderivado",
    drugs: [
      "Concentrado de hemácias",
      "Plasma fresco",
      "Plaquetas",
      "Crioprecipitado",
      "Albumina",
    ],
  },
  {
    kind: "Nutrição",
    drugs: [
      "Dieta enteral plena",
      "Dieta enteral trófica",
      "NPT central",
      "NPT periférica",
      "Jejum",
    ],
  },
  {
    kind: "Profilaxias",
    drugs: [
      "TVP farmacológica",
      "TVP mecânica",
      "Úlcera de estresse (IBP)",
      "Úlcera de estresse (H2)",
    ],
  },
  { kind: "Outros", placeholder: "Descreva a medicação" },
];

export interface CultureMaterial {
  material: string;
  sites?: string[];
  placeholder?: string;
}

export const CULTURE_MATERIALS: CultureMaterial[] = [
  {
    material: "Hemocultura",
    sites: [
      "Periférico",
      "CVC lúmen proximal",
      "CVC lúmen medial",
      "CVC lúmen distal",
      "PICC",
      "Linha arterial (PAM)",
      "Port-a-cath",
    ],
  },
  { material: "Urocultura", sites: ["SVD", "Jato médio", "Cistostomia", "Nefrostomia"] },
  { material: "Aspirado traqueal" },
  { material: "Lavado broncoalveolar (LBA)" },
  { material: "Ponta de cateter", sites: ["CVC", "PICC", "Linha arterial (PAM)", "SVD"] },
  { material: "LCR" },
  { material: "Secreção de ferida", placeholder: "Descreva o sítio (ex.: FO esterno)" },
  { material: "Secreção abdominal / dreno", placeholder: "Ex.: Blake FID" },
  { material: "Líquido pleural" },
  { material: "Líquido ascítico" },
  { material: "Líquido articular" },
  { material: "Coprocultura" },
  { material: "Swab retal (vigilância)" },
  { material: "Swab nasal / nasofaringe" },
  { material: "Biópsia / fragmento", placeholder: "Descreva o tecido" },
  { material: "Outros", placeholder: "Descreva o material" },
];

export const CULTURE_MATERIAL_NAMES = CULTURE_MATERIALS.map((entry) => entry.material);

export const ANTIBIOTIC_PANEL = [
  "Amicacina",
  "Ampicilina",
  "Ampicilina-sulbactam",
  "Amoxicilina-clavulanato",
  "Aztreonam",
  "Cefazolina",
  "Cefepime",
  "Cefoxitina",
  "Ceftazidima",
  "Ceftazidima-avibactam",
  "Ceftriaxona",
  "Ceftolozano-tazobactam",
  "Ciprofloxacino",
  "Clindamicina",
  "Colistina",
  "Daptomicina",
  "Doxiciclina",
  "Eritromicina",
  "Ertapenem",
  "Fosfomicina",
  "Gentamicina",
  "Imipenem",
  "Levofloxacino",
  "Linezolida",
  "Meropenem",
  "Meropenem-vaborbactam",
  "Metronidazol",
  "Nitrofurantoína",
  "Oxacilina",
  "Penicilina G",
  "Piperacilina-tazobactam",
  "Polimixina B",
  "Rifampicina",
  "Sulfametoxazol-trimetoprim",
  "Teicoplanina",
  "Tigeciclina",
  "Vancomicina",
];
