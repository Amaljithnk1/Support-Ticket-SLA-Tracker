export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum SLAState {
  ON_TRACK = 'ON_TRACK',
  AT_RISK = 'AT_RISK',
  BREACHED = 'BREACHED',
}

export const SLA_POLICIES = {
  [Priority.URGENT]: { firstResponseHours: 1, resolutionHours: 4 },
  [Priority.HIGH]: { firstResponseHours: 4, resolutionHours: 24 },
  [Priority.MEDIUM]: { firstResponseHours: 8, resolutionHours: 48 },
  [Priority.LOW]: { firstResponseHours: 24, resolutionHours: 72 },
};

export const BUSINESS_HOURS = {
  startHour: 9, // 09:00
  endHour: 18,  // 18:00
};
