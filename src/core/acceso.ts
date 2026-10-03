export type AccessState = 'demo' | 'active' | 'inactive' | 'loading';

export function canOpenPremium(state: AccessState): boolean {
  return state === 'demo' || state === 'active';
}
