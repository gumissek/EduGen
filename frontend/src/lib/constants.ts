export const CONTENT_TYPES = [
  { value: 'worksheet', label: 'Karta pracy' },
  { value: 'test', label: 'Sprawdzian' },
  { value: 'quiz', label: 'Kartkówka' },
  { value: 'exam', label: 'Test' },
  { value: 'lesson_materials', label: 'Konspekt zajęć' },
] as const;

export const EDUCATION_LEVELS = [
  { value: 'primary', label: 'Szkoła podstawowa', classRange: [1, 8] },
  { value: 'secondary', label: 'Szkoła średnia', classRange: [1, 4] },
] as const;

export const DIFFICULTY_LEVELS = [
  { value: 1, label: 'Bardzo łatwy' },
  { value: 2, label: 'Łatwy' },
  { value: 3, label: 'Średni' },
  { value: 4, label: 'Trudny' },
  { value: 5, label: 'Bardzo trudny' },
] as const;

export const LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
export const SESSION_WARNING_MS = 14 * 60 * 1000;
export const GENERATION_POLL_INTERVAL_MS = 3000;
