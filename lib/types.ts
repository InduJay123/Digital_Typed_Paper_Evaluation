export type QuestionOption = { label: string; text: string };

export type SafeQuestion = {
  id: string;
  order_index: number;
  question_number: string;
  section: string;
  question_type: string;
  question_text: string;
  options: QuestionOption[] | string[] | null;
  marks: number;
};

export type AttemptSummary = {
  id: string;
  status: string;
  mcq_score: number;
  mcq_max_marks: number;
  written_score: number;
  written_max_marks: number;
  total_score: number;
  total_max_marks: number;
  percentage: number;
};

export type AssessmentDetail = {
  ok: boolean;
  assessment?: {
    id: string;
    title: string;
    subject_code: string;
    subject_name: string;
    total_questions: number;
    total_marks: number;
    status: string;
  };
  questions?: SafeQuestion[];
  attempt?: AttemptSummary | null;
  latest_upload?: {
    id: string;
    processing_status: string;
    quality_status: string;
    original_file_name: string | null;
    uploaded_at: string;
  } | null;
  progress?: {
    mcq_status: string;
    written_status: string;
    overall_status: string;
  };
};
