/**
 * Format a date string to display format
 * Handles both ISO format and dd/mm/yyyy HH:mm:ss format
 */
export function formatDateToLocalTimezone(dateString: string): string {
  try {
    if (!dateString) return '';

    // Remove leading single quote if present
    const cleanStr = dateString.startsWith("'") ? dateString.substring(1) : dateString;

    // Check if it's already in dd/mm/yyyy HH:mm:ss format
    // This format is assumed to be local time already (canonical string format in this project)
    const ddmmyyyyMatch = cleanStr.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
    if (ddmmyyyyMatch) {
      return cleanStr;
    }

    // Parse as Date (handles ISO format, serial numbers as strings, etc.)
    const date = new Date(cleanStr);
    if (isNaN(date.getTime())) {
      // Fallback for datetime-local input matches or other weird strings
      const datetimeLocalMatch = cleanStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (datetimeLocalMatch) {
        const [_, year, month, day, hours, minutes] = datetimeLocalMatch;
        return `${day}/${month}/${year} ${hours}:${minutes}:00`;
      }
      return cleanStr;
    }

    // Use local time methods to extract components
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Get current user's timezone offset
 */
export function getUserTimezone(): string {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset >= 0 ? '+' : '-';
  return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
