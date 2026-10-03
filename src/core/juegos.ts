export type ChallengeResult = { correct: boolean; earnedXp: number };
export const scoreChallenge = (correct: boolean): ChallengeResult => ({ correct, earnedXp: correct ? 20 : 0 });
