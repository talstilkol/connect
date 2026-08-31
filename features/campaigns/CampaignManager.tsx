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
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import {
  activateCampaignAction,
  saveCampaignSnapshotAction,
} from "../../server/campaigns/campaignActions";
import type {
  ActivateCampaignActionResult,
  SaveCampaignSnapshotActionResult,
} from "../../server/campaigns/campaignActionResult";
import { CampaignDraftComposer } from "./CampaignDraftComposer";
import { readCampaignMessages } from "./campaignMessages";

const personalizationFields: readonly CampaignPersonalizationField[] = [
  "firstName",
  "lastName",
  "email",
  "company",
  "phoneNumber",
];

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
  language,
  initialCampaigns,
  initialTemplates,
  initialAudiences,
  initialStatus,
  canWrite,
  deliveryStatus,
}: {
  authEnabled: boolean;
  language: InterfaceLanguage;
  initialCampaigns: readonly CampaignView[];
  initialTemplates:
    readonly CampaignTemplateOptionView[];
  initialAudiences: CampaignAudienceOptionsView;
  initialStatus: CampaignDirectoryStatus;
  canWrite: boolean;
  deliveryStatus:
    CampaignDeliveryReadinessStatus;
}) {
  const messages = readCampaignMessages(language);
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
              messages.manager.directoryFailures[
                "configuration-required"
              ]
            }
          </p>
        </div>
        <CampaignDraftComposer language={language} />
      </div>
    );
  }

  if (initialStatus !== "ready") {
    return (
      <section className="card campaign-directory-empty">
        <span aria-hidden="true">!</span>
        <strong>{messages.manager.unavailableTitle}</strong>
        <p>{messages.manager.directoryFailures[initialStatus]}</p>
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
          <p>{messages.manager.deliveryUnavailable}</p>
        </div>
      ) : null}

      <div className="campaign-directory-layout">
        <section className="card campaign-form-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">
                {messages.manager.form.kicker}
              </span>
              <h2>{messages.manager.form.title}</h2>
            </div>
            <span
              className={`status-pill ${
                canWrite ? "success" : "warning"
              }`}
            >
              {canWrite
                ? messages.manager.form.writable
                : messages.manager.form.readOnly}
            </span>
          </div>

          {initialTemplates.length === 0 ? (
            <div className="inline-notice warning">
              <span aria-hidden="true">i</span>
              <p>{messages.manager.form.noTemplate}</p>
            </div>
          ) : null}

          <form
            className="campaign-form"
            onSubmit={saveCampaign}
          >
            <label>
              <span>{messages.manager.form.name}</span>
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
              <span>{messages.manager.form.approvedTemplate}</span>
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
              <legend>{messages.manager.form.audienceLegend}</legend>
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
                  <strong>{messages.manager.form.allContacts}</strong>
                  <small>{messages.manager.form.allContactsDetail}</small>
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
                  <strong>{messages.manager.form.list}</strong>
                  <small>{messages.manager.form.persistentAudienceDetail}</small>
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
                  <strong>{messages.manager.form.tag}</strong>
                  <small>{messages.manager.form.persistentAudienceDetail}</small>
                </span>
              </label>
            </fieldset>

            {audienceKind === "list" ? (
              <label>
                <span>{messages.manager.form.chooseList}</span>
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
                      {messages.manager.form.groupOption(
                        list.name,
                        list.contactCount,
                      )}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {audienceKind === "tag" ? (
              <label>
                <span>{messages.manager.form.chooseTag}</span>
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
                      {messages.manager.form.groupOption(
                        tag.name,
                        tag.contactCount,
                      )}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {requiredKeys.length > 0 ? (
              <fieldset className="campaign-variable-mapping">
                <legend>
                  {messages.manager.form.mappingLegend}
                </legend>
                <p>{messages.manager.form.mappingDescription}</p>
                <div className="campaign-server-mapping">
                  {requiredKeys.map((key) => (
                    <label key={key}>
                      <span>
                        {key === "url:1"
                          ? messages.manager.dynamicUrlVariable
                          : messages.manager.bodyVariable(
                              key.replace("body:", ""),
                            )}
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
                          {messages.manager.form.chooseContactField}
                        </option>
                        {personalizationFields.map(
                          (field) => (
                            <option
                              value={field}
                              key={field}
                            >
                              {
                                messages.manager.personalizationFields[
                                  field
                                ]
                              }
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
                <p>{messages.manager.form.noMappingRequired}</p>
              </div>
            )}

            <fieldset className="delivery-fieldset">
              <legend>{messages.manager.form.timingLegend}</legend>
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
                  <strong>{messages.manager.form.immediate}</strong>
                  <small>{messages.manager.form.immediateDetail}</small>
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
                  <strong>{messages.manager.form.scheduled}</strong>
                  <small>{messages.manager.form.scheduledDetail}</small>
                </span>
              </label>
            </fieldset>

            {deliveryMode === "scheduled" ? (
              <label>
                <span>{messages.manager.form.utcDateTime}</span>
                <input
                  type="datetime-local"
                  value={scheduledUtc}
                  onChange={(event) =>
                    setScheduledUtc(event.target.value)
                  }
                  required
                />
                <small className="schedule-boundary-note">
                  {messages.manager.form.timezoneBoundary}
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
                  ? messages.manager.form.saving
                  : messages.manager.form.save}
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
              <p>{messages.manager.saveResults[saveResult.status]}</p>
            </div>
          ) : null}
        </section>

        <section className="card campaign-directory-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">
                {messages.manager.directory.kicker}
              </span>
              <h2>{messages.manager.directory.title}</h2>
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
                {
                  messages.manager.activationResults[
                    activationResult.status
                  ]
                }
              </p>
            </div>
          ) : null}

          {campaigns.length === 0 ? (
            <div className="campaign-directory-empty">
              <span aria-hidden="true">◎</span>
              <strong>{messages.manager.directory.emptyTitle}</strong>
              <p>{messages.manager.directory.emptyDescription}</p>
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
                      {messages.manager.directory.recipients(
                        campaign.recipientCount,
                      )}{" "}
                      ·{" "}
                      {campaign.deliveryMode ===
                      "immediate"
                        ? messages.manager.directory.immediate
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
                        messages.manager.campaignStatuses[
                          campaign.status
                        ]
                      }
                    </span>
                    <small>
                      {messages.manager.directory.version(campaign.version)}
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
                        ? messages.manager.directory.activate
                        : messages.manager.directory.activationBlocked
                      : messages.manager.directory.alreadyActivated}
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
