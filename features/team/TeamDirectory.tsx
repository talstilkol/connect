import {
  roleLabels,
  rolePermissions,
  type TenantRole,
} from "../../shared/domain/model.ts";
import type {
  TeamDirectoryStatus,
  TeamDirectoryView,
} from "../../shared/domain/teamDirectoryView.ts";

const statusMessages: Record<
  Exclude<
    TeamDirectoryStatus,
    "ready"
  >,
  string
> = {
  "configuration-required":
    "נדרשת הגדרת Clerk ו־D1 כדי לטעון את צוות סביבת העבודה.",
  unauthenticated:
    "יש להתחבר מחדש כדי לצפות בצוות.",
  "onboarding-required":
    "יש ליצור סביבת עבודה לפני ניהול צוות.",
  "tenant-selection-required":
    "יש לבחור סביבת עבודה פעילה לפני ניהול צוות.",
  "permission-denied":
    "לתפקיד הנוכחי אין הרשאה לצפות בצוות ובהרשאות.",
  "server-error":
    "לא ניתן לטעון כרגע את צוות סביבת העבודה.",
};

const roles =
  Object.keys(
    roleLabels,
  ) as TenantRole[];

export function TeamDirectory({
  directory,
  status,
}: {
  directory: TeamDirectoryView;
  status: TeamDirectoryStatus;
}) {
  return (
    <>
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">
            RBAC
          </p>
          <h1>צוות והרשאות</h1>
          <p>
            Clerk מזהה את המשתמש,
            Membership בצד השרת קובע את
            ה־Tenant, ומטריצת RBAC קובעת
            את הפעולות המותרות.
          </p>
        </div>
        <div className="heading-actions">
          <button
            aria-describedby="team-invitation-unavailable"
            className="primary-button"
            disabled
            title="הזמנות יופעלו לאחר חיבור Clerk User Directory וחוזה Audit"
            type="button"
          >
            הזמנת משתמש
          </button>
        </div>
      </div>

      <p
        className="inline-notice warning"
        id="team-invitation-unavailable"
        role="status"
      >
        הזמנה ושינוי משתמשים נשארים
        חסומים עד חיבור פרטי זהות
        מאומתים, Version ו־Audit אטומי.
      </p>

      {status === "ready" ? (
        <>
          <section
            aria-labelledby="team-members-title"
            className="card team-directory-card"
          >
            <div className="card-heading">
              <div>
                <span className="card-kicker">
                  D1
                </span>
                <h2 id="team-members-title">
                  חברי הצוות הפעילים
                </h2>
              </div>
              <span className="status-pill healthy">
                {
                  directory.members
                    .length
                }{" "}
                פעילים
              </span>
            </div>
            {directory.identityStatus ===
            "unavailable" ? (
              <p className="team-directory-note">
                שמות ואימיילים אינם
                מוצגים עד חיבור Clerk
                User Directory. חברים
                אחרים מזוהים באמצעות
                Reference Code מוגן
                הנגזר בשרת.
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
                        ? "אני"
                        : "צ"}
                    </div>
                    <div>
                      <strong>
                        {member.displayName ??
                          (member.currentUser
                            ? "המשתמש הנוכחי"
                            : "חבר צוות מוגן")}
                      </strong>
                      <small>
                        {member.primaryEmail ??
                          `Reference: ${member.referenceCode}`}
                      </small>
                    </div>
                    <span className="status-pill neutral">
                      {
                        roleLabels[
                          member.role
                        ]
                      }
                    </span>
                  </li>
                ),
              )}
            </ul>
          </section>

          <section
            aria-label="מטריצת הרשאות"
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
                        roleLabels[
                          role
                        ]
                      }
                    </h2>
                  </div>
                </div>
                <strong className="permission-count">
                  {
                    rolePermissions[
                      role
                    ].length
                  }{" "}
                  הרשאות מוגדרות
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
                        {permission}
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
            statusMessages[
              status
            ]
          }
        </div>
      )}
    </>
  );
}
