"use client";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";

import Link from "next/link";
import { ModalDialog } from "@/components/ModalDialog";
import { AdminConfirmDialog } from "@/components/AdminConfirmDialog";
import { useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import { DEFAULT_AI_MODEL, type AdminAiConnection, type AdminAiSettings } from "@/lib/ai-settings";

const statusLabel: Record<AdminAiConnection["status"], string> = {
  connected: "Connected",
  "not-connected": "Not connected",
  "temporarily-unavailable": "Temporarily unavailable",
  "action-needed": "Action needed",
};

type ConnectionDraft = {
  id?: string;
  label: string;
  apiKey: string;
  model: string;
  priority: number;
};

const emptyConnection = (priority: number): ConnectionDraft => ({
  label: priority === 1 ? "Primary · Gemini" : `Backup ${priority - 1} · Gemini`,
  apiKey: "",
  model: DEFAULT_AI_MODEL,
  priority,
});

export function AdminAiManager({ initialSettings }: { initialSettings: AdminAiSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [welcomeMessage, setWelcomeMessage] = useState(initialSettings.welcomeMessage);
  const [dailyCap, setDailyCap] = useState(initialSettings.dailyCap);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackKind, setFeedbackKind] = useState<"success" | "error" | "">("");
  const [connectionDraft, setConnectionDraft] = useState<ConnectionDraft | null>(null);
  const [connectionBusy, setConnectionBusy] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [question, setQuestion] = useState("Where are you located?");
  const [testReply, setTestReply] = useState("");
  const [testingReply, setTestingReply] = useState(false);
  const [fallbackPreview, setFallbackPreview] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const orderedConnections = useMemo(
    () => [...settings.connections].sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label)),
    [settings.connections]
  );

  const refreshSettings = (next?: AdminAiSettings, updateDraft = false) => {
    if (!next) return;
    setSettings(next);
    if (updateDraft) { setEnabled(next.enabled); setWelcomeMessage(next.welcomeMessage); setDailyCap(next.dailyCap); }
  };

  const saveSettings = async () => {
    if (saving) return;
    setSaving(true);
    setFeedback("");
    try {
      const response = await adminFetch("/api/admin/ai", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled, welcomeMessage, dailyCap, expectedRevision: settings.revision }),
      });
      const payload = await response.json().catch(() => ({})) as { settings?: AdminAiSettings; message?: string };
      if (!response.ok) {
        setFeedbackKind("error");
        setFeedback(payload.message || "KEO Muse settings could not be saved.");
        return;
      }
      refreshSettings(payload.settings, true);
      setFeedbackKind("success");
      setFeedback(payload.message || "KEO Muse settings saved.");
    } catch {
      setFeedbackKind("error");
      setFeedback("KEO Muse settings could not be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => { setFeedback(""); setShowKey(false); setConnectionDraft(emptyConnection(orderedConnections.length + 1)); };
  const openEdit = (connection: AdminAiConnection) => { setFeedback(""); setShowKey(false); setConnectionDraft({
    id: connection.id,
    label: connection.label,
    apiKey: "",
    model: connection.model,
    priority: connection.priority,
  }); };

  const saveConnection = async () => {
    if (!connectionDraft || connectionBusy) return;
    if (!connectionDraft.label.trim() || !connectionDraft.model.trim()) {
      setFeedbackKind("error");
      setFeedback("Add a connection label and Gemini model ID.");
      return;
    }
    if (!connectionDraft.id && !connectionDraft.apiKey.trim()) {
      setFeedbackKind("error");
      setFeedback("Paste the Gemini API key for this connection.");
      return;
    }
    setConnectionBusy(connectionDraft.id || "new");
    setFeedback("");
    try {
      const response = await adminFetch(
        connectionDraft.id ? `/api/admin/ai/connections/${connectionDraft.id}` : "/api/admin/ai/connections",
        {
          method: connectionDraft.id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(connectionDraft),
        }
      );
      const payload = await response.json().catch(() => ({})) as { settings?: AdminAiSettings; message?: string };
      if (!response.ok) {
        setFeedbackKind("error");
        setFeedback(payload.message || "The AI connection could not be saved.");
        return;
      }
      refreshSettings(payload.settings);
      setConnectionDraft(null);
      setFeedbackKind("success");
      setFeedback(payload.message || "AI connection saved.");
    } catch {
      setFeedbackKind("error");
      setFeedback("The AI connection could not be saved.");
    } finally {
      setConnectionBusy("");
    }
  };

  const patchConnection = async (connection: AdminAiConnection, patch: Record<string, unknown>, message: string) => {
    if (connectionBusy) return;
    setConnectionBusy(connection.id);
    try {
      const response = await adminFetch(`/api/admin/ai/connections/${connection.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = await response.json().catch(() => ({})) as { settings?: AdminAiSettings; message?: string };
      if (!response.ok) throw new Error(payload.message || "Connection update failed.");
      refreshSettings(payload.settings);
      setFeedbackKind("success");
      setFeedback(message);
    } catch (error) {
      setFeedbackKind("error");
      setFeedback(error instanceof Error ? error.message : "Connection update failed.");
    } finally {
      setConnectionBusy("");
    }
  };

  const testConnection = async (connection: AdminAiConnection) => {
    if (connectionBusy) return;
    setConnectionBusy(connection.id);
    setFeedback("");
    try {
      const response = await adminFetch(`/api/admin/ai/connections/${connection.id}/test`, { method: "POST" });
      const payload = await response.json().catch(() => ({})) as { settings?: AdminAiSettings; message?: string };
      refreshSettings(payload.settings);
      setFeedbackKind(response.ok ? "success" : "error");
      setFeedback(payload.message || (response.ok ? "Connection test passed." : "Connection test failed."));
    } catch {
      setFeedbackKind("error");
      setFeedback("The connection test could not run.");
    } finally {
      setConnectionBusy("");
    }
  };

  const deleteConnection = async () => {
    if (!deleteId || connectionBusy) return;
    setConnectionBusy(deleteId);
    try {
      const response = await adminFetch(`/api/admin/ai/connections/${deleteId}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "The connection could not be removed.");
      setSettings((current) => ({ ...current, connections: current.connections.filter((item) => item.id !== deleteId) }));
      setDeleteId(null);
      setFeedbackKind("success");
      setFeedback("AI connection removed.");
    } catch (error) {
      setFeedbackKind("error");
      setFeedback(error instanceof Error ? error.message : "The connection could not be removed.");
    } finally {
      setConnectionBusy("");
    }
  };

  const runTestReply = async () => {
    if (!question.trim() || testingReply) return;
    setTestingReply(true);
    setTestReply("");
    try {
      const response = await adminFetch("/api/admin/ai/test-reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string };
      setTestReply(payload.message || (response.ok ? "KEO Muse responded." : "No test reply was returned."));
    } catch {
      setTestReply("The test reply could not run.");
    } finally {
      setTestingReply(false);
    }
  };

  const capPercent = Math.min(100, Math.round((settings.usageToday / Math.max(1, dailyCap)) * 100));

  return (
    <main className="admin-ai-content">
      <header className="admin-ai-head">
        <div className="eyebrow">KEO HAIRVEN</div>
        <h1>KEO Muse, simply managed</h1>
      </header>

      <div className="admin-ai-notice">The assistant answers from your published business information. It does not confirm payments, stock or appointments.</div>
      {feedback ? <div className={`admin-ai-feedback ${feedbackKind ? `is-${feedbackKind}` : ""}`} role="status">{feedback}</div> : null}

      <div className="admin-ai-grid">
        <div className="admin-ai-column">
          <section className="admin-editor-panel admin-ai-panel">
            <h2>Assistant settings</h2>
            <div className="admin-ai-row">
              <div><b>Show KEO Muse on the website</b><p>Saved FAQs and WhatsApp remain the fallback when AI is unavailable.</p></div>
              <button type="button" role="switch" aria-checked={enabled} className={`admin-content-switch${enabled ? " is-on" : ""}`} onClick={() => setEnabled((value) => !value)}><span /><em>{enabled ? "On" : "Off"}</em></button>
            </div>
            <label className="admin-editor-field"><span>Welcome message</span><textarea rows={4} maxLength={500} value={welcomeMessage} onChange={(event) => setWelcomeMessage(event.target.value)} /></label>
            <label className="admin-editor-field"><span>Daily AI request cap</span><input type="number" min={1} max={5000} value={dailyCap} onChange={(event) => setDailyCap(Math.max(1, Number(event.target.value || 1)))} /><small>This shared cap is saved in Admin and applies without editing Vercel environment variables.</small></label>
            <div className="admin-ai-usage">
              <div><b>{settings.usageToday}</b><span>requests used today</span></div>
              <div><b>{dailyCap}</b><span>daily cap</span></div>
              <div className="admin-ai-progress" aria-label={`${capPercent}% of daily cap used`}><i style={{ width: `${capPercent}%` }} /></div>
            </div>
            <div className="admin-ai-row is-link"><div><b>What Muse knows</b><p>Published products, services, FAQs, gallery labels and approved business details.</p></div><Link href="/admin/content">Review ↗</Link></div>
            <button type="button" className="button button-primary admin-ai-save" onClick={() => void saveSettings()} disabled={saving}>{saving ? "Saving…" : "Save assistant settings"}</button>
          </section>

          <section className="admin-editor-panel admin-ai-panel">
            <div className="admin-ai-section-head"><div><h2>Connections</h2><p>Each reply tries at most two connections. The highest-priority enabled saved key is primary. A configured environment key is recovery; otherwise the next enabled saved key is recovery. Lower-priority keys remain on standby until you change priority or disable a selected key. Every attempt counts toward the daily cap.</p></div><button type="button" className="button button-outline" onClick={openAdd}>+ Add connection</button></div>
            {!settings.encryptionReady ? <div className="admin-ai-encryption-warning"><b>Connection storage needs one server encryption secret.</b><p>Keep `AI_KEYS_ENCRYPTION_KEY_BASE64` configured once. Keys saved here are encrypted. A host-level GEMINI_API_KEY can also be used without saving a connection here.</p></div> : null}
            {settings.environmentConfigured && <div className="studio-environment-note"><b>Environment connection configured</b><p>The host provides a Gemini key. It is the recovery connection after the highest-priority enabled saved key, or the primary connection when none is enabled. Run a test reply to verify it; rotate or remove this key in your host settings.</p></div>}
            <div className="admin-ai-connections">
              {orderedConnections.length ? orderedConnections.map((connection, index) => (
                <article className="admin-ai-connection" key={connection.id}>
                  <div className="admin-ai-connection-main">
                    <div><b>{connection.label}</b><p>{index === 0 ? "Primary" : `Priority ${connection.priority}`} · Gemini · {connection.model}</p></div>
                    <span className={`admin-ai-status is-${connection.status}`}>{statusLabel[connection.status]}</span>
                  </div>
                  <div className="admin-ai-keyline"><span>{connection.keyHint}</span><span>{connection.lastTestAt ? `Last tested ${new Date(connection.lastTestAt).toLocaleString()}` : "Not tested yet"}</span></div>
                  <p className="admin-ai-last-test">{connection.lastTestMessage}</p>
                  <div className="admin-ai-connection-actions">
                    <button type="button" onClick={() => void testConnection(connection)} disabled={connectionBusy === connection.id}>{connectionBusy === connection.id ? "Working…" : "Test"}</button>
                    <button type="button" onClick={() => openEdit(connection)}>Edit</button>
                    <button type="button" onClick={() => void patchConnection(connection, { enabled: !connection.enabled }, connection.enabled ? "Connection disabled." : "Connection enabled.")}>{connection.enabled ? "Disable" : "Enable"}</button>
                    <button type="button" onClick={() => setDeleteId(connection.id)}>Delete</button>
                  </div>
                </article>
              )) : <div className="admin-ai-empty"><b>No Gemini connection yet.</b><p>Add your primary API key here. After saving, the raw key is never shown again.</p><button className="button button-outline" type="button" onClick={openAdd}>Add primary connection ↗</button></div>}
            </div>
            <p className="admin-ai-micro">Connections are for recovery, not quota multiplication. Multiple keys from the same Google project share the same provider/project quota.</p>
          </section>
        </div>

        <div className="admin-ai-column">
          <section className="admin-editor-panel admin-ai-panel">
            <h2>Try a question</h2>
            <label className="admin-editor-field"><span>Question</span><input value={question} maxLength={1000} onChange={(event) => setQuestion(event.target.value)} /></label>
            <button type="button" className="button button-outline admin-ai-test-button" onClick={() => void runTestReply()} disabled={testingReply || !question.trim()}>{testingReply ? "Testing…" : "Test reply"}</button>
            <div className="admin-ai-test-result"><div className="eyebrow">TEST RESULT</div><p>{testReply || "Run a test to see the reply generated from your current published website information."}</p></div>
          </section>

          <section className="admin-editor-panel admin-ai-panel">
            <h2>When AI is unavailable</h2>
            <p>KEO Muse immediately falls back to approved FAQ answers and a WhatsApp handoff. It never promises stock, payments, delivery timing or appointments.</p>
            <button type="button" className="button button-outline" onClick={() => setFallbackPreview(true)}>Preview fallback →</button>
          </section>

          <section className="admin-editor-panel admin-ai-panel admin-ai-security">
            <h2>Key safety</h2>
            <div className="admin-ai-row"><div><b>Write-only secrets</b><p>Saved API keys are encrypted with AES-256-GCM and returned to this browser only as a masked hint.</p></div><span>✓</span></div>
            <div className="admin-ai-row"><div><b>Owner only</b><p>Editors cannot open or change AI connections.</p></div><span>✓</span></div>
            <div className="admin-ai-row"><div><b>No raw chat archive</b><p>Public messages remain in the current browser session by default.</p></div><span>✓</span></div>
          </section>
        </div>
      </div>

      {connectionDraft ? (
        <ModalDialog open onClose={() => { if (!connectionBusy) setConnectionDraft(null); }} label={connectionDraft.id ? "Edit Gemini connection" : "Add Gemini connection"} className="studio-ai-dialog">
          <section className="admin-media-modal admin-ai-connection-modal">
            <div className="admin-media-modal-head"><div><div className="eyebrow">AI CONNECTION</div><h2>{connectionDraft.id ? "Edit connection" : "Add Gemini key"}</h2></div><button type="button" aria-label="Close" disabled={Boolean(connectionBusy)} onClick={() => setConnectionDraft(null)}>×</button></div>
            {feedbackKind === "error" && feedback && <p className="admin-feedback is-error" role="alert">{feedback}</p>}
            <div className="admin-ai-modal-fields">
              <label className="admin-editor-field"><span>Connection label</span><input value={connectionDraft.label} maxLength={80} onChange={(event) => setConnectionDraft((current) => current ? { ...current, label: event.target.value } : current)} placeholder="Primary · Gemini" /></label>
              <label className="admin-editor-field"><span>Gemini model ID</span><input value={connectionDraft.model} maxLength={80} onChange={(event) => setConnectionDraft((current) => current ? { ...current, model: event.target.value } : current)} placeholder={DEFAULT_AI_MODEL} /><small>Example: gemini-3.1-flash-lite. Changing this here takes effect without a redeploy.</small></label>
              <label className="admin-editor-field"><span>{connectionDraft.id ? "Replace API key (optional)" : "Gemini API key"}</span><input type={showKey ? "text" : "password"} autoComplete="new-password" value={connectionDraft.apiKey} onChange={(event) => setConnectionDraft((current) => current ? { ...current, apiKey: event.target.value } : current)} placeholder={connectionDraft.id ? "Leave blank to keep the saved key" : "Paste API key"} /><button className="studio-secret-toggle" type="button" aria-pressed={showKey} onClick={() => setShowKey(value => !value)}>{showKey ? "Hide API key" : "Show API key"}</button><small>The key is encrypted server-side and is never shown again after saving.</small></label>
              <label className="admin-editor-field"><span>Priority</span><input type="number" min={1} max={20} value={connectionDraft.priority} onChange={(event) => setConnectionDraft((current) => current ? { ...current, priority: Math.max(1, Number(event.target.value || 1)) } : current)} /></label>
            </div>
            <div className="admin-ai-modal-actions"><button type="button" className="button button-outline" disabled={Boolean(connectionBusy)} onClick={() => setConnectionDraft(null)}>Cancel</button><button type="button" className="button button-primary" onClick={() => void saveConnection()} disabled={Boolean(connectionBusy)}>{connectionBusy ? "Saving & testing…" : connectionDraft.id ? "Save connection" : "Save & test connection"}</button></div>
          </section>
        </ModalDialog>
      ) : null}

      <AdminConfirmDialog open={Boolean(deleteId)} title="Delete this Gemini connection?" description="This permanently removes the saved encrypted key. KEO Muse will use another enabled connection, an environment key, or saved answers." error={feedbackKind === "error" ? feedback : ""} busy={Boolean(connectionBusy)} confirmLabel={connectionBusy ? "Deleting…" : "Delete connection"} destructive onCancel={() => { if (!connectionBusy) setDeleteId(null); }} onConfirm={() => { if (!connectionBusy) void deleteConnection(); }} />

      {fallbackPreview ? (
        <ModalDialog open onClose={() => setFallbackPreview(false)} label="KEO Muse fallback preview" className="studio-ai-dialog">
          <section className="admin-media-modal admin-ai-fallback-modal">
            <div className="admin-media-modal-head"><div><div className="eyebrow">FALLBACK PREVIEW</div><h2>Saved answers stay useful.</h2></div><button type="button" aria-label="Close" onClick={() => setFallbackPreview(false)}>×</button></div>
            <div className="admin-ai-fallback-card"><p>AI replies are temporarily unavailable. You can still browse saved answers or chat directly with KEO Hairven on WhatsApp.</p><div><span>Where are you located? →</span><span>How do I order? →</span><span>Can you waybill to me? →</span></div><Link className="button button-primary" href="/contact" target="_blank">View contact page ↗</Link></div>
          </section>
        </ModalDialog>
      ) : null}
      <UnsavedChangesGuard dirty={enabled !== settings.enabled || welcomeMessage !== settings.welcomeMessage || dailyCap !== settings.dailyCap} />
    </main>
  );
}
