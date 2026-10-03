export type Course = {
  id: string;
  title: string;
  area: string;
  description: string;
  image: string;
  lessons: number;
  duration: string;
  level: 'Inicial' | 'Intermedio' | 'Especializado';
  progress?: number;
};

export type Resource = {
  id: string;
  title: string;
  type: 'Guía' | 'PDF' | 'Ficha';
  area: string;
  pages: number | null;
};

export type Catalog = {
  courses: Course[];
  resources: Resource[];
  areas: string[];
  plans: { monthly: number | null; annual: number | null };
  verifiedAt: string | null;
};

export type DataMode = 'demo' | 'api';
