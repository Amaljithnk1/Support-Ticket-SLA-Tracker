import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { addMinutes, isWeekend, format } from 'date-fns';
import { Priority, SLAState, SLA_POLICIES, BUSINESS_HOURS } from './config';

function getDateStringInTimezone(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, 'yyyy-MM-dd');
}

export function isBusinessMinute(date: Date, timeZone: string, holidayStrings: Set<string>): boolean {
  const zonedDate = toZonedTime(date, timeZone);
  
  if (isWeekend(zonedDate)) return false;
  
  const dateString = format(zonedDate, 'yyyy-MM-dd');
  if (holidayStrings.has(dateString)) return false;
  
  const hour = zonedDate.getHours();
  if (hour < BUSINESS_HOURS.startHour || hour >= BUSINESS_HOURS.endHour) return false;
  
  return true;
}

export function addBusinessMinutes(startDate: Date, businessMinutes: number, timeZone: string, holidays: Date[]): Date {
  if (businessMinutes === 0) return startDate;

  const holidayStrings = new Set(holidays.map(h => getDateStringInTimezone(h, timeZone)));
  let current = startDate;
  let remaining = businessMinutes;
  
  while (remaining > 0) {
    if (isBusinessMinute(current, timeZone, holidayStrings)) {
      remaining -= 1;
    }
    
    if (remaining > 0) {
      current = addMinutes(current, 1);
    }
  }
  
  // Advance one final minute so the due time hits the exact expected boundary (e.g., 10:00 instead of 09:59)
  return addMinutes(current, 1);
}

export function getElapsedBusinessMinutes(start: Date, end: Date, timeZone: string, holidays: Date[]): number {
  if (end <= start) return 0;
  
  const holidayStrings = new Set(holidays.map(h => getDateStringInTimezone(h, timeZone)));
  let elapsed = 0;
  let current = start;
  
  while (current < end) {
    if (isBusinessMinute(current, timeZone, holidayStrings)) {
      elapsed++;
    }
    current = addMinutes(current, 1);
  }
  
  return elapsed;
}

export function calculateSlaTargets(createdAt: Date, priority: Priority, timeZone: string, holidays: Date[]): { firstResponseDueAt: Date, resolutionDueAt: Date } {
  const policy = SLA_POLICIES[priority];
  
  const firstResponseDueAt = addBusinessMinutes(createdAt, policy.firstResponseHours * 60, timeZone, holidays);
  const resolutionDueAt = addBusinessMinutes(createdAt, policy.resolutionHours * 60, timeZone, holidays);
  
  return { firstResponseDueAt, resolutionDueAt };
}

export function calculateSlaState(dueAt: Date, actualEventAt: Date | null, now: Date, totalBudgetMinutes: number, createdAt: Date, timeZone: string, holidays: Date[]): SLAState {
  if (actualEventAt) {
    if (actualEventAt > dueAt) {
      return SLAState.BREACHED;
    }
    return SLAState.ON_TRACK;
  }
  
  if (now > dueAt) {
    return SLAState.BREACHED;
  }
  
  const elapsedBusinessMinutes = getElapsedBusinessMinutes(createdAt, now, timeZone, holidays);
  
  // Boundary definition: AT_RISK if strictly > 75%
  if (elapsedBusinessMinutes > (totalBudgetMinutes * 0.75)) {
    return SLAState.AT_RISK;
  }
  
  return SLAState.ON_TRACK;
}
