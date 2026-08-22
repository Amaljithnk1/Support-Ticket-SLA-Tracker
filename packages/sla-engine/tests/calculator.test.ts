import { describe, expect, test } from 'bun:test';
import { calculateSlaState, isBusinessMinute, addBusinessMinutes } from '../src/calculator';
import { SLAState } from '../src/config';

describe('SLA Engine', () => {
  const tz = 'Asia/Kolkata';

  test('isBusinessMinute correctly excludes weekends', () => {
    const saturday = new Date('2026-08-22T10:00:00Z');
    expect(isBusinessMinute(saturday, tz, new Set())).toBe(false);
  });

  test('isBusinessMinute correctly excludes holidays', () => {
    const monday = new Date('2026-08-24T10:00:00Z');
    const holidays = new Set(['2026-08-24']);
    expect(isBusinessMinute(monday, tz, holidays)).toBe(false);
  });

  test('calculateSlaState returns BREACHED if deadline passed', () => {
    const created = new Date('2026-08-24T10:00:00Z');
    const due = new Date('2026-08-24T14:00:00Z');
    const now = new Date('2026-08-24T15:00:00Z');
    expect(calculateSlaState(due, null, now, 240, created, tz, [])).toBe(SLAState.BREACHED);
  });

  test('calculateSlaState returns ON_TRACK (Met) if resolved before deadline', () => {
    const created = new Date('2026-08-24T10:00:00Z');
    const due = new Date('2026-08-24T14:00:00Z');
    const resolved = new Date('2026-08-24T11:00:00Z');
    const now = new Date('2026-08-24T15:00:00Z');
    expect(calculateSlaState(due, resolved, now, 240, created, tz, [])).toBe(SLAState.ON_TRACK);
  });


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




  describe('At-Risk Boundary Calculations', () => {
    it('computes 75% at-risk thresholds correctly considering business hours', () => {
      const monday9AM = new Date('2026-06-01T13:00:00Z');
      const targets = calculateSlaTargets(monday9AM, 'URGENT', 'America/New_York', []);
      expect(targets.firstResponseAtRiskAt).toEqual(new Date('2026-06-01T13:45:00Z'));
      expect(targets.resolutionAtRiskAt).toEqual(new Date('2026-06-01T16:00:00Z'));
    });
  });
});
