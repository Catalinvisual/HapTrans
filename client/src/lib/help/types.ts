// Shared shapes for the in-app guide. Every locale file implements exactly the
// same chapter ids so the structure stays language-independent.

export type DiagramVariant =
  | 'layout'
  | 'flow'
  | 'wizard'
  | 'planning'
  | 'finance'
  | 'telematics'
  | 'portal';

export type HelpBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'steps'; items: string[] }
  | { kind: 'table'; head: [string, string]; rows: Array<[string, string]> }
  | { kind: 'tip'; text: string }
  | { kind: 'warn'; text: string }
  | { kind: 'diagram'; variant: DiagramVariant; title: string; callouts: string[] };

export interface HelpChapterText {
  title: string;
  summary: string;
  blocks: HelpBlock[];
}

export interface HelpCategoryText {
  title: string;
  summary: string;
}

export interface HelpLocaleText {
  /** Keys are merged into the main i18n catalogue (they all start with guide_). */
  ui: Record<string, string>;
  categories: Record<string, HelpCategoryText>;
  chapters: Record<string, HelpChapterText>;
}

export interface HelpChapterDef {
  id: string;
  /** Route inside the TMS that the chapter documents. */
  page?: string;
  /** Lucide icon name used by the page. */
  icon: string;
  /** Illustration shown at the top of the chapter. */
  diagram?: DiagramVariant;
}

export interface HelpCategoryDef {
  id: string;
  icon: string;
  chapters: HelpChapterDef[];
}
