import test from 'node:test';
import assert from 'node:assert/strict';
import {
  layoutTimelineTrips,
  TIMELINE_CARD_HEIGHT,
  TIMELINE_LANE_HEIGHT,
  timelineCardTop,
  timelineRowHeight,
  tripTimePosition,
} from '../src/lib/timelineLayout.ts';

const FROM = '2026-11-09';
const MINUTES_PER_DAY = 24 * 60;

const trip = (id, startIso, endIso) => ({
  id,
  tripNumber: id.toUpperCase(),
  plannedDeparture: startIso,
  plannedArrival: endIso,
  status: 'planned',
  orders: [],
});

test('consecutive trips on one truck stay on one chronological lane', () => {
  const trips = [
    trip('b', '2026-11-09T18:00:00.000Z', '2026-11-10T08:00:00.000Z'),
    trip('a', '2026-11-09T06:00:00.000Z', '2026-11-09T16:00:00.000Z'),
  ];
  const layout = layoutTimelineTrips(trips, FROM, MINUTES_PER_DAY);
  assert.equal(layout.laneCount, 1);
  assert.equal(layout.byId.get('a').lane, 0);
  assert.equal(layout.byId.get('b').lane, 0);
  assert.equal(layout.byId.get('a').ordinal, 1, 'earliest trip is first');
  assert.equal(layout.byId.get('b').ordinal, 2);
  assert.ok(layout.byId.get('a').startMin < layout.byId.get('b').startMin);
});

test('overlapping trips get separate sub-lanes and both stay addressable', () => {
  const trips = [
    trip('a', '2026-11-09T06:00:00.000Z', '2026-11-09T16:00:00.000Z'),
    trip('b', '2026-11-09T08:00:00.000Z', '2026-11-09T12:00:00.000Z'),
  ];
  const layout = layoutTimelineTrips(trips, FROM, MINUTES_PER_DAY);
  assert.equal(layout.laneCount, 2);
  assert.equal(layout.byId.get('a').lane, 0);
  assert.equal(layout.byId.get('b').lane, 1);
  assert.equal(layout.byId.get('a').overlapCount, 1);
  assert.equal(layout.byId.get('a').ordinal, 1);
  assert.equal(layout.byId.get('b').ordinal, 2);
  // Every trip keeps its own id: a click can never open another trip.
  assert.equal(layout.placed.length, 2);
  assert.deepEqual([...layout.byId.keys()].sort(), ['a', 'b']);
});

test('cards stay compact and lanes stay denser than the old 86px rows', () => {
  assert.ok(TIMELINE_CARD_HEIGHT <= 46);
  assert.ok(TIMELINE_LANE_HEIGHT <= 52);
  assert.equal(timelineCardTop(0), 6);
  assert.equal(timelineCardTop(2), 106);
  assert.ok(timelineRowHeight(3) < 3 * 86);
});

test('repositioning gaps are reported between consecutive trips on a lane', () => {
  const trips = [
    trip('a', '2026-11-09T06:00:00.000Z', '2026-11-09T10:00:00.000Z'),
    trip('b', '2026-11-09T12:00:00.000Z', '2026-11-09T18:00:00.000Z'),
  ];
  const layout = layoutTimelineTrips(trips, FROM, MINUTES_PER_DAY);
  assert.equal(layout.repositioning.length, 1);
  assert.equal(layout.repositioning[0].minutes, 120);
  assert.equal(layout.repositioning[0].fromId, 'a');
  assert.equal(layout.repositioning[0].toId, 'b');
});

test('a missing planned arrival does not hide the trip', () => {
  const trips = [{ id: 'x', tripNumber: 'X', plannedDeparture: '2026-11-09T06:00:00.000Z', plannedArrival: null }];
  const layout = layoutTimelineTrips(trips, FROM, MINUTES_PER_DAY);
  assert.equal(layout.placed.length, 1);
  assert.ok(layout.byId.get('x').endMin > layout.byId.get('x').startMin);
});

test('positions clamp inside the visible range', () => {
  const before = tripTimePosition({ plannedDeparture: '2026-11-08T20:00:00.000Z', plannedArrival: '2026-11-09T02:00:00.000Z' }, FROM, MINUTES_PER_DAY);
  assert.equal(before.startMin, 0);
  assert.ok(before.left >= 0 && before.left <= 100);
  assert.equal(tripTimePosition({ plannedDeparture: null, plannedArrival: null }, FROM, MINUTES_PER_DAY), null);
});
