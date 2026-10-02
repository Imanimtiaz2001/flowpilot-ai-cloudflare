import { AIChatAgent } from '@cloudflare/ai-chat';
import { callable, routeAgentRequest } from 'agents';
import { createWorkersAI } from 'workers-ai-provider';
import { convertToModelMessages, pruneMessages, stepCountIs, streamText, tool } from 'ai';
import { z } from 'zod';
import { addTask, emptyWorkspace, normalizePlan, planSchema, progress, taskSchema, toggleTask, updateTask, type Workspace } from './lib/plan';
import { SYSTEM_PROMPT } from './agent/prompt';

export interface Env {
  AI: Ai;
  FlowPilotAgent: DurableObjectNamespace;
  ASSETS: Fetcher;
}

export class FlowPilotAgent extends AIChatAgent<Env, Workspace> {
  initialState: Workspace = emptyWorkspace;

  private save(patch: Partial<Workspace>) {
    this.setState({ ...this.state, ...patch, revision: this.state.revision + 1, updatedAt: new Date().toISOString() });
  }

  @callable()
  setTaskStatus(taskId: string, status: 'todo' | 'done') {
    const input = z.object({ taskId: z.string().min(1).max(80), status: z.enum(['todo', 'done']) }).parse({ taskId, status });
    if (!this.state.plan) throw new Error('Create a plan first');
    this.save({ plan: toggleTask(this.state.plan, input.taskId, input.status) });
    return progress(this.state.plan);
  }

  async onChatMessage() {
    const last = this.messages[this.messages.length - 1];
    const text = last?.parts.filter(p => p.type === 'text').map(p => p.text).join('') ?? '';
    if (!text.trim() || text.length > 5000) return new Response('Message must be between 1 and 5,000 characters.', { status: 400 });
    const ai = createWorkersAI({ binding: this.env.AI });
    const context = JSON.stringify({ workspace: this.state, progress: progress(this.state.plan) });
    try {
      const result = streamText({
        model: ai('@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
        system: `${SYSTEM_PROMPT}\n\nSaved workspace snapshot at request start: ${context.slice(0, 15000)}`,
        messages: pruneMessages({ messages: await convertToModelMessages(this.messages), toolCalls: 'before-last-2-messages' }),
        stopWhen: stepCountIs(5),
        tools: {
          getCurrentPlan: tool({ description: 'Read current saved plan, preferences and progress before advising.', inputSchema: z.object({}), execute: async () => ({ ...this.state, progress: progress(this.state.plan) }) }),
          createPlan: tool({ description: 'Create and persist a complete structured plan for a new goal. Use for first goal.', inputSchema: planSchema, execute: async input => {
            if (this.state.plan) return { error: 'A plan exists. Use replacePlan to revise it.' };
            this.save({ plan: normalizePlan(input) });
            return { saved: true, progress: progress(this.state.plan), plan: this.state.plan };
          } }),
          replacePlan: tool({ description: 'Replan existing goal; preserve completed tasks where possible. Replaces the current plan.', inputSchema: planSchema, execute: async input => {
            if (!this.state.plan) return { error: 'No plan exists. Use createPlan.' };
            const next = normalizePlan(input);
            const completed = new Set(this.state.plan.milestones.flatMap(m => m.tasks.filter(t => t.status === 'done').map(t => t.title.toLowerCase().trim())));
            for (const m of next.milestones) for (const t of m.tasks) if (completed.has(t.title.toLowerCase().trim())) t.status = 'done';
            this.save({ plan: next });
            return { saved: true, progress: progress(next) };
          } }),
          rememberPreference: tool({ description: 'Store a durable user preference or constraint relevant to future plans.', inputSchema: z.object({ preference: z.string().trim().min(4).max(240) }), execute: async ({ preference }) => {
            const preferences = [...new Set([...this.state.preferences, preference])].slice(-20);
            this.save({ preferences }); return { saved: true, preferences };
          } }),
          addTask: tool({ description: 'Add a task to a saved milestone.', inputSchema: z.object({ milestoneId: z.string(), title: taskSchema.shape.title, description: taskSchema.shape.description, priority: taskSchema.shape.priority }), execute: async ({ milestoneId, title, description, priority }) => {
            if (!this.state.plan) return { error: 'No plan exists.' };
            this.save({ plan: addTask(this.state.plan, milestoneId, { title, description, priority, status: 'todo' }) });
            return { saved: true, progress: progress(this.state.plan) };
          } }),
          updateTask: tool({ description: 'Change title, description or priority of an existing task.', inputSchema: z.object({ taskId: z.string(), title: taskSchema.shape.title.optional(), description: taskSchema.shape.description.optional(), priority: taskSchema.shape.priority.optional() }), execute: async ({ taskId, ...patch }) => {
            if (!this.state.plan) return { error: 'No plan exists.' };
            this.save({ plan: updateTask(this.state.plan, taskId, patc