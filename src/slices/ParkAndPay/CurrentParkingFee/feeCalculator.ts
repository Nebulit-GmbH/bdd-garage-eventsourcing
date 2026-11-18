// Port of GarageFeeCalculator.java. Works in integer cents; datetimes are wall-clock (treated as UTC fields).
const SLOT_MIN = 30;
const DAILY = 1400;
const NIGHT_FLAT = 700;
const DAY_MS = 86_400_000;
const MIN_MS = 60_000;

const rateOfSlot = (s: number) => (s <= 2 ? 60 : s <= 3 ? 80 : 110);
const startedSlots = (ms: number) => Math.ceil(ms / MIN_MS / SLOT_MIN);
const slotsFee = (ms: number) => {
    let t = 0;
    for (let s = 1; s <= startedSlots(ms); s++) t += rateOfSlot(s);
    return t;
};

const easterSunday = (y: number): Date => {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, month - 1, day));
};

const isSundayOrHoliday = (d: Date): boolean => {
    if (d.getUTCDay() === 0) return true;
    const m = d.getUTCMonth() + 1, day = d.getUTCDate();
    const fixed: Record<number, number[]> = {1: [1, 6], 5: [1], 8: [15], 10: [3], 11: [1], 12: [25, 26]};
    if (fixed[m]?.includes(day)) return true;
    const dayStart = Date.UTC(d.getUTCFullYear(), m - 1, day);
    const off = (dayStart - easterSunday(d.getUTCFullYear()).getTime()) / DAY_MS;
    return [-2, 1, 39, 50, 60].includes(off);
};

const midnight = (t: number) => Math.floor(t / DAY_MS) * DAY_MS;

const partialDayFee = (entry: number, exit: number): number => {
    const tod = entry - midnight(entry);
    const daytime = tod >= 7 * 3_600_000 && tod < 19 * 3_600_000;
    if (daytime && !isSundayOrHoliday(new Date(entry))) {
        return Math.min(slotsFee(exit - entry), DAILY);
    }
    const periodEnd = daytime
        ? midnight(entry) + 19 * 3_600_000
        : tod < 7 * 3_600_000 ? midnight(entry) + 7 * 3_600_000 : midnight(entry) + DAY_MS + 7 * 3_600_000;
    const inside = Math.min(slotsFee(Math.min(exit, periodEnd) - entry), NIGHT_FLAT);
    const after = exit > periodEnd ? startedSlots(exit - periodEnd) * 110 : 0;
    return Math.min(inside + after, DAILY);
};

/** Fee in EUR for a stay. entry/exit: ISO local datetimes. */
export const calculateFee = (vehicleType: string, entryIso: string, exitIso: string): number => {
    const parse = (s: string) => Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s.replace(/([zZ]|[+-]\d\d:?\d\d)$/, '') + 'Z' : s + 'Z');
    const entry = parse(entryIso), exit = parse(exitIso);
    if (exit < entry) throw new Error('exit before entry');
    const fullDays = Math.floor((exit - entry) / DAY_MS);
    const cents = fullDays * DAILY + partialDayFee(entry + fullDays * DAY_MS, exit);
    return (vehicleType === 'MOTORBIKE' ? Math.round(cents / 2) : cents) / 100;
};
