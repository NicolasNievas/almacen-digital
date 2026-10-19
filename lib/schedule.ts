/**
 * Horarios de atención de la tienda. Índice = día de la semana (0 = domingo ... 6 = sábado).
 * Cada franja es un rango [start, end) en formato "HH:MM" de 24 horas.
 */
export type TimeRange = { start: string; end: string };

export const WEEKDAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

const MORNING: TimeRange = { start: "09:00", end: "13:00" };
const AFTERNOON: TimeRange = { start: "17:00", end: "22:00" };

/** Lunes a sábado con dos franjas; domingo cerrado. */
export const STORE_HOURS: readonly TimeRange[][] = [
  [], // Domingo
  [MORNING, AFTERNOON],
  [MORNING, AFTERNOON],
  [MORNING, AFTERNOON],
  [MORNING, AFTERNOON],
  [MORNING, AFTERNOON],
  [MORNING, AFTERNOON], // Sábado
];

/** Intervalo entre turnos ofrecidos, en minutos. */
export const SLOT_MINUTES = 15;

/** Margen mínimo (min) antes del próximo turno para poder preparar el pedido. */
export const PICKUP_LEAD_MINUTES = 30;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toHHMM(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getRangesForDay(day: number): TimeRange[] {
  return [...(STORE_HOURS[day] ?? [])];
}

/** Formatea las franjas como "09:00-13:00 / 17:00-22:00". */
export function formatRanges(ranges: TimeRange[]): string {
  return ranges.map((r) => `${r.start}-${r.end}`).join(" / ");
}

/** Turnos cada `SLOT_MINUTES` dentro de las franjas del día, desde `fromMinutes` en adelante. */
export function generateSlotsForDate(date: Date, fromMinutes = 0): string[] {
  const slots: string[] = [];
  for (const range of getRangesForDay(date.getDay())) {
    const start = toMinutes(range.start);
    const end = toMinutes(range.end);
    for (let m = start; m + SLOT_MINUTES <= end; m += SLOT_MINUTES) {
      if (m >= fromMinutes) slots.push(toHHMM(m));
    }
  }
  return slots;
}

/** ¿El local está abierto en este instante? */
export function isOpenNow(now: Date = new Date()): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return getRangesForDay(now.getDay()).some(
    (r) => minutes >= toMinutes(r.start) && minutes < toMinutes(r.end),
  );
}

export type PickupInfo = {
  /** Turnos válidos para seleccionar ("HH:MM"). */
  slots: string[];
  /** Franjas de atención del día elegido. */
  ranges: TimeRange[];
  /** Etiqueta del día de retiro: "hoy" | "mañana" | "miércoles". */
  dayLabel: string;
  isToday: boolean;
  /** ¿El local está abierto ahora mismo? */
  currentlyOpen: boolean;
};

/**
 * Turnos de retiro disponibles: los que quedan hoy (respetando el margen de
 * preparación) o los del próximo día con atención si hoy ya no hay opciones.
 */
export function getPickupInfo(now: Date = new Date()): PickupInfo {
  const todaySlots = generateSlotsForDate(
    now,
    now.getHours() * 60 + now.getMinutes() + PICKUP_LEAD_MINUTES,
  );

  if (todaySlots.length > 0) {
    return {
      slots: todaySlots,
      ranges: getRangesForDay(now.getDay()),
      dayLabel: "hoy",
      isToday: true,
      currentlyOpen: isOpenNow(now),
    };
  }

  for (let i = 1; i <= 7; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    const slots = generateSlotsForDate(day, 0);
    if (slots.length > 0) {
      return {
        slots,
        ranges: getRangesForDay(day.getDay()),
        dayLabel: i === 1 ? "mañana" : WEEKDAY_NAMES[day.getDay()].toLowerCase(),
        isToday: false,
        currentlyOpen: false,
      };
    }
  }

  return { slots: [], ranges: [], dayLabel: "", isToday: true, currentlyOpen: false };
}
