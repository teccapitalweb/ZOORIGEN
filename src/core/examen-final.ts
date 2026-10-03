export type ExamSummary = { correct: number; total: number; passed: boolean };
export const summarizeExam = (correct: number, total: number): ExamSummary => ({ correct, total, passed: total > 0 && correct / total >= 0.8 });
