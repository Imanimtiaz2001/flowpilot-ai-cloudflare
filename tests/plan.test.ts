import { describe, expect, it } from 'vitest';
import { addTask, normalizePlan, planSchema, progress, toggleTask, updateTask } from '../src/lib/plan';
const raw = { goal: 'Interview in 7 days', summary: 'A focused practice schedule', assumptions: ['Two hours per weekday'], recommendedNextAction: 'Review one API design', milestones: [{ id: 'arbitrary', title: 'Core backend', description: '', tasks: [{ id: 'whatever', title: 'Review HTTP', description: '', status: 'todo' as const, priority: 'high' as const }] }] };
describe('persistent plan domain', () => {
  it('validates structure and rejects missing tasks', () => {
    expect(planSchema.safeParse(raw).success).toBe(true);
    expect(planSchema.safeParse({ ...raw, milestones: [{ ...raw.milestones[0], tasks: [] }] }).success).toBe(false);
  });
  it('normalizes IDs and calculates progress for complete and reopened tasks', () => {
    const plan = normalizePlan(raw);
    expect(plan.milestones[0].tasks[0].id).toBe('m1-t1');
    const complete = toggleTask(plan, 'm1-t1', 'done');
    expect(progress(complete)).toEqual({ done: 1, total: 1, percent: 100 });
    expect(progress(toggleTask(complete, 'm1-t1', 'todo')).percent).toBe(0);
    expect(progress(plan).percent).toBe(0);
  });
  it('updates and adds a task with validation', () => {
    const plan = normalizePlan(raw);
    const revised = updateTask(plan, 'm1-t1', { title: 'Practice HTTP' });
    expect(revised.milestones[0].tasks[0].title).toBe('Practice HTTP');
    const added = addTask(revised, 'm1', { title: 'Mock interview', description: '', priority: 'high', status: 'todo' });
    expect(progress(added).total).toBe(2);
    expect(() => toggleTask(added, 'missing', 'done')).toThrow('Task not found');
    expect(() => addTask(added, 'missing', { title: 'Oops', description: '', priority: 'low', status: 'todo' })).toThrow('Milestone not found');
  });
});
