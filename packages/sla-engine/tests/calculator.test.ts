import { describe, expect, test } from 'bun:test';
import { calculateSlaState, isBusinessMinute } from '../src/calculator';
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
});
