export type ContentType = 'worksheet' | 'test' | 'quiz' | 'exam' | 'lesson_materials';
export type EducationLevel = 'primary' | 'secondary';
export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type Status = 'draft' | 'processing' | 'ready' | 'error';
export type LogLevel = 'info' | 'warning' | 'error';

export interface Subject {
  id: string;
  name: string;
  is_custom: boolean;
  created_at: string;
}

export interface SourceFile {
  id: string;
  subject_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  summary: string | null;
  extracted_text: string | null;
  page_count: number | null;
  created_at: string;
}

export interface GenerationParams {
  content_type: ContentType;
  subject_id: string;
  education_level: EducationLevel;
  class_level: number;
  language_level?: LanguageLevel | null;
  topic: string;
  instructions?: string;
  difficulty: number;
  total_questions: number;
  open_questions: number;
  closed_questions: number;
  variants_count: number;
  source_file_ids?: string[];
}
