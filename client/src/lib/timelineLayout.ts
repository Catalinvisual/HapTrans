/**
 * Premium timeline layout for the Planning Gantt.
 *
 * Pure geometry, extracted from the page so it can be regression-tested:
 *  - one chronological lane per truck while trips do not overlap,
 *  - a separate compact sub-lane when two trips genuinely overlap,
 *  - empty repositioning gaps between consecutive trips on the same lane.
 *
 * Every trip keeps its own entry, so a card can never hide or overwrite another
 * trip, and each entry keeps its trip id for the click handler.
 */

export const TIMELINE_CARD_HEIGHT = 48;
export const TIMELINE_LANE_HEIGHT = 56;
export const TIMELINE_LANE_GAP = 8;
export const TIMELINE_MIN_CARD_MINUTES = 30;

export interface TimelineTripEntry {
  trip: any;
  startMin: number;
  endMin: number;
  lane: number;
  ordinal: number;
  laneCount: number;
  overlapCount: number;
}

export interface TimelineLayout {
  byId: Map<string, TimelineTripEntry>;
  laneCount: number;
  placed: Array<{ trip: any; startMin: number; endMin: number; lane: number }>;
  repositioning: Array<{ left: number; width: number; minutes: number; fromId: string; toId: string; lane: number }>;
}

const parseDay = (value: string): Date => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  const now = new Date();
  return new Date(year || now.getFullYear(), (month || 1) - 1, day || 1);
};

/** Minutes from the start of the selected day. */
export function toTimelineMinutes(dateStr: any, baseDateStr: string): number {
  if (!dateStr) return -1;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return -1;
  return (date.getTime() - parseDay(baseDateStr).getTime()) / 60000;
}

export function tripTimePosition(trip: any, from: string, totalMinutes: number) {
  const departure = toTimelineMinutes(trip?.plannedDeparture, from);
  const arrival = toTimelineMinutes(trip?.plannedArrival, from);
  if (departure < 0 && arrival < 0) return null;
  const startMin = Math.max(0, departure < 0 ? 0 : departure);
  const endMin = Math.min(totalMinutes, arrival < 0 ? totalMinutes : arrival);
  const width = Math.max(endMin - startMin, TIMELINE_MIN_CARD_MINUTES);
  return {
    left: (startMin / totalMinutes) * 100,
    width: (width / totalMinutes) * 100,
    startMin,
    endMin,
  };
}

export function layoutTimelineTrips(trips: any[], from: string, totalMinutes: number): TimelineLayout {
  const entries = (trips || [])
    .map((trip, index) => {
      const position = tripTimePosition(trip, from, totalMinutes) || { startMin: 0, endMin: 60 };
      return {
        trip,
        index,
        startMin: position.startMin,
        endMin: Math.max(position.endMin, position.startMin + TIMELINE_MIN_CARD_MINUTES),
      };
    })
    .sort((a, b) => a.startMin - b.startMin || a.index - b.index);

  const laneEnds: number[] = [];
  const placed: Array<{ trip: any; startMin: number; endMin: number; lane: number }> = [];
  for (const entry of entries) {
    let lane = laneEnds.findIndex((end) => entry.startMin >= end - 1);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(entry.endMin);
    } else {
      laneEnds[lane] = Math.max(laneEnds[lane], entry.endMin);
    }
    placed.push({ ...entry, lane });
  }

  const overlapCounts = new Map<string, number>();
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      if (placed[i].startMin < placed[j].endMin && placed[j].startMin < placed[i].endMin) {
        overlapCounts.set(placed[i].trip.id, (overlapCounts.get(placed[i].trip.id) || 0) + 1);
        overlapCounts.set(placed[j].trip.id, (overlapCounts.get(placed[j].trip.id) || 0) + 1);
      }
    }
  }

  const laneCount = Math.max(1, laneEnds.length);
  const byId = new Map(
    placed.map((entry, index) => [
      entry.trip.id,
      {
        ...entry,
        ordinal: index + 1,
        laneCount,
        overlapCount: overlapCounts.get(entry.trip.id) || 0,
      },
    ]),
  );

  const repositioning: TimelineLayout['repositioning'] = [];
  for (let lane = 0; lane < laneCount; lane += 1) {
    const laneTrips = placed.filter((entry) => entry.lane === lane);
    for (let i = 1; i < laneTrips.length; i += 1) {
      const previous = laneTrips[i - 1];
      const next = laneTrips[i];
      const gap = next.startMin - previous.endMin;
      if (gap >= 15) {
        repositioning.push({
          left: (previous.endMin / totalMinutes) * 100,
          width: (gap / totalMinutes) * 100,
          minutes: Math.round(gap),
          fromId: previous.trip.id,
          toId: next.trip.id,
          lane,
        });
      }
    }
  }

  return { byId, laneCount, placed, repositioning };
}

export const timelineRowHeight = (laneCount: number): number =>
  Math.max(72, TIMELINE_LANE_GAP * 2 + Math.max(1, laneCount) * TIMELINE_LANE_HEIGHT);

export const timelineCardTop = (lane: number): number =>
  TIMELINE_LANE_GAP + lane * TIMELINE_LANE_HEIGHT;
