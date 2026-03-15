export type ContentType = 'worksheet' | 'test' | 'quiz' | 'exam' | 'lesson_materials';
export type EducationLevel = 'primary' | 'secondary';
export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

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
  has_extracted_text: boolean;
  extraction_error: string | null;
  page_count: number | null;
  created_at: string;
}

export interface GenerationParams {
  content_type: ContentType;
  subject_id: string;
  education_level: EducationLevel;
  class_level: string;
  language_level?: LanguageLevel | null;
  topic: string;
  instructions?: string;
  difficulty: number;
  total_questions: number;
  open_questions: number;
  closed_questions: number;
  variants_count: number;
  source_file_ids?: string[];
  task_types?: string[];
  curriculum_compliance_enabled?: boolean;
  include_compliance_card?: boolean;
  curriculum_document_ids?: string[];
}

export interface CurriculumDocument {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_hash: string;
  education_level: string | null;
  subject_name: string | null;
  description: string | null;
  source_url: string | null;
  curriculum_year: string | null;
  status: string;
  error_message: string | null;
  page_count: number | null;
  chunk_count: number;
  has_missing_embeddings: boolean;
  embeddings_missing_count: number;
  created_at: string;
  updated_at: string;
}

export interface CurriculumSearchResult {
  chunk: {
    id: string;
    document_id: string;
    chunk_index: number;
    content: string;
    section_title: string | null;
    heading_hierarchy: string | null;
    similarity_score: number | null;
  };
  document_filename: string;
  document_education_level: string | null;
  document_subject_name: string | null;
}

export interface ComplianceResult {
  questions: Array<{
    question_index: number;
    question_text: string;
    matched_requirements: Array<{
      requirement_code: string | null;
      requirement_text: string;
      section_title: string | null;
      similarity_score: number;
      document_name: string;
    }>;
  }>;
  coverage_summary: {
    matched_questions: number;
    total_questions: number;
    unique_requirements_covered: number;
  };
  generated_at: string;
}
