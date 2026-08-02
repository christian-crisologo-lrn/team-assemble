/**
 * Calculate the end date by counting only weekdays (Monday-Friday)
 * @param startDate - The starting date
 * @param weekdayCount - Number of weekdays to add (including the start date if it's a weekday)
 * @returns The end date after counting the specified weekdays
 */
export function addWeekdays(startDate: Date, weekdayCount: number): Date {
    const date = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < weekdayCount) {
        const dayOfWeek = date.getDay();
        
        // Check if it's a weekday (Monday=1 to Friday=5)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            daysAdded++;
        }

        // If we've added enough weekdays, break
        if (daysAdded >= weekdayCount) break;

        // Move to next day
        date.setDate(date.getDate() + 1);
    }

    return date;
}

/**
 * Get the number of weekdays between two dates (inclusive)
 * @param startDate - The start date
 * @param endDate - The end date
 * @returns The count of weekdays between the dates
 */
export function countWeekdays(startDate: Date, endDate: Date): number {
    let count = 0;
    const date = new Date(startDate);

    while (date <= endDate) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
        date.setDate(date.getDate() + 1);
    }

    return count;
}
