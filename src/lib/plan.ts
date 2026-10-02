import { z } from 'zod';

export const taskSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(800).default(''),
  status: z.enum(['todo', 'done']).default('todo'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});
export const milestoneSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(800).default(''),
  tasks: z.array(taskSchema).min(1).max(15),
});
export const planSchema = z.object({
  goal: z.string().trim().min(3).max(240),
  summary: z.string().trim().min(5).max(1200),
  assumptions: z.array(z.string().trim().min(2).max(240)).max(12),
  milestones: z.array(milestoneSchema).min(1).max(8),
  recommendedNextAction: z.string().trim().min(2).max(350),
});
export type Plan = z.infer<typeof planSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Workspace = { plan: Plan | null; preferences: string[]; updatedAt: string | null; revision: number };
export const emptyWorkspace: Workspace = { plan: null, preferences: [], updatedAt: null, revision: 0 };
export function progress(plan: Plan | null) {
  const tasks = plan?.milestones.flatMap(m => m.tasks) ?? [];
  const done = tasks.filter(t => t.status === 'done').length;
  return { done, total: tasks.length, percent: tasks.length ? Math.round(done / tasks.length * 100) : 0 };
}
export function normalizePlan(plan: Plan): Plan {
  const parsed = planSchema.parse(plan);
  return { ...parsed, milestones: parsed.milestones.map((m, mi) => ({ ...m, id: `m${mi + 1}`, tasks: m.tasks.map((t, ti) => ({ ...t, id: `m${mi + 1}-t${ti + 1}` })) })) };
}
export function toggleTask(plan: Plan, taskId: string, status: Task['status']): Plan {
  let found = false;
  const milestones = plan.milestones.map(m => ({ ...m, tasks: m.tasks.map(t => {
    if (t.id !== taskId) return t;
    found = true;
    return { ...t, status };
  }) }));
  if (!found) throw new Error('Task not found');
  return { ...plan, milestones };
}
export function addTask(plan: Plan, milestoneId: string, task: Omit<Task, 'id'>): Plan {
  let found = false;
  const milestones = plan.milestones.map(m => {
    if (m.id !== milestoneId) return m;
    found = true;
    if (m.tasks.length >= 15) throw new Error('Milestone is full');
    return { ...m, tasks: [...m.tasks, { ...task, id: crypto.randomUUID() }] };
  });
  if (!found) throw new Error('Milestone not found');
  return { ...plan, milestones };
}
export function updateTask(plan: Plan, taskId: string, patch: Partial<Pick<Task, 'title' | 'description' | 'priority'>>): Plan {
  let found = false;
  const milestones = plan.milestones.map(m => ({ ...m, tasks: m.tasks.map(t => {
    if (t.id !== taskId) return t;
    found = true;
    return taskSchema.parse({ ...t, ...patch });
  }) }));
  if (!found) throw new Error('Task not found');
  return { ...plan, milestones };
}
