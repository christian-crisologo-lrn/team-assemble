export const ERROR_MESSAGES = {
    generic: 'Something went wrong. Please try again.',
    invalidCredentials: 'Invalid team name or password',
    duplicateName: 'That name is already in use. Try a different one.',
    notFound: 'We could not find what you were looking for.',
    loginFailed: 'We could not log you in right now. Please try again. Please check your team name and password.',
    createTeamFailed: 'We could not create your team right now. Please try again.',
    presentationLoadFailed: 'We could not load this presentation right now. Please try again.'
} as const;

export const ERROR_MESSAGE_TEMPLATES = {
    connectionFailed: (action: string) => `We couldn't ${action} right now. Check your connection and try again.`,
    permissionDenied: (action: string) => `You don't have permission to ${action}.`,
    serviceUnavailable: (action: string) => `We couldn't ${action} right now. Please try again in a moment.`
} as const;

type FriendlyErrorOptions = {
    action?: string;
    fallback?: string;
};

export function getFriendlyErrorMessage(error: unknown, options: FriendlyErrorOptions = {}): string {
    const { action = 'complete your request', fallback = ERROR_MESSAGES.generic } = options;

    const message = error instanceof Error
        ? error.message
        : typeof error === 'string'
            ? error
            : '';

    const normalized = message.toLowerCase();

    if (!normalized) {
        return fallback;
    }

    if (
        normalized.includes('failed to fetch') ||
        normalized.includes('networkerror') ||
        normalized.includes('network request failed') ||
        normalized.includes('fetch') ||
        normalized.includes('timeout') ||
        normalized.includes('load failed')
    ) {
        return ERROR_MESSAGE_TEMPLATES.connectionFailed(action);
    }

    if (
        normalized.includes('duplicate key') ||
        normalized.includes('already exists') ||
        normalized.includes('unique constraint')
    ) {
        return ERROR_MESSAGES.duplicateName;
    }

    if (
        normalized.includes('jwt') ||
        normalized.includes('permission') ||
        normalized.includes('not allowed') ||
        normalized.includes('unauthorized') ||
        normalized.includes('forbidden')
    ) {
        return ERROR_MESSAGE_TEMPLATES.permissionDenied(action);
    }

    if (
        normalized.includes('not found') ||
        normalized.includes('no rows')
    ) {
        return ERROR_MESSAGES.notFound;
    }

    if (
        normalized.includes('supabase') ||
        normalized.includes('postgrest') ||
        normalized.includes('database') ||
        normalized.includes('server')
    ) {
        return ERROR_MESSAGE_TEMPLATES.serviceUnavailable(action);
    }

    return fallback;
}