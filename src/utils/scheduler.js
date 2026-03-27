import { format, addDays, startOfMonth, endOfMonth, isSunday, isSaturday, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const DAYS_PT = [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado'
];

export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Parse 'yyyy-MM-dd' as LOCAL date (noon) to avoid UTC timezone shift
// Without this, '2026-04-01' becomes March 31 at 21h in Brazil (UTC-3)
function localDate(dateStr) {
    return new Date(dateStr + 'T12:00:00');
}

function isOnVacation(consultantName, dateStr, vacations) {
    if (!vacations || vacations.length === 0) return false;
    const d = localDate(dateStr);
    return vacations.some(v =>
        v.consultant === consultantName &&
        isWithinInterval(d, { start: localDate(v.startDate), end: localDate(v.endDate) })
    );
}

export function generateSchedule(monthDate, consultants, holidays, overrides = {}, initialWeekdayIndex = 0, initialSaturdayIndex = 0, vacations = []) {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const schedule = [];

    // Trackers for rotations
    let weekdayIndex = initialWeekdayIndex;
    let saturdayIndex = initialSaturdayIndex;

    let current = start;
    while (current <= end) {
        const isSun = isSunday(current);
        const isSat = isSaturday(current);
        const dateStr = format(current, 'yyyy-MM-dd');
        const holiday = holidays.find(h => isSameDay(localDate(h.date), current));

        let consultant = '';
        let saturdayConsultants = null; // array for Saturdays with multiple consultants

        // 1. Check for manual override first
        if (overrides[dateStr]) {
            const ov = overrides[dateStr];
            if (isSat && Array.isArray(ov)) {
                saturdayConsultants = ov;
                consultant = ov.join(' + ');
            } else {
                consultant = ov;
            }
            // Even if overridden, we might want to advance the counter
            // if it WAS a rotation day, but usually for swaps we just replace.
            // Let's advance counter ONLY if it's NOT a Sunday or Holiday
            if (!isSun && !holiday) {
                if (isSat) saturdayIndex++;
                else weekdayIndex++;
            }
        }
        // 2. Standard Logic
        else if (isSun) {
            consultant = '#';
        } else if (holiday) {
            consultant = holiday.name || 'Feriado';
        } else if (isSat) {
            // Find next available consultant (skip those on vacation)
            let attempts = 0;
            while (attempts < consultants.length) {
                const candidate = consultants[saturdayIndex % consultants.length];
                if (!isOnVacation(candidate, dateStr, vacations)) {
                    consultant = candidate;
                    break;
                }
                saturdayIndex++;
                attempts++;
            }
            if (attempts >= consultants.length) {
                consultant = '⚠ Todas ausentes';
            }
            saturdayConsultants = [consultant];
            saturdayIndex++;
        } else {
            // Find next available consultant (skip those on vacation)
            let attempts = 0;
            while (attempts < consultants.length) {
                const candidate = consultants[weekdayIndex % consultants.length];
                if (!isOnVacation(candidate, dateStr, vacations)) {
                    consultant = candidate;
                    break;
                }
                weekdayIndex++;
                attempts++;
            }
            if (attempts >= consultants.length) {
                consultant = '⚠ Todas ausentes';
            }
            weekdayIndex++;
        }

        schedule.push({
            date: dateStr,
            formattedDate: format(current, 'dd/MM/yyyy'),
            dayOfWeek: DAYS_PT[current.getDay()],
            consultant,
            saturdayConsultants,
            isWeekend: isSat || isSun,
            isHoliday: !!holiday,
            isOverridden: !!overrides[dateStr],
            hasVacation: consultants.some(c => isOnVacation(c, dateStr, vacations))
        });

        current = addDays(current, 1);
    }

    return schedule;
}
