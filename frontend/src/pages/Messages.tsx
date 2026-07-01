import { useEffect, useRef, useState } from "react";
import { Send, MessageSquare, ArrowLeft } from "lucide-react";
import { messagesApi, type Message as MessageType, type ConversationPreview, type Contact } from "../api/messages";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showContacts, setShowContacts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([messagesApi.conversations(), messagesApi.contacts()])
      .then(([convos, cts]) => { setConversations(convos); setContacts(cts); })
      .finally(() => setLoading(false));
  }, []);

  // Auto-poll for new messages every 3s when a conversation is open
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedId) return;
    pollRef.current = setInterval(async () => {
      try {
        const msgs = await messagesApi.getConversation(selectedId);
        setMessages(msgs);
      } catch { /* ignore */ }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openConversation = async (empId: string) => {
    setSelectedId(empId);
    setShowContacts(false);
    const msgs = await messagesApi.getConversation(empId);
    setMessages(msgs);
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !selectedId) return;
    setSending(true);
    try {
      const msg = await messagesApi.send(selectedId, newMsg.trim());
      setMessages((prev) => [...prev, msg]);
      setNewMsg("");
      // Refresh conversations
      messagesApi.conversations().then(setConversations);
    } finally { setSending(false); }
  };

  const selectedName = conversations.find(c => c.employee_id === selectedId)?.employee_name
    || contacts.find(c => c.id === selectedId)?.name
    || "Chat";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      <PageHeader title="Messages" subtitle="Private conversations with your team." />

      <div style={{ display: "flex", flex: 1, border: "1px solid hsl(var(--border))", borderRadius: 12, overflow: "hidden", background: "var(--surface)" }}>
        {/* Sidebar: conversations */}
        <div style={{ width: 280, borderRight: "1px solid hsl(var(--border))", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Conversations</span>
            <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => setShowContacts(true)}>+ New</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading && <p className="muted" style={{ padding: 16, fontSize: 13 }}>Loading...</p>}
            {!loading && conversations.length === 0 && <p className="muted" style={{ padding: 16, fontSize: 13, textAlign: "center" }}>No conversations yet. Click "+ New" to start one.</p>}
            {conversations.map((c) => (
              <div
                key={c.employee_id}
                onClick={() => openConversation(c.employee_id)}
                style={{
                  padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  background: selectedId === c.employee_id ? "hsl(var(--primary) / 0.06)" : "transparent",
                  borderBottom: "1px solid hsl(var(--border) / 0.5)",
                }}
              >
                {c.employee_photo
                  ? <img src={c.employee_photo} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                  : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "hsl(var(--primary) / 0.1)", color: "var(--primary-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{c.employee_name.slice(0, 2).toUpperCase()}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.employee_name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.last_message}</div>
                </div>
                {c.unread_count > 0 && (
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--primary-color)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.unread_count}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main chat area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {!selectedId && !showContacts ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "var(--text-muted)" }}>
              <MessageSquare size={40} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>Select a conversation or start a new one</p>
            </div>
          ) : showContacts ? (
            <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowContacts(false)}><ArrowLeft size={16} /></button>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Start New Conversation</h3>
              </div>
              {contacts.length === 0 && <p className="muted">No contacts available.</p>}
              {contacts.map((c) => (
                <div key={c.id} onClick={() => openConversation(c.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer", borderRadius: 8, marginBottom: 4 }} className="notification-card">
                  {c.photo
                    ? <img src={c.photo} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                    : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "hsl(var(--primary) / 0.1)", color: "var(--primary-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{c.name.slice(0, 2).toUpperCase()}</div>
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.role}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid hsl(var(--border))", fontWeight: 600, fontSize: 14 }}>
                {selectedName}
              </div>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.map((m) => {
                  const isMine = m.sender_id === user?.id || m.sender_name === user?.name;
                  const isFromMe = user?.profile_photo ? false : true; // simplified
                  const fromMe = m.sender_id !== selectedId;
                  return (
                    <div key={m.id} style={{ display: "flex", justifyContent: fromMe ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "70%", padding: "8px 12px", borderRadius: 12,
                        background: fromMe ? "var(--primary-color)" : "hsl(var(--border) / 0.4)",
                        color: fromMe ? "#fff" : "var(--text)",
                        fontSize: 13, lineHeight: 1.5,
                      }}>
                        {m.content}
                        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              {/* Input */}
              <div style={{ padding: "10px 16px", borderTop: "1px solid hsl(var(--border))", display: "flex", gap: 8 }}>
                <input className="input" style={{ flex: 1 }} value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Type a message..." onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                <button className="btn btn-sm" onClick={handleSend} disabled={sending || !newMsg.trim()}><Send size={14} /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
