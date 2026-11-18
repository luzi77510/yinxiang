export type Dimension = 'P' | 'G' | 'M';
export type Answers = Record<string, string>;
export type Option = { id: string; text: string; dimension?: Dimension };
export type Question = { id: string; text: string; options: Option[] };
export type Template = {
  art?: string;
  name: string;
  subtitle?: string;
  tags: string[];
  quote: string;
  analysis?: string;
  impressions?: string[];
  advice?: string[];
  summary?: string;
  color: string;
  background: string;
};
export type Config = {
  version: string;
  questions: Question[];
  results: Record<string, Template>;
  rules: any;
};
export type Result = {
  id?: string;
  version?: string;
  scores?: Record<Dimension, number>;
  normalized: Record<Dimension, number>;
  result: Dimension;
  easterEgg: boolean;
  tags: string[];
  reason?: string;
  template: Template;
  created?: string;
};
export type Session = {
  id: string;
  version: string;
  answers: Answers;
  started: string;
  completed: string | null;
  result: Result | null;
  config: Pick<Config, 'version' | 'questions'>;
  index?: number;
};
