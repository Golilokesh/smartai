"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BrainCircuit, Clock3, Send, ShieldCheck, Sparkles } from "lucide-react";
import type { AgentResult, AnalyticsData, Conversation, Customer, MemoryItem } from "@/src/types";
import { ArrowLink, Badge, DataSourceNote, KpiCard, MemoryCard, PageHeader, SectionHeader, StatusBanner } from "@/src/components/ui";

const learning = [
  ["Basic understanding", "The recurring problem is recognized."],
  ["Customer context learned", "Router and environment are connected."],
  ["Previous attempts remembered", "Failed steps don’t get repeated."],
  ["Successful solution remembered", "What worked becomes a shortcut."],
  ["Personalized assistance", "The next answer starts further ahead."],
];

export default function DashboardPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [message, setMessage] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/customers"), fetch("/api/analytics")]).then(async ([customersRes, analyticsRes]) => {
      const customerPayload = await customersRes.json();
      const analyticsPayload = await analyticsRes.json();
      const list = customerPayload.customers as Customer[];
      setCustomer(list[0] ?? null);
      setAnalytics(analyticsPayload as AnalyticsData);
      setLoadingData(false);
    }).catch(() => { setError("The dashboard could not load its workspace data."); setLoadingData(false); });
  }, []);

  useEffect(() => {
    if (!customer) return;
    Promise.all([fetch(`/api/conversations?customerId=${customer.id}`), fetch(`/api/memories?customerId=${customer.id}`)]).then(async ([conversationRes, memoriesRes]) => {
      const conversationPayload = await conversationRes.json();
      const memoryPayload = await memoriesRes.json();
      setConversation(conversationPayload.conversations?.[0] ?? null);
      setMemories(memoryPayload.memories ?? []);
    }).catch(() => setError("Customer context could not be loaded."));
  }, [customer]);

  const visibleMessages = useMemo(() => {
    const base = conversation?.messages ?? [];
    if (!result) return base;
    return [...base, { id: "live-user", role: "customer" as const, content: sentMessage, timestamp: "Just now" }, { id: "live-agent", role: "agent" as const, content: result.response, timestamp: "Just now", memoryUsed: result.personalized }];
  }, [conversation, result, sentMessage]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!customer || !message.trim() || loading) return;
    setError(""); setLoading(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: customer.id, message }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "The agent could not respond.");
      setResult(payload as AgentResult);
      setSentMessage(message);
      setMemories(payload.memories ?? []);
      setMessage("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The agent could not respond."); }
    finally { setLoading(false); }
  }

  if (loadingData) return <div className="content"><div className="empty">Loading the memory workspace…</div></div>;
  if (!customer) return <div className="content"><StatusBanner tone="warning">No demo customers are available. Check the server configuration.</StatusBanner></div>;

  const metrics = analytics?.metrics;
  return <div className="content"><PageHeader eyebrow="Operations overview" title="Good morning, support team." lede="A living customer context layer for agents who should never ask the same question twice." actions={<><Link href="/demo" className="btn btn-primary"><Sparkles size={14} /> Run hackathon demo</Link><Link href="/customers" className="btn btn-ghost">View customers</Link></>} />
    <div className="kpi-grid"><KpiCard label="Active customers" value={metrics?.activeCustomers ?? "—"} trend="+12%" /><KpiCard label="Total conversations" value={metrics?.conversations ?? "—"} trend="+8%" /><KpiCard label="Memories stored" value={metrics?.memoriesStored ?? "—"} trend="+24%" /><KpiCard label="Issues resolved" value={metrics?.issuesResolved ?? "—"} trend="+16%" /><KpiCard label="Personalization score" value={`${metrics?.personalizationScore ?? "—"}%`} trend="+9%" /></div>
    {error ? <div style={{ marginBottom: 16 }}><StatusBanner tone="warning">{error}</StatusBanner></div> : null}
    <div className="workspace"><section className="card chat-card"><div className="chat-header"><div className="avatar">{customer.initials}</div><div className="chat-header-meta"><h2>{customer.name}</h2><p>{customer.issueSummary} · {customer.plan}</p></div><div className="live-pill"><span className="status-dot" /> Live support</div></div><div className="chat-body">{visibleMessages.map((item) => <div className={`message-row ${item.role === "customer" ? "customer" : ""}`} key={item.id}><div className="avatar" style={item.role === "agent" ? { background: "var(--ink)", color: "var(--mint)" } : undefined}>{item.role === "agent" ? "M" : customer.initials}</div><div><div className="message-bubble">{item.content}</div><div className="message-time">{item.timestamp}{item.memoryUsed ? " · memory-informed" : ""}</div></div></div>)}</div><form className="chat-compose" onSubmit={sendMessage}><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask the support agent something…" aria-label="Customer message" /><button className="btn btn-primary" type="submit" disabled={loading || !message.trim()}>{loading ? "Thinking…" : <><Send size={14} /> Send</>}</button></form></section>
      <aside className="context-stack"><div className="card"><SectionHeader title="Memory context" meta={result?.recalled ? "Recalled before this response" : "Customer context at a glance"} action={<BrainCircuit size={17} color="#8062e8" />} /><div className="card-body" style={{ display: "grid", gap: 10 }}>{result?.memoryStatus === "updated" ? <StatusBanner tone="success">Memory updated — durable context retained in Hindsight.</StatusBanner> : result?.memoryStatus === "failed" || result?.memoryStatus === "not_configured" ? <StatusBanner tone="warning">{result.memoryMessage}</StatusBanner> : null}{result?.recalled ? <StatusBanner>Hindsight recall found relevant context for this response.</StatusBanner> : null}{memories.slice(0, 4).map((memory) => <MemoryCard key={memory.id} memory={memory} compact />)}{!memories.length ? <div className="empty" style={{ padding: 10 }}>Send a message with Hindsight connected to see relevant memories here.</div> : null}<Link href={`/memory?customer=${customer.id}`} className="btn btn-ghost" style={{ width: "100%" }}>Open memory workspace <ArrowRight size={14} /></Link></div></div>
        <div className="card"><SectionHeader title="Before vs after memory" meta="Same customer message, different starting point" /><div className="card-body"><div className="comparison"><div className="comparison-pane"><div className="pane-label"><span>Without memory</span><Badge tone="muted">Baseline</Badge></div><p>“The issue happened again.”</p><p style={{ marginTop: 10, color: "#777482" }}>Can you explain what issue you are experiencing?</p></div><div className="comparison-pane highlight"><div className="pane-label"><span>With Hindsight</span><Badge tone="violet">Recall + retain</Badge></div><p>“The issue happened again.”</p><p style={{ marginTop: 10 }}>{result?.personalized ? result.response : "I remember your earlier connection issue and the steps we already tried. Let’s continue from there."}</p></div></div><DataSourceNote /></div></div>
      </aside></div>
    <div className="section-grid"><section className="card"><SectionHeader title="Learning progress" meta="Every useful interaction moves the agent forward" action={<Link href="/demo"><ArrowLink>See demo</ArrowLink></Link>} /><div className="card-body"><div className="progress-list">{learning.map(([title, detail], index) => <div className={`progress-item ${index < (result?.personalized ? 5 : 3) ? "done" : ""}`} key={title}><div className="progress-num">{index < (result?.personalized ? 5 : 3) ? <ShieldCheck size={14} /> : index + 1}</div><div><strong>Interaction {index + 1} → {title}</strong><p>{detail}</p></div><span className="progress-status">{index < (result?.personalized ? 5 : 3) ? "Learned" : "Next"}</span></div>)}</div></div></section><section className="card"><SectionHeader title="Recent signals" meta="Durable facts, not full transcripts" action={<Clock3 size={16} color="#8e8a99" />} /><div className="card-body grid-list">{memories.slice(0, 3).map((memory) => <div className="list-row" key={memory.id}><div className="avatar" style={{ background: "var(--mint-soft)", color: "#3d9d7a" }}><Sparkles size={13} /></div><div className="list-row-main"><strong>{memory.description}</strong><p>{memory.kind} · {memory.learnedAt}</p></div><Badge tone={memory.source === "hindsight" ? "mint" : "violet"}>{memory.source === "hindsight" ? "Live" : "Seed"}</Badge></div>)}{!memories.length ? <div className="empty">No memory signals loaded yet.</div> : null}</div></section></div>
  </div>;
}
