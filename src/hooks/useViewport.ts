import { useState, useEffect } from "react";

// Added "quarter" zoom option
export type ZoomLevel = "hour" | "day" | "week" | "month" | "quarter" | "year";

// Computes the visible [start, end] range for a zoom level, centered on now.
// Shared by the initial state (so the very first render already shows the
// right range, instead of a single day that gets corrected a moment later)
// and by jumpToNow/the zoom-change effect.
function computeRange(zoom: ZoomLevel): { start: Date; end: Date } {
  const now = new Date();
  const s = new Date(now);
  const e = new Date(now);
  switch (zoom) {
    case "hour":
      s.setHours(now.getHours() - 6);
      e.setHours(now.getHours() + 6);
      break;
    case "day":
      s.setDate(now.getDate() - 3);
      e.setDate(now.getDate() + 3);
      break;
    case "week":
      // Show 21 days total (10 days before and 10 after)
      s.setDate(now.getDate() - 10);
      e.setDate(now.getDate() + 10);
      break;
    case "month":
      // Show 4 weeks (28 days). Center roughly around today: 14 days before, 13 after
      s.setDate(now.getDate() - 14);
      e.setDate(now.getDate() + 13);
      break;
    case "quarter": {
      // Show the current calendar quarter (exact quarter boundaries)
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3; // 0,3,6,9
      s.setMonth(quarterStartMonth, 1); // first day of quarter
      s.setHours(0, 0, 0, 0);
      // End: last day of the third month in the quarter
      const quarterEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0); // day 0 of next quarter month = last day prev
      quarterEnd.setHours(23, 59, 59, 999);
      e.setTime(quarterEnd.getTime());
      break;
    }
    case "year":
      s.setMonth(0, 1); // January 1st of current year
      s.setHours(0, 0, 0, 0);
      e.setMonth(11, 31); // December 31st of current year
      e.setHours(23, 59, 59, 999);
      break;
  }
  // Normalize to start/end of day
  s.setHours(0, 0, 0, 0);
  e.setHours(23, 59, 59, 999);
  return { start: s, end: e };
}

export function useViewport(initialZoom: ZoomLevel = "day") {
  const [zoom, setZoom] = useState<ZoomLevel>(initialZoom);
  const [startDate, setStartDate] = useState<Date>(
    () => computeRange(initialZoom).start
  );
  const [endDate, setEndDate] = useState<Date>(
    () => computeRange(initialZoom).end
  );

  useEffect(() => {
    // Adjust viewport when zoom changes
    const { start, end } = computeRange(zoom);
    setStartDate(start);
    setEndDate(end);
  }, [zoom]);

  const jumpToNow = () => {
    const { start, end } = computeRange(zoom);
    setStartDate(start);
    setEndDate(end);
  };

  return {
    zoom,
    setZoom,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    jumpToNow,
  };
}
