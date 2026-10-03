const key = 'zoorigen:progreso:v1';
type Progress = Record<string, number>;

export const ProgressStore = Object.freeze({
  read(): Progress {
    try { return JSON.parse(localStorage.getItem(key) || '{}') as Progress; } catch { return {}; }
  },
  write(courseId: string, value: number): void {
    const state = this.read();
    state[courseId] = Math.max(0, Math.min(100, value));
    localStorage.setItem(key, JSON.stringify(state));
  },
});
