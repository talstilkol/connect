"use client";

import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import type {
  CampaignAudienceOptionsView,
  CampaignDeliveryReadinessStatus,
  CampaignDirectoryStatus,
  CampaignTemplateOptionView,
  CampaignView,
} from "../../shared/domain/campaignView";
import type {
  CampaignPersonalizationField,
} from "../../shared/domain/campaignAudience";
import {
  activateCampaignAction,
  saveCampaignSnapshotAction,
} from "../../server/campaigns/campaignActions";
import type {
  ActivateCampaignActionResult,
  SaveCampaignSnapshotActionResult,
} from "../../server/campaigns/campaignActionResult";
import { CampaignDraftComposer } from "./CampaignDraftComposer";

const personalizationFields: readonly {
  value: CampaignPersonalizationField;
  label: string;
}[] = [
  { value: "firstName", label: "שם פרטי" },
  { value: "lastName", label: "שם משפחה" },
  { value: "email", label: "דוא״ל" },
  { value: "company", label: "חברה" },
  { value: "phoneNumber", label: "מספר טלפון" },
];

const campaignStatusLabels: Record<
  CampaignView["status"],
  string
> = {
  draft: "טיוטה",
  scheduled: "מתוזמן",
  running: "בתהליך",
  paused: "מושהה",
  completed: "הושלם",
  cancelled: "בוטל",
  failed: "נכשל",
};

const directoryFailureMessages: Record<
  Exclude<CampaignDirectoryStatus, "ready">,
  string
> = {
  "configuration-required":
    "Clerk או D1 אינם מוגדרים. מוצג Rehearsal מקומי בלבד, ללא Campaign עסקי.",
  "onboarding-required":
    "נדרש להשלים יצירת סביבת עבודה לפני ניהול קמפיינים.",
  "tenant-selection-required":
    "יש לבחור סביבת עבודה פעילה לפני ניהול קמפיינים.",
  "permission-denied":
    "לתפקיד הנוכחי אין הרשאה לקריאת קמפיינים.",
  "server-error":
    "לא ניתן לטעון כרגע את הקמפיינים מהשרת.",
};

function utcTimestamp(
  localValue: string,
): string | null {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(
      localValue,
    )
  ) {
    return null;
  }

  const candidate = `${localValue}:00.000Z`;

  if (
    !Number.isFinite(Date.parse(candidate)) ||
    new Date(
      Date.parse(candidate),
    ).toISOString() !== candidate
  ) {
    return null;
  }

  return candidate;
}

function personalizationLabel(key: string): string {
  if (key === "url:1") {
    return "משתנה Dynamic URL";
  }

  const variableNumber = key.replace("body:", "");
  return `משתנה גוף {{${variableNumber}}}`;
}

function saveResultMessage(
  result: SaveCampaignSnapshotActionResult,
): string {
  const messages: Record<
    SaveCampaignSnapshotActionResult["status"],
    string
  > = {
    saved:
      "ה־Campaign נשמר כטיוטה קבועה עם Snapshot של התבנית והקהל.",
    "invalid-input":
      "פרטי הקמפיין אינם תקינים. יש לבדוק שם, מועד ומיפויים.",
    "profile-required":
      "נדרש לשמור פרופיל עסק ואזור זמן לפני יצירת קמפיין.",
    "template-unavailable":
      "התבנית אינה זמינה עוד או שאיבדה את אישור Meta.",
    "audience-invalid":
      "הקהל ריק, אינו כשיר או שחסרים ערכי התאמה אמיתיים.",
    "configuration-required":
      "שמירה קבועה דורשת Clerk ו־D1 מוגדרים.",
    unauthenticated:
      "נדרשת התחברות לפני שמירת קמפיין.",
    "onboarding-required":
      "נדרש להשלים יצירת סביבת עבודה.",
    "tenant-selection-required":
      "יש לבחור סביבת עבודה פעילה.",
    "permission-denied":
      "אין הרשאה לשמור קמפיין.",
    "server-error":
      "שמירת הקמפיין נכשלה בלי לחשוף פרטי שרת.",
  };

  return messages[result.status];
}

function activationResultMessage(
  result: ActivateCampaignActionResult,
): string {
  const messages: Record<
    ActivateCampaignActionResult["status"],
    string
  > = {
    activated:
      "הקמפיין הופעל ויעבור ל־Scheduler במועד המתאים.",
    "invalid-input":
      "זהות הקמפיין או הגרסה אינן תקינות.",
    "state-conflict":
      "הקמפיין השתנה או שכבר הופעל. יש לרענן את הרשימה.",
    "delivery-configuration-required":
      "ההפעלה חסומה עד חיבור Adapter שליחה אמיתי.",
    "configuration-required":
      "ההפעלה דורשת Clerk ו־D1 מוגדרים.",
    unauthenticated:
      "נדרשת התחברות לפני הפעלת קמפיין.",
    "onboarding-required":
      "נדרש להשלים יצירת סביבת עבודה.",
    "tenant-selection-required":
      "יש לבחור סביבת עבודה פעילה.",
    "permission-denied":
      "אין הרשאה להפעיל קמפיין.",
    "server-error":
      "הפעלת הקמפיין נכשלה בלי לחשוף פרטי שרת.",
  };

  return messages[result.status];
}

function resultTone(
  status: string,
): "success" | "warning" {
  return status === "saved" ||
    status === "activated"
    ? "success"
    : "warning";
}

export function CampaignManager({
  authEnabled,
  initialCampaigns,
  initialTemplates,
  initialAudiences,
  initialStatus,
  canWrite,
  deliveryStatus,
}: {
  authEnabled: boolean;
  initialCampaigns: readonly CampaignView[];
  initialTemplates:
    readonly CampaignTemplateOptionView[];
  initialAudiences: CampaignAudienceOptionsView;
  initialStatus: CampaignDirectoryStatus;
  canWrite: boolean;
  deliveryStatus:
    CampaignDeliveryReadinessStatus;
}) {
  const [campaigns, setCampaigns] = useState([
    ...initialCampaigns,
  ]);
  const [name, setName] = useState("");
  const [templateKey, setTemplateKey] = useState(
    initialTemplates[0]?.templateKey ?? "",
  );
  const [audienceKind, setAudienceKind] =
    useState<"all" | "list" | "tag">("all");
  const [listId, setListId] = useState<number | null>(
    initialAudiences.lists[0]?.id ?? null,
  );
  const [tagId, setTagId] = useState<number | null>(
    initialAudiences.tags[0]?.id ?? null,
  );
  const [deliveryMode, setDeliveryMode] =
    useState<"immediate" | "scheduled">(
      "immediate",
    );
  const [scheduledUtc, setScheduledUtc] =
    useState("");
  const [
    personalizationMapping,
    setPersonalizationMapping,
  ] = useState<Record<string, string>>({});
  const [saveResult, setSaveResult] =
    useState<SaveCampaignSnapshotActionResult | null>(
      null,
    );
  const [activationResult, setActivationResult] =
    useState<ActivateCampaignActionResult | null>(
      null,
    );
  const [isPending, startTransition] =
    useTransition();

  if (
    !authEnabled ||
    initialStatus === "configuration-required"
  ) {
    return (
      <div className="campaign-server-shell">
        <div className="inline-notice warning">
          <span aria-hidden="true">i</span>
          <p>
            {
              directoryFailureMessages[
                "configuration-required"
              ]
            }
          </p>
        </div>
        <CampaignDraftComposer />
      </div>
    );
  }

  if (initialStatus !== "ready") {
    return (
      <section className="card campaign-directory-empty">
        <span aria-hidden="true">!</span>
        <strong>הקמפיינים אינם זמינים</strong>
        <p>{directoryFailureMessages[initialStatus]}</p>
      </section>
    );
  }

  const selectedTemplate =
    initialTemplates.find(
      (template) =>
        template.templateKey === templateKey,
    ) ?? null;
  const requiredKeys =
    selectedTemplate?.personalizationKeys ?? [];
  const mappingComplete = requiredKeys.every(
    (key) =>
      personalizationMapping[key] !== undefined &&
      personalizationMapping[key] !== "",
  );
  const audienceComplete =
    audienceKind === "all" ||
    (audienceKind === "list" && listId !== null) ||
    (audienceKind === "tag" && tagId !== null);
  const scheduledAt =
    deliveryMode === "scheduled"
      ? utcTimestamp(scheduledUtc)
      : null;
  const canSave =
    canWrite &&
    name.trim().length > 0 &&
    selectedTemplate !== null &&
    audienceComplete &&
    mappingComplete &&
    (deliveryMode === "immediate" ||
      scheduledAt !== null) &&
    !isPending;

  const saveCampaign = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!canSave || !selectedTemplate) {
      return;
    }

    const audienceSource =
      audienceKind === "all"
        ? { kind: "all" as const }
        : audienceKind === "list" &&
            listId !== null
          ? {
              kind: "list" as const,
              listId,
            }
          : tagId !== null
            ? {
                kind: "tag" as const,
                tagId,
              }
            : null;

    if (!audienceSource) {
      return;
    }

    startTransition(async () => {
      const result =
        await saveCampaignSnapshotAction({
          name: name.trim(),
          deliveryMode,
          scheduledAt,
          templateKey:
            selectedTemplate.templateKey,
          audienceSource,
          personalizationMapping:
            Object.fromEntries(
              requiredKeys.map((key) => [
                key,
                personalizationMapping[key],
              ]),
            ),
        });

      setSaveResult(result);
      setActivationResult(null);

      if (result.status === "saved") {
        setCampaigns((current) => [
          result.campaign,
          ...current.filter(
            (campaign) =>
              campaign.campaignKey !==
              result.campaign.campaignKey,
          ),
        ]);
        setName("");
      }
    });
  };

  const activateCampaign = (
    campaign: CampaignView,
  ) => {
    if (
      !canWrite ||
      deliveryStatus !== "ready" ||
      campaign.status !== "draft" ||
      isPending
    ) {
      return;
    }

    startTransition(async () => {
      const result = await activateCampaignAction({
        campaignKey: campaign.campaignKey,
        expectedVersion: campaign.version,
      });

      setActivationResult(result);
      setSaveResult(null);

      if (result.status === "activated") {
        setCampaigns((current) =>
          current.map((currentCampaign) =>
            currentCampaign.campaignKey ===
            result.campaign.campaignKey
              ? {
                  ...currentCampaign,
                  status: result.campaign.status,
                  version: result.campaign.version,
                  activatedAt:
                    result.campaign.activatedAt,
                  startedAt:
                    result.campaign.startedAt,
                  updatedAt:
                    result.campaign.activatedAt,
                }
              : currentCampaign,
          ),
        );
      }
    });
  };

  return (
    <div className="campaign-server-shell">
      {deliveryStatus !== "ready" ? (
        <div className="inline-notice warning">
          <span aria-hidden="true">!</span>
          <p>
            ניתן לשמור Campaign אמיתי כטיוטה. ההפעלה
            חסומה עד חיבור Adapter שליחה אמיתי וקביעת
            מדיניות הקצב וה־Retry.
          </p>
        </div>
      ) : null}

      <div className="campaign-directory-layout">
        <section className="card campaign-form-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">
                Server campaign
              </span>
              <h2>יצירת טיוטת קמפיין</h2>
            </div>
            <span
              className={`status-pill ${
                canWrite ? "success" : "warning"
              }`}
            >
              {canWrite ? "שמירה ב־D1" : "קריאה בלבד"}
            </span>
          </div>

          {initialTemplates.length === 0 ? (
            <div className="inline-notice warning">
              <span aria-hidden="true">i</span>
              <p>
                אין תבנית מאושרת המחוברת לזהות Meta,
                ולכן לא ניתן ליצור Campaign.
              </p>
            </div>
          ) : null}

          <form
            className="campaign-form"
            onSubmit={saveCampaign}
          >
            <label>
              <span>שם הקמפיין</span>
              <input
                value={name}
                maxLength={160}
                onChange={(event) =>
                  setName(event.target.value)
                }
                disabled={!canWrite || isPending}
                required
              />
            </label>

            <label>
              <span>תבנית מאושרת</span>
              <select
                value={templateKey}
                onChange={(event) => {
                  setTemplateKey(event.target.value);
                  setPersonalizationMapping({});
                }}
                disabled={
                  !canWrite ||
                  isPending ||
                  initialTemplates.length === 0
                }
              >
                {initialTemplates.map((template) => (
                  <option
                    value={template.templateKey}
                    key={template.templateKey}
                  >
                    {template.name} · {template.language} ·{" "}
                    {template.category}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="delivery-fieldset">
              <legend>מקור הקהל</legend>
              <label
                className={
                  audienceKind === "all"
                    ? "selected"
                    : ""
                }
              >
                <input
                  type="radio"
                  name="audienceKind"
                  checked={audienceKind === "all"}
                  onChange={() =>
                    setAudienceKind("all")
                  }
                />
                <span>
                  <strong>כל אנשי הקשר הכשירים</strong>
                  <small>
                    Consent ו־Unsubscribe נבדקים בשרת.
                  </small>
                </span>
              </label>
              <label
                className={
                  audienceKind === "list"
                    ? "selected"
                    : ""
                }
              >
                <input
                  type="radio"
                  name="audienceKind"
                  checked={audienceKind === "list"}
                  disabled={
                    initialAudiences.lists.length === 0
                  }
                  onChange={() =>
                    setAudienceKind("list")
                  }
                />
                <span>
                  <strong>רשימה</strong>
                  <small>
                    מקור Tenant קבוע מתוך D1.
                  </small>
                </span>
              </label>
              <label
                className={
                  audienceKind === "tag"
                    ? "selected"
                    : ""
                }
              >
                <input
                  type="radio"
                  name="audienceKind"
                  checked={audienceKind === "tag"}
                  disabled={
                    initialAudiences.tags.length === 0
                  }
                  onChange={() =>
                    setAudienceKind("tag")
                  }
                />
                <span>
                  <strong>תגית</strong>
                  <small>
                    מקור Tenant קבוע מתוך D1.
                  </small>
                </span>
              </label>
            </fieldset>

            {audienceKind === "list" ? (
              <label>
                <span>בחירת רשימה</span>
                <select
                  value={listId ?? ""}
                  onChange={(event) =>
                    setListId(
                      event.target.value
                        ? Number(event.target.value)
                        : null,
                    )
                  }
                >
                  {initialAudiences.lists.map((list) => (
                    <option value={list.id} key={list.id}>
                      {list.name} · {list.contactCount} קשרים
                      לפני בדיקת כשירות
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {audienceKind === "tag" ? (
              <label>
                <span>בחירת תגית</span>
                <select
                  value={tagId ?? ""}
                  onChange={(event) =>
                    setTagId(
                      event.target.value
                        ? Number(event.target.value)
                        : null,
                    )
                  }
                >
                  {initialAudiences.tags.map((tag) => (
                    <option value={tag.id} key={tag.id}>
                      {tag.name} · {tag.contactCount} קשרים
                      לפני בדיקת כשירות
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {requiredKeys.length > 0 ? (
              <fieldset className="campaign-variable-mapping">
                <legend>
                  התאמת משתנים לשדות Contact
                </legend>
                <p>
                  כל ערך מגיע משדה אמיתי ב־D1. אין
                  ברירת מחדל ואין המצאת מידע.
                </p>
                <div className="campaign-server-mapping">
                  {requiredKeys.map((key) => (
                    <label key={key}>
                      <span>
                        {personalizationLabel(key)}
                      </span>
                      <select
                        value={
                          personalizationMapping[key] ??
                          ""
                        }
                        onChange={(event) =>
                          setPersonalizationMapping(
                            (current) => ({
                              ...current,
                              [key]: event.target.value,
                            }),
                          )
                        }
                        required
                      >
                        <option value="">
                          בחירת שדה Contact
                        </option>
                        {personalizationFields.map(
                          (field) => (
                            <option
                              value={field.value}
                              key={field.value}
                            >
                              {field.label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <div className="inline-notice success">
                <span aria-hidden="true">✓</span>
                <p>
                  התבנית אינה דורשת ערכי התאמה.
                </p>
              </div>
            )}

            <fieldset className="delivery-fieldset">
              <legend>מועד</legend>
              <label
                className={
                  deliveryMode === "immediate"
                    ? "selected"
                    : ""
                }
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  checked={
                    deliveryMode === "immediate"
                  }
                  onChange={() =>
                    setDeliveryMode("immediate")
                  }
                />
                <span>
                  <strong>מיידי</strong>
                  <small>
                    ירוץ לאחר Activation וה־Cron הבא.
                  </small>
                </span>
              </label>
              <label
                className={
                  deliveryMode === "scheduled"
                    ? "selected"
                    : ""
                }
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  checked={
                    deliveryMode === "scheduled"
                  }
                  onChange={() =>
                    setDeliveryMode("scheduled")
                  }
                />
                <span>
                  <strong>מתוזמן</strong>
                  <small>
                    בשלב זה המועד מוזן במפורש ב־UTC.
                  </small>
                </span>
              </label>
            </fieldset>

            {deliveryMode === "scheduled" ? (
              <label>
                <span>תאריך ושעת UTC</span>
                <input
                  type="datetime-local"
                  value={scheduledUtc}
                  onChange={(event) =>
                    setScheduledUtc(event.target.value)
                  }
                  required
                />
                <small className="schedule-boundary-note">
                  המערכת אינה מנחשת אזור זמן מתוך
                  הדפדפן.
                </small>
              </label>
            ) : null}

            <div className="campaign-form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={!canSave}
              >
                {isPending
                  ? "שומר…"
                  : "שמירת Campaign ב־D1"}
              </button>
            </div>
          </form>

          {saveResult ? (
            <div
              className={`inline-notice ${resultTone(
                saveResult.status,
              )}`}
              role="status"
            >
              <span aria-hidden="true">
                {saveResult.status === "saved"
                  ? "✓"
                  : "!"}
              </span>
              <p>{saveResultMessage(saveResult)}</p>
            </div>
          ) : null}
        </section>

        <section className="card campaign-directory-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">
                D1 source of truth
              </span>
              <h2>קמפיינים שמורים</h2>
            </div>
            <span className="status-pill">
              {campaigns.length}
            </span>
          </div>

          {activationResult ? (
            <div
              className={`inline-notice ${resultTone(
                activationResult.status,
              )}`}
              role="status"
            >
              <span aria-hidden="true">
                {activationResult.status === "activated"
                  ? "✓"
                  : "!"}
              </span>
              <p>
                {activationResultMessage(
                  activationResult,
                )}
              </p>
            </div>
          ) : null}

          {campaigns.length === 0 ? (
            <div className="campaign-directory-empty">
              <span aria-hidden="true">◎</span>
              <strong>אין קמפיינים שמורים</strong>
              <p>
                טיוטה תופיע כאן רק לאחר שמירה מוצלחת
                בשרת.
              </p>
            </div>
          ) : (
            <div className="campaign-records">
              {campaigns.map((campaign) => (
                <article
                  className="campaign-record"
                  key={campaign.campaignKey}
                >
                  <div>
                    <span className="card-kicker">
                      {campaign.templateName} ·{" "}
                      {campaign.templateLanguage}
                    </span>
                    <h3>{campaign.name}</h3>
                    <p>
                      {campaign.recipientCount} נמענים ·{" "}
                      {campaign.deliveryMode ===
                      "immediate"
                        ? "מיידי"
                        : `UTC ${campaign.scheduledAt}`}
                    </p>
                  </div>
                  <div className="campaign-record-state">
                    <span
                      className={`status-pill ${
                        campaign.status === "completed"
                          ? "success"
                          : campaign.status === "failed"
                            ? "critical"
                            : campaign.status === "draft"
                              ? "warning"
                              : ""
                      }`}
                    >
                      {
                        campaignStatusLabels[
                          campaign.status
                        ]
                      }
                    </span>
                    <small>
                      גרסה {campaign.version}
                    </small>
                  </div>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={
                      !canWrite ||
                      deliveryStatus !== "ready" ||
                      campaign.status !== "draft" ||
                      isPending
                    }
                    onClick={() =>
                      activateCampaign(campaign)
                    }
                  >
                    {campaign.status === "draft"
                      ? deliveryStatus === "ready"
                        ? "הפעלת קמפיין"
                        : "הפעלה חסומה"
                      : "כבר הופעל"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
