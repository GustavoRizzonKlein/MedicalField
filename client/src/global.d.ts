import type { MedicalFieldApi } from '../shared/contract';

declare global {
  interface Window {
    medicalField: MedicalFieldApi;
  }
}
