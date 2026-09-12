"use client";

import { useRef, useState, useTransition } from "react";
import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft";
import type { TenantRole } from "../../shared/domain/model.ts";
import type { TeamDirectoryView, TeamMemberView } from "../../shared/domain/teamDirectoryView.ts";
import type { TeamMembershipActionResult, TeamOwnerTransferActionResult } from "../../shared/domain/teamMembershipMutationView.ts";
import { changeTeamMemberRoleAction, changeTeamMemberStatusAction, transferTeamOwnershipAction } from "../../server/team/teamMembershipActions.ts";
import { applyTeamMembershipChanges } from "./teamMembershipState.ts";
import { readTeamDirectoryMessages } from "./teamDirectoryMessages";
import { readTeamManagementMessages, teamManagementFailureMessage } from "./teamManagementMessages";

const nonOwnerRoles = ["manager", "agent", "viewer"] as const;
type MemberRole = Exclude<TenantRole, "owner">;

export function TeamManagement({ language, directory, onDirectory }: {
  language: InterfaceLanguage;
  directory: TeamDirectoryView;
  onDirectory: (directory: TeamDirectoryView) => void;
}) {
  const m = readTeamManagementMessages(language);
  const labels = readTeamDirectoryMessages(language);
  const [selectedKey, setSelectedKey] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const actor = directory.members.find((member) => member.currentUser);
  const owner = actor?.role === "owner" && actor.status === "active";
  const candidates = directory.members.filter((member) => !member.currentUser && member.role !== "owner");
  const selected = candidates.find((member) => member.memberKey === selectedKey);
  const run = (action: () => Promise<TeamMembershipActionResult | TeamOwnerTransferActionResult>, expectedKeys: readonly string[]) => {
    if (!owner || refreshRequired || inFlight.current) return;
    inFlight.current = true;
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.status !== "saved") {
          setNotice(teamManagementFailureMessage(language, result.status));
          setRefreshRequired(true);
          return;
        }
        const changes = "membership" in result ? [result.membership] : [result.formerOwner, result.newOwner];
        const next = changes.map((change) => change.memberKey).sort().join(",") === [...expectedKeys].sort().join(",")
          ? applyTeamMembershipChanges(directory, changes) : null;
        if (!next) {
          setNotice(m.unavailable);
          setRefreshRequired(true);
          return;
        }
        onDirectory(next);
        setNotice(m.saved);
      } catch {
        setNotice(m.unavailable);
        setRefreshRequired(true);
      } finally {
        inFlight.current = false;
      }
    });
  };
  return <section className="card team-management-card" aria-labelledby="team-management-title">
    <h2 id="team-management-title">{m.title}</h2>
    {notice && <p className={`inline-notice ${refreshRequired ? "warning" : "success"}`} role={refreshRequired ? "alert" : "status"}>{notice}</p>}
    {refreshRequired && <button className="secondary-button" type="button" onClick={() => window.location.reload()}>{m.refresh}</button>}
    {!owner ? <p>{m.ownerOnly}</p> : candidates.length === 0 ? <p>{m.empty}</p> : <>
      <label htmlFor="team-managed-member">{m.select}</label>
      <select id="team-managed-member" value={selectedKey} disabled={pending || refreshRequired} onChange={(event) => { setSelectedKey(event.target.value); setNotice(null); }}>
        <option value="">{m.choose}</option>
        {candidates.map((member) => <option key={member.memberKey} value={member.memberKey}>{member.displayName ?? labels.reference(member.referenceCode)} — {labels.roles[member.role]} — {m[member.status]}</option>)}
      </select>
      {selected && actor && <MemberControls key={`${selected.memberKey}:${selected.version}`} language={language} member={selected} actor={actor} disabled={pending || refreshRequired} run={run} />}
    </>}
    {pending && <p role="status">{m.busy}</p>}
  </section>;
}

function MemberControls({ language, member, actor, disabled, run }: {
  language: InterfaceLanguage; member: TeamMemberView; actor: TeamMemberView; disabled: boolean;
  run: (action: () => Promise<TeamMembershipActionResult | TeamOwnerTransferActionResult>, keys: readonly string[]) => void;
}) {
  const m = readTeamManagementMessages(language);
  const labels = readTeamDirectoryMessages(language);
  const [role, setRole] = useState<MemberRole>(member.role as MemberRole);
  const [confirmation, setConfirmation] = useState<"suspend" | "transfer" | null>(null);
  const [formerRole, setFormerRole] = useState<MemberRole>("manager");
  const [confirmed, setConfirmed] = useState(false);
  const identity = member.displayName ?? labels.reference(member.referenceCode);
  const saveRole = () => run(() => changeTeamMemberRoleAction({ memberKey: member.memberKey, expectedVersion: member.version, role }), [member.memberKey]);
  const changeStatus = (status: "active" | "suspended") => run(() => changeTeamMemberStatusAction({ memberKey: member.memberKey, expectedVersion: member.version, status }), [member.memberKey]);
  return <fieldset className="team-management-fields" disabled={disabled}>
    <legend>{identity}</legend>
    <label htmlFor="team-managed-role">{m.role}</label>
    <select id="team-managed-role" value={role} disabled={member.status !== "active" || confirmation !== null} onChange={(event) => setRole(event.target.value as MemberRole)}>
      {nonOwnerRoles.map((value) => <option key={value} value={value}>{labels.roles[value]}</option>)}
    </select>
    <div className="heading-actions">
      <button className="secondary-button" type="button" disabled={member.status !== "active" || role === member.role || confirmation !== null} onClick={saveRole}>{m.save}</button>
      {member.status === "suspended" ? <button className="secondary-button" type="button" onClick={() => changeStatus("active")}>{m.restore}</button> : <>
        <button className="secondary-button" type="button" disabled={confirmation !== null} onClick={() => setConfirmation("suspend")}>{m.suspend}</button>
        <button className="secondary-button" type="button" disabled={confirmation !== null} onClick={() => setConfirmation("transfer")}>{m.transfer}</button>
      </>}
    </div>
    {confirmation && <div className="inline-notice warning">
      <p>{confirmation === "suspend" ? m.suspendWarning : m.transferWarning}</p>
      <strong>{identity}</strong>
      {confirmation === "transfer" && <>
        <label htmlFor="team-former-owner-role">{m.formerRole}</label>
        <select id="team-former-owner-role" value={formerRole} onChange={(event) => setFormerRole(event.target.value as MemberRole)}>
          {nonOwnerRoles.map((value) => <option key={value} value={value}>{labels.roles[value]}</option>)}
        </select>
        <label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> {m.confirmTransfer}</label>
      </>}
      <div className="heading-actions">
        <button className="primary-button" type="button" disabled={confirmation === "transfer" && !confirmed} onClick={() => {
          if (confirmation === "suspend") changeStatus("suspended");
          else if (confirmed) run(() => transferTeamOwnershipAction({ newOwnerMemberKey: member.memberKey, formerOwnerExpectedVersion: actor.version, newOwnerExpectedVersion: member.version, formerOwnerRole: formerRole }), [actor.memberKey, member.memberKey]);
        }}>{m.confirm}</button>
        <button className="secondary-button" type="button" onClick={() => { setConfirmation(null); setConfirmed(false); }}>{m.cancel}</button>
      </div>
    </div>}
  </fieldset>;
}
