/**
 * Formats an ISO date string or raw Date string into human-readable format DD/MM/YYYY
 */
export const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return "Chưa rõ";
    try {
        // If it's already in DD/MM/YYYY format, return it
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            return dateStr;
        }
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return dateStr;
        }
        
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    } catch (e) {
        return dateStr;
    }
};
