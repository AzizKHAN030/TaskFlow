import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek
} from "date-fns";

export const WEEK_STARTS_ON = 1;

export function getWeekRange(baseDate: Date) {
  const start = startOfWeek(baseDate, { weekStartsOn: WEEK_STARTS_ON });
  const end = addDays(start, 6);
  return { start, end };
}

export function getMonthCalendarRange(baseDate: Date) {
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);

  return {
    start: startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON })
  };
}

export function eachDayInclusive(start: Date, end: Date) {
  const result: Date[] = [];
  let current = new Date(start);

  while (current <= end) {
    result.push(new Date(current));
    current = addDays(current, 1);
  }

  return result;
}

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function parseDateKey(value: string) {
  return parseISO(value);
}

export function isWeekendIndex(dayIndex: number) {
  return dayIndex === 6 || dayIndex === 0;
}
