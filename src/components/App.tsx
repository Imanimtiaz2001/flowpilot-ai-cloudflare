import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAgent } from 'agents/react';
import { useAgentChat } from '@cloudflare/ai-chat/react';
import type { FlowPilotAgent } from '../server';
import type { UIMessage } from 'ai';
import { emptyWorkspace, progress, type Workspace } from '../lib/plan';

const starters = [
  'Plan my backend interview preparation',
  'Help me launch a portfolio in one week',
  'Break my app idea into development milestones',
  'Build me a Cloudflare learning roadmap',
];
const quick = ['What should I do next?', 'Summarize my progress.', 'Adjust my plan.', "I'm falling behind."];
function workspaceId() {
  const key = 'flowpilot-workspace-id';
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
}

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [input, setInput] = useState('');
  const [active, setActive] = useState<'plan' | 'chat'>('chat');
  const [notice, setNotice] = useState('');
  const [pendingTask, setPendingTask] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const agent = useAgent<FlowPilotAgent, Workspace>({ agent: 'FlowPilotAgent', name: workspaceId(), onStateUpdate: setWorkspace });
  const { messages, sendMessage, status, error } = useAgentChat({ agent });
  const busy = status === 'streaming' || status === 'submitted';
  const stats = progress(workspace.plan);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, status]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); }, [notice]);

  function send(value = input) {
    const text = value.trim();
    if (!text || busy) return;
    if (text.length > 5000) { setNotice('Keep your message under 5,000 characters.'); return; }
    sendMessage({ text }); setInput(''); setActive('chat');
  }
  function submit(event: FormEvent) { event.preventDefault(); send(); }
  function keydown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); }
  }
  async function toggle(taskId: string, done: boolean) {
    setPendingTask(taskId);
    try { await agent.stub.setTaskStatus(taskId, done ? 'done' : 'todo'); }
    catch { setNotice('Could not update the task. Please reconnect and try again.'); }
    finally { setPendingTask(null); }
  }
  return <div className="shell">
    <header className="topbar">
      <div className="brand"><span className="brandmark" aria-hidden="true">✳</span><span>FlowPilot <strong>AI</strong></span></div>
      <div className="topright"><span className="live-dot"/> Personal workspace <span className="top-separator">/</span> <span className="top-muted">Your goals, in motion</span></div>
    </header>
    <div className="mobile-tabs" role="tablist" aria-label="Workspace view">
      <button role="tab" aria-selected={active === 'chat'} onClick={() => setActive('chat')}>Conversation</button>
      <button role="tab" aria-selected={active === 'plan'} onClick={() => setActive('plan')}>Your plan {workspace.plan ? `· ${stats.percent}%` : ''}</button>
    </div>
    <main className="workspace">
      <section className={`chat-panel ${active === 'chat' ? 'mobile-active' : ''}`} aria-label="AI conversation">
        <div className="panel-head"><div><span className="eyebrow">YOUR CO-PILOT</span><h1>Make progress, on purpose.</h1></div><span className="online"><span/> Ready to plan</span></div>
        <div className="thread" aria-live="polite">
          {messages.length === 0 ? <div className="empty">
            <div className="empty-icon">✳</div><p className="eyebrow">A BETTER WAY TO BEGIN</p>
            <h2>Turn goals into<br/><em>executable plans.</em></h2>
            <p className="empty-copy">Bring an idea, a deadline, or a challenge. FlowPilot turns it into a clear path and keeps track as you go.</p>
            <div className="starter-grid">{starters.map((prompt, i) => <button key={prompt} onClick={() => send(prompt)} disabled={busy}><span className="starter-num">0{i + 1}</span><span>{prompt}</span><span className="starter-arrow">↗</span></button>)}</div>
          </div> : <div className="message-list">{messages.map((message: UIMessage) => <div className={`message ${message.role}`} key={message.id}>
            <div className="avatar">{message.role === 'user' ? 'YOU' : '✳'}</div>
            <div className="message-body"><div className="message-name">{message.role === 'user' ? 'You' : 'FlowPilot'}</div>
              {message.parts.map((part: UIMessage['parts'][number], index: number) => part.type === 'text' ? <p key={index}>{part.text}</p> : null)}
            </div></div>)}
            {busy && <div className="message assistant"><div className="avatar">✳</div><div className="message