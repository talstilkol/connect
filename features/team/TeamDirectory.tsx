"use client";

import { useState } from "react";
import { TeamInvitationForm } from "./TeamInvitationForm";
import { TeamManagement } from "./TeamManagement";
import { readTeamManagementMessages } from "./teamManagementMessages";
import {
  rolePermissions,
  type TenantRole,
} from "../../shared/domain/model.ts";
import type {
  TeamDirectoryStatus,
  TeamDirectoryView,
} from "../../shared/domain/teamDirectoryView.ts";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import { readTeamDirectoryMessages } from "./teamDirectoryMessages";

const roles =
  Object.keys(
    rolePermissions,
  ) as TenantRole[];

function TeamDirectoryContent({
  language,
  directory: initialDirectory,
  status,
}: {
  language: InterfaceLanguage;
  directory: TeamDirectoryView;
  status: TeamDirectoryStatus;
}) {
  const [directory, setDirectory] = useState(initialDirectory);
  const messages = readTeamDirectoryMessages(language);
  const managementMessages = readTeamManagementMessages(language);
  return (
    <>
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">
            {messages.eyebrow}
          </p>
          <h1>{messages.title}</h1>
          <p>
            {messages.description}
          </p>
        </div>
      </div>

      <TeamInvitationForm language={language} enabled={status === "ready" && directory.members.some((member) => member.currentUser && member.status === "active" && (member.role === "owner" || member.role === "manager"))} />

      {status === "ready" ? (
        <>
          <section
            aria-labelledby="team-members-title"
            className="card team-directory-card"
          >
            <div className="card-heading">
              <div>
                <span className="card-kicker">
                  {messages.membersKicker}
                </span>
                <h2 id="team-members-title">
                  {messages.membersTitle}
                </h2>
              </div>
              <span className="status-pill healthy">
                {messages.activeCount(
                  directory.members.filter((member) => member.status === "active").length,
                )}
              </span>
            </div>
            {directory.identityStatus ===
            "unavailable" ? (
              <p className="team-directory-note">
                {messages.identityUnavailable}
              </p>
            ) : null}
            <ul className="team-member-list">
              {directory.members.map(
                (member) => (
                  <li
                    className="team-member-row"
                    key={
                      member.memberKey
                    }
                  >
                    <div
                      aria-hidden="true"
                      className="team-member-avatar"
                    >
                      {member.currentUser
                        ? messages.meInitials
                        : messages.teamInitials}
                    </div>
                    <div>
                      <strong>
                        {member.displayName ??
                          (member.currentUser
                            ? messages.currentUser
                            : messages.protectedMember)}
                      </strong>
                      <small>
                        {member.primaryEmail ??
                          messages.reference(member.referenceCode)}
                      </small>
                    </div>
                    <div className="team-member-badges">
                    <span className="status-pill neutral">{managementMessages[member.status]}</span>
                    <span className="status-pill neutral">
                      {
                        messages.roles[
                          member.role
                        ]
                      }
                    </span>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </section>

          <TeamManagement language={language} directory={directory} onDirectory={setDirectory} />

          <section
            aria-label={messages.permissionsAriaLabel}
            className="role-grid"
          >
            {roles.map((role) => (
              <article
                className="card role-card"
                key={role}
              >
                <div className="role-card-heading">
                  <span
                    aria-hidden="true"
                    className="role-symbol"
                  >
                    {role === "owner"
                      ? "O"
                      : role ===
                            "manager"
                        ? "M"
                        : role ===
                              "agent"
                          ? "A"
                          : "V"}
                  </span>
                  <div>
                    <span className="card-kicker">
                      {role}
                    </span>
                    <h2>
                      {
                        messages.roles[
                          role
                        ]
                      }
                    </h2>
                  </div>
                </div>
                <strong className="permission-count">
                  {messages.permissionCount(
                    rolePermissions[role].length,
                  )}
                </strong>
                <ul>
                  {rolePermissions[
                    role
                  ].map(
                    (permission) => (
                      <li
                        key={
                          permission
                        }
                      >
                        {
                          messages.permissions[
                            permission
                          ]
                        }
                      </li>
                    ),
                  )}
                </ul>
              </article>
            ))}
          </section>
        </>
      ) : (
        <div
          className="inline-notice danger"
          role="alert"
        >
          {
            messages.statuses[
              status
            ]
          }
        </div>
      )}
    </>
  );
}

export function TeamDirectory(props: { language: InterfaceLanguage; directory: TeamDirectoryView; status: TeamDirectoryStatus }) {
  const snapshotKey = JSON.stringify([props.language, props.status, props.directory]);
  return <TeamDirectoryContent key={snapshotKey} {...props} />;
}
