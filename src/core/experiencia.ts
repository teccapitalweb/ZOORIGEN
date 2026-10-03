export type ExperienceState = { onboardingComplete: boolean; surveyComplete: boolean; benefitsSeen: string[] };

export const defaultExperience = (): ExperienceState => ({ onboardingComplete: false, surveyComplete: false, benefitsSeen: [] });
