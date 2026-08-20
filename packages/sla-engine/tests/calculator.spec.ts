import { describe, expect, test } from 'bun:test';
import { Priority, SLAState } from '../src/config';
import { calculateSlaTargets, getElapsedBusinessMinutes, calculateSlaState, addBusinessMinutes } from '../src/calculator';

describe('SLA Engine', () => {
  const TIMEZONE = 'Asia/Kolkata';

  describe('Business Minutes Math (addBusinessMinutes)', () => {
    test('Normal weekday calculation (Monday 09:00 -> 1 hour -> 10:00)', () => {
      // 2026-08-17 is a Monday. Asia/Kolkata is UTC+5:30. 
      // So 03:30 UTC is 09:00 IST.
      const start = new Date('2026-08-17T03:30:00Z'); 
      const result = addBusinessMinutes(start, 60, TIMEZONE, []);
      // 10:00 IST = 04:30 UTC
      expect(result.toISOString()).toBe('2026-08-17T04:30:00.000Z');
    });

    test('Ticket created before business hours starts counting at 09:00', () => {
      // Monday 07:00 IST = 01:30 UTC
      const start = new Date('2026-08-17T01:30:00Z');
      const result = addBusinessMinutes(start, 60, TIMEZONE, []);
      // 10:00 IST = 04:30 UTC
      expect(result.toISOString()).toBe('2026-08-17T04:30:00.000Z');
    });

    test('Ticket created after business hours starts counting next day at 09:00', () => {
      // Monday 20:00 IST = 14:30 UTC
      const start = new Date('2026-08-17T14:30:00Z');
      const result = addBusinessMinutes(start, 60, TIMEZONE, []);
      // Tuesday 10:00 IST = Tuesday 04:30 UTC (2026-08-18)
      expect(result.toISOString()).toBe('2026-08-18T04:30:00.000Z');
    });

    test('Friday evening rolls over to Monday morning', () => {
      // Friday 17:59 IST = 12:29 UTC
      const start = new Date('2026-08-21T12:29:00Z');
      const result = addBusinessMinutes(start, 2, TIMEZONE, []);
      // 1 minute Friday, 1 minute Monday -> Monday 09:01 IST = 03:31 UTC (2026-08-24)
      expect(result.toISOString()).toBe('2026-08-24T03:31:00.000Z');
    });

    test('Skips configured holidays', () => {
      // Friday 17:00 IST = 11:30 UTC. Add 3 hours (180 mins). 
      // Monday is a holiday. It should finish Tuesday 11:00 IST (05:30 UTC).
      const start = new Date('2026-08-21T11:30:00Z');
      const holidays = [new Date('2026-08-24T00:00:00Z')]; // Monday
      const result = addBusinessMinutes(start, 180, TIMEZONE, holidays);
      expect(result.toISOString()).toBe('2026-08-25T05:30:00.000Z');
    });
  });

  describe('SLA State Freezing and Boundaries', () => {
    test('Boundary: 75.00% is ON_TRACK', () => {
      const createdAt = new Date('2026-08-17T03:30:00Z'); // Mon 09:00
      const now = new Date('2026-08-17T04:15:00Z'); // Mon 09:45
      const dueAt = new Date('2026-08-17T04:30:00Z'); // Mon 10:00
      // 45 mins elapsed out of 60 mins total budget = exactly 75%
      const state = calculateSlaState(dueAt, null, now, 60, createdAt, TIMEZONE, []);
      expect(state).toBe(SLAState.ON_TRACK);
    });

    test('Boundary: 75.01% (or more) is AT_RISK', () => {
      const createdAt = new Date('2026-08-17T03:30:00Z'); // Mon 09:00
      const now = new Date('2026-08-17T04:16:00Z'); // Mon 09:46
      const dueAt = new Date('2026-08-17T04:30:00Z'); // Mon 10:00
      // 46 mins elapsed out of 60 mins total budget = 76.66% > 75%
      const state = calculateSlaState(dueAt, null, now, 60, createdAt, TIMEZONE, []);
      expect(state).toBe(SLAState.AT_RISK);
    });

    test('Freeze: SLA completed on time, now moves far past dueAt later — state must remain frozen ON_TRACK', () => {
      const createdAt = new Date('2026-08-17T03:30:00Z'); // Mon 09:00
      const dueAt = new Date('2026-08-17T04:30:00Z'); // Mon 10:00
      const actualEventAt = new Date('2026-08-17T04:00:00Z'); // Mon 09:30 (On Time)
      
      // Look at it 3 days later
      const now = new Date('2026-08-20T12:00:00Z'); 
      const state = calculateSlaState(dueAt, actualEventAt, now, 60, createdAt, TIMEZONE, []);
      expect(state).toBe(SLAState.ON_TRACK); // Not breached!
    });

    test('Freeze: SLA completed late — state is frozen BREACHED, not AT_RISK', () => {
      const createdAt = new Date('2026-08-17T03:30:00Z'); // Mon 09:00
      const dueAt = new Date('2026-08-17T04:30:00Z'); // Mon 10:00
      const actualEventAt = new Date('2026-08-17T05:00:00Z'); // Mon 10:30 (Late)
      
      // Look at it exactly when resolved
      const now = new Date('2026-08-17T05:00:00Z'); 
      const state = calculateSlaState(dueAt, actualEventAt, now, 60, createdAt, TIMEZONE, []);
      expect(state).toBe(SLAState.BREACHED); 
    });
  });
});
