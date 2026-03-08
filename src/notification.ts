// Dismissible notification utility with 3-day auto-hide
const STORAGE_KEY = 'cyanv3_notification_sulfur_fixed';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export interface NotificationState {
    dismissed: boolean;
    dismissedAt: number | null;
}

export function shouldShowNotification(): boolean {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return true;
        
        const state: NotificationState = JSON.parse(stored);
        if (!state.dismissed || !state.dismissedAt) return true;
        
        const now = Date.now();
        const elapsed = now - state.dismissedAt;
        
        // Show again if 3 days have passed
        return elapsed >= THREE_DAYS_MS;
    } catch {
        return true;
    }
}

export function dismissNotification(): void {
    try {
        const state: NotificationState = {
            dismissed: true,
            dismissedAt: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('[notification] failed to dismiss:', e);
    }
}

export function resetNotification(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error('[notification] failed to reset:', e);
    }
}
