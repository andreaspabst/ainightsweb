/**
 * Redaktionelle Zuordnung für /internal/topicmap/ (Themen, Jobtitel, Branchen,
 * Cluster). Die Seite bezieht Speaker, Jobtitel-Rohtext und Events aus den
 * Inhalten (src/content); was dort nicht strukturiert vorliegt, steht hier:
 *
 * - `topics`   kanonische Themen-Tags (siehe TOPICS), die der Talk berührt
 * - `roles`    normalisierte Jobtitel (so werden aus „Head of Marketing, SPECK
 *              Pumpen“ und „CTO Seobility GmbH“ vergleichbare Knoten)
 * - `industries` Branche des Arbeitgebers bzw. des Praxisfalls
 * - `talk`     Kurztitel des Talks
 *
 * Neue Speaker nach einem Event hier ergänzen. Ohne Eintrag erscheint ein
 * Speaker trotzdem im Graphen, nur mit seinem Rohtext-Jobtitel und ohne
 * Themen/Branche (grau markiert auf der Seite).
 */

export interface Cluster {
  id: string;
  label: string;
  color: string;
}

export const CLUSTERS: Cluster[] = [
  { id: 'strategie', label: 'KI-Strategie & Transformation', color: '#ff2d7a' },
  { id: 'people', label: 'Menschen, Lernen & HR', color: '#f5b942' },
  { id: 'engineering', label: 'Engineering & Softwarequalität', color: '#326bff' },
  { id: 'daten', label: 'Daten & Modelle', color: '#2ea3f2' },
  { id: 'recht', label: 'Regulierung, Recht & Sicherheit', color: '#a97fd0' },
  { id: 'produkt', label: 'Produkte, Medien & Geschäftsmodelle', color: '#3ddc97' },
];

export interface Topic {
  label: string;
  cluster: string;
}

export const TOPICS: Record<string, Topic> = {
  mittelstand: { label: 'KI im Mittelstand', cluster: 'strategie' },
  transformation: { label: 'Transformation & Strategie', cluster: 'strategie' },
  haltung: { label: 'Haltung & Ausprobieren', cluster: 'strategie' },
  inhouse: { label: 'Eigene KI-Lösungen im Unternehmen', cluster: 'strategie' },

  enablement: { label: 'Mitarbeitende befähigen', cluster: 'people' },
  gamification: { label: 'Gamification & Lernen', cluster: 'people' },
  hr: { label: 'HR & Personal', cluster: 'people' },
  training: { label: 'KI-Training & Simulation', cluster: 'people' },

  sdd: { label: 'Spec Driven Development', cluster: 'engineering' },
  aicoding: { label: 'AI Coding', cluster: 'engineering' },
  testing: { label: 'Testing & Accessibility', cluster: 'engineering' },
  nachhaltigweb: { label: 'Nachhaltiges Web', cluster: 'engineering' },
  architektur: { label: 'Software-Architektur', cluster: 'engineering' },

  datakultur: { label: 'Data Culture', cluster: 'daten' },
  extraktion: { label: 'Strukturierte Daten aus Text', cluster: 'daten' },
  benchmark: { label: 'Modell-Benchmarking & Routing', cluster: 'daten' },
  wissen: { label: 'Wissensplattformen & Archive', cluster: 'daten' },

  regulierung: { label: 'Regulierung & AI Act', cluster: 'recht' },
  politik: { label: 'Politik & Bürokratie', cluster: 'recht' },
  kritis: { label: 'Kritische Infrastruktur', cluster: 'recht' },
  cyber: { label: 'Cybersecurity', cluster: 'recht' },
  leitplanken: { label: 'Leitplanken & Vertrauen', cluster: 'recht' },

  saas: { label: 'AI-native Produkte & SaaS', cluster: 'produkt' },
  journalismus: { label: 'Medien & Journalismus', cluster: 'produkt' },
  audio: { label: 'Newsletter & Audio-Formate', cluster: 'produkt' },
  wartung: { label: 'Predictive Maintenance', cluster: 'produkt' },
};

export interface SpeakerCuration {
  /** Arbeitgeber bzw. Organisation (nur für den Tooltip) */
  org: string;
  roles: string[];
  industries: string[];
  topics: (keyof typeof TOPICS)[];
  talk?: string;
}

export const CURATION: Record<string, SpeakerCuration> = {
  'marius-strien': {
    org: 'SPECK Pumpen',
    roles: ['Head of Marketing'],
    industries: ['Maschinenbau & Industrie'],
    topics: ['mittelstand', 'transformation'],
    talk: 'Von Lilienthal zu den Wright Brothers: flAIght lessons aus dem Mittelstand',
  },
  'catalin-tudor': {
    org: 'evosoft',
    roles: ['Software Architect'],
    industries: ['Software & IT', 'Maschinenbau & Industrie'],
    topics: ['extraktion', 'architektur'],
    talk: 'LangExtract in Action: strukturierte Daten aus Text',
  },
  'roland-golla': {
    org: 'Never Code Alone',
    roles: ['AI Engineer'],
    industries: ['Software & IT'],
    topics: ['nachhaltigweb', 'testing'],
    talk: 'Nachhaltiges Web, Accessibility & Testing',
  },
  'dr-konrad-koerner': {
    org: 'Deutscher Bundestag',
    roles: ['MdB & Rechtsanwalt'],
    industries: ['Politik & Recht'],
    topics: ['regulierung', 'politik'],
    talk: 'KI zwischen Innovation und Regulierung',
  },
  'julian-b-schulze': {
    org: 'Codersgarden',
    roles: ['Tech Lead'],
    industries: ['Software & IT', 'Öffentlicher Sektor'],
    topics: ['training', 'architektur', 'inhouse'],
    talk: '„Let’s Talk“: Situationstraining bei der Polizei Baden-Württemberg',
  },
  'thomas-schoenherr': {
    org: 'Seobility',
    roles: ['CTO'],
    industries: ['Software & IT'],
    topics: ['sdd', 'aicoding'],
    talk: 'Spec Driven Development: braucht es bald keine Entwickler mehr?',
  },
  'lukas-strobel': {
    org: 'LORENZ',
    roles: ['KI-Spezialist'],
    industries: ['Konsumgüter & Lebensmittel'],
    topics: ['hr', 'inhouse', 'enablement'],
    talk: 'AI in HR: eine Inhouse-KI bei LORENZ im Praxiseinsatz',
  },
  'florian-pruefer': {
    org: 'Siemens',
    roles: ['Global Program Manager AI'],
    industries: ['Maschinenbau & Industrie'],
    topics: ['haltung', 'transformation'],
    talk: 'Die KI-Welle ist da: Haltung, Ausprobieren und Zusammenarbeit',
  },
  'alex-key': {
    org: 'selbstständig',
    roles: ['AI Engineer', 'Produktmanagement-Coach'],
    industries: ['Software & IT'],
    topics: ['saas'],
    talk: 'Don’t Panic: Product Fundamentals im Zeitalter von AI',
  },
  'katharina-rohrmeier-lisa-mahlein-sabrina-gruenthanner': {
    org: 'Schwan-STABILO',
    roles: ['Risk & Compliance Manager', 'Assistant to the CFO', 'Internal Communications Manager'],
    industries: ['Konsumgüter & Lebensmittel'],
    topics: ['enablement'],
    talk: 'Zwischen „Wow!“ und „Wie?“: Mitarbeitende AI-fit machen',
  },
  'florian-fuchs': {
    org: 'VEND consulting',
    roles: ['Senior Consultant'],
    industries: ['Beratung'],
    topics: ['datakultur'],
    talk: 'Data Culture: was ist das und wenn ja wie viele?',
  },
  'maximilian-schreiber': {
    org: 'Pantares AI',
    roles: ['Co-Founder'],
    industries: ['Software & IT'],
    topics: ['benchmark'],
    talk: 'Benchmarking von KI-Modellen, Kosten/Nutzen und Prompt-Routing',
  },
  'martin-hofmann': {
    org: 'infra fürth',
    roles: ['IT-Leiter'],
    industries: ['Energie & Versorgung'],
    topics: ['kritis', 'cyber', 'wartung'],
    talk: 'Wenn KI Strom- und Wassernetze absichert und zum Angriffsziel wird',
  },
  'tom-fischer': {
    org: 'Verlag Nürnberger Presse',
    roles: ['KI-Manager'],
    industries: ['Medien & Verlage'],
    topics: ['journalismus', 'audio', 'wissen', 'leitplanken'],
    talk: 'KI als Produktmotor: wie die Nürnberger Nachrichten neue Formate bauen',
  },
  'tim-junge-markus-utomo': {
    org: 'IBM / Spieleentwicklung',
    roles: ['Associate Partner', 'Spiel- & Lerndesigner'],
    industries: ['Beratung', 'Öffentlicher Sektor'],
    topics: ['gamification', 'transformation', 'enablement'],
    talk: 'Spielerisch KI-Systeme bauen',
  },
};
