export type Subject = {
  id: string;
  name: string;
  is_custom: boolean;
};

export type SourceFile = {
  id: string;
  filename: string;
  summary?: string;
  file_type: string;
  subject_id: string;
};

export type GenerationPayload = {
  subject_id: string;
  content_type: "worksheet" | "exam" | "quiz" | "test" | "lesson_materials";
  education_level: "sp" | "lo";
  class_level: number;
  language_level?: string | null;
  topic: string;
  instructions?: string;
  difficulty: number;
  total_questions: number;
  open_questions: number;
  closed_questions: number;
  variants_count: number;
  source_file_ids: string[];
};
