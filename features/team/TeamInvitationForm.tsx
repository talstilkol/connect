"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft";
import type { TeamInvitationRole } from "../../shared/domain/teamInvitation.ts";
import type { TeamInvitationActionResult } from "../../shared/domain/teamInvitationView.ts";
import { inviteTeamMemberAction } from "../../server/team/teamInvitationActions.ts";
import { readTeamDirectoryMessages } from "./teamDirectoryMessages";
import { readTeamManagementMessages, teamManagementFailureMessage } from "./teamManagementMessages";

export function TeamInvitationForm({ language, enabled }: { language: InterfaceLanguage; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamInvitationRole>("viewer");
  const [result, setResult] = useState<TeamInvitationActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const labels = readTeamDirectoryMessages(language);
  const m = readTeamManagementMessages(language);
  const failed = result !== null && result.status !== "queued" && result.status !== "already-pending";
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!enabled || failed || inFlight.current || !email.trim()) return;
    inFlight.current = true;
    setResult(null);
    startTransition(async () => {
      try {
        const next = await inviteTeamMemberAction({ email: email.trim(), role });
        setResult(next);
        if (next.status === "queued" || next.status === "already-pending") setEmail("");
      } catch {
        setResult({ status: "server-error" });
      } finally {
        inFlight.current = false;
      }
    });
  };
  if (!enabled) return null;
  return <section className="team-invitation-panel">
    <button className="primary-button" type="button" aria-expanded={open} aria-controls="team-invitation-form" disabled={pending} onClick={() => setOpen(!open)}>{labels.invite}</button>
    {open && <form id="team-invitation-form" className="card team-management-card" onSubmit={submit}>
      <h2>{labels.invite}</h2>
      <p>{m.inviteNotice}</p>
      {result && <p className={`inline-notice ${failed ? "warning" : "success"}`} role={failed ? "alert" : "status"}>
        {result.status === "queued" ? m.inviteQueued : result.status === "already-pending" ? m.invitePending : teamManagementFailureMessage(language, result.status)}
      </p>}
      {failed && <button className="secondary-button" type="button" onClick={() => window.location.reload()}>{m.refresh}</button>}
      <label htmlFor="team-invitation-email">{m.inviteEmail}</label>
      <input id="team-invitation-email" type="email" autoComplete="email" maxLength={254} required value={email} disabled={pending || failed} onChange={(event) => setEmail(event.target.value)} />
      <label htmlFor="team-invitation-role">{m.role}</label>
      <select id="team-invitation-role" value={role} disabled={pending || failed} onChange={(event) => setRole(event.target.value as TeamInvitationRole)}>
        {(["viewer", "agent", "manager"] as const).map((value) => <option key={value} value={value}>{labels.roles[value]}</option>)}
      </select>
      <div className="heading-actions">
        <button className="primary-button" type="submit" disabled={pending || failed || !email.trim()}>{pending ? m.busy : m.inviteSubmit}</button>
        <button className="secondary-button" type="button" disabled={pending} onClick={() => setOpen(false)}>{m.cancel}</button>
      </div>
    </form>}
  </section>;
}
