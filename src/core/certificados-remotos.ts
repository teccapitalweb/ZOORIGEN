import { requestApi } from './remoto';

export type Certificate = { folio: string; course: string; issuedAt: string };
export const loadCertificates = (): Promise<Certificate[]> => requestApi('/miembro/certificados');
