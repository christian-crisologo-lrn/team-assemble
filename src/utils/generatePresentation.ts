import { addDays, isWithinInterval, parse, startOfDay } from 'date-fns';
import type { Member, Role, Sprint } from '../types';
import { rotateRandom, rotateSequential } from './rotation';

export type GenerateStrategy = 'sequential' | 'random';

export function parseGenerateStrategy(value: string | null): GenerateStrategy {
    return value === 'random' ? 'random' : 'sequential';
}

export function isGenerateRequested(value: string | null): boolean {
    return value === '1' || value === 'true';
}

export function parseGenerateDate(value: string | null): Date | undefined {
    if (!value) return undefined;
    const parsed = parse(value, 'yyyy-MM-dd', new Date());
    if (Number.isNaN(parsed.getTime())) return undefined;
    return startOfDay(parsed);
}

export function findSprintForDate(sprints: Sprint[], date: Date): Sprint | undefined {
    const day = startOfDay(date);
    const covering = sprints.filter((sprint) => {
        const start = startOfDay(new Date(sprint.start_date));
        const end = startOfDay(new Date(sprint.end_date));
        if (end < start) return false;
        return isWithinInterval(day, { start, end });
    });

    return covering.find((sprint) => sprint.status === 'active') ?? covering[covering.length - 1];
}

export function buildGeneratedSprint(
    members: Member[],
    roles: Role[],
    sprints: Sprint[],
    strategy: GenerateStrategy,
    startDate: Date = new Date()
): Omit<Sprint, 'team_id'> {
    const lastSprint = sprints[sprints.length - 1];
    const previousAssignments = lastSprint ? lastSprint.assignments : {};
    const assignments = strategy === 'random'
        ? rotateRandom(members, roles, previousAssignments)
        : rotateSequential(members, roles, previousAssignments);

    const endDate = addDays(startDate, 17);

    return {
        id: crypto.randomUUID(),
        name: `Sprint ${sprints.length + 1}`,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        assignments,
        created_at: new Date().toISOString()
    };
}

export function presentationGeneratePath(
    teamId: string,
    extras?: { strategy?: GenerateStrategy; date?: string }
): string {
    const params = new URLSearchParams({ generate: '1', team: teamId });
    if (extras?.strategy && extras.strategy !== 'sequential') {
        params.set('strategy', extras.strategy);
    }
    if (extras?.date) {
        params.set('date', extras.date);
    }
    return `/presentation?${params.toString()}`;
}
