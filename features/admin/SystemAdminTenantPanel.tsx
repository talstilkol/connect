"use client";

import Link from "next/link";
import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import type {
  SystemAdminSubscriptionFilter,
  SystemAdminTenantDirectoryFilters,
  SystemAdminTenantDirectoryPage,
  SystemAdminTenantDirectoryStatus,
  SystemAdminTenantRecord,
  SystemAdminTenantStatusFilter,
} from "../../shared/domain/systemAdminTenantDirectory.ts";
import {
  DEFAULT_SYSTEM_ADMIN_TENANT_DIRECTORY_FILTERS,
  matchesSystemAdminTenantDirectoryFilters,
} from "../../shared/domain/systemAdminTenantDirectory.ts";
import type {
  TenantSubscriptionAdminView,
} from "../../shared/domain/tenantSubscriptionAdminView.ts";
import {
  loadSystemAdminTenantDirectoryAction,
} from "../../server/admin/systemAdminTenantDirectoryActions.ts";
import {
  cancelTenantSubscriptionAdminAction,
  changeTenantSubscriptionStatusAdminAction,
  createTenantSubscriptionAdminAction,
  extendTenantSubscriptionAdminAction,
} from "../../server/billing/systemAdminSubscriptionActions.ts";
import type {
  SystemAdminSubscriptionActionResult,
} from "../../server/billing/systemAdminSubscriptionActionResult.ts";
import {
  updateBusinessProfileAdminAction,
} from "../../server/admin/systemAdminBusinessProfileActions.ts";
import type {
  SystemAdminBusinessProfileView,
} from "../../shared/domain/systemAdminBusinessProfile.ts";
import {
  SystemAdminBusinessProfileForm,
  type SystemAdminBusinessProfileDraft,
} from "./SystemAdminBusinessProfileForm.tsx";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import {
  adminHomePath,
  adminPath,
} from "../../shared/i18n/admin.ts";
import {
  workspaceSectionPath,
} from "../../shared/workspace/navigation.ts";
import { AdminLanguageSelector } from "./AdminLanguageSelector.tsx";
import {
  readSystemAdminTenantMessages,
} from "./systemAdminTenantMessages.ts";
import {
  useAdminDocumentLocale,
} from "./useAdminDocumentLocale.ts";

type Feedback = {
  tone: "success" | "danger";
  message: string;
} | null;

function hasDirectoryFilters(
  filters:
    SystemAdminTenantDirectoryFilters,
): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.tenantStatus !== "all" ||
    filters.subscription !== "all"
  );
}

function formatDateTime(
  value: string,
  locale: string,
): string {
  const parsed = new Date(value);

  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    locale,
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "UTC",
    },
  ).format(parsed);
}

function dateInputValue(
  value: string,
): string {
  return value.slice(0, 10);
}

function canonicalUtcDate(
  value: FormDataEntryValue | null,
): string | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const timestamp = `${value}T00:00:00.000Z`;

  return new Date(timestamp).toISOString() ===
    timestamp
    ? timestamp
    : null;
}

function replaceSubscription(
  tenants:
    readonly SystemAdminTenantRecord[],
  tenantId: number,
  subscription:
    TenantSubscriptionAdminView,
): SystemAdminTenantRecord[] {
  return tenants.map((tenant) =>
    tenant.tenantId === tenantId
      ? {
          ...tenant,
          tenantStatus:
            subscription.status,
          subscription,
        }
      : tenant,
  );
}

function replaceBusinessProfile(
  tenants:
    readonly SystemAdminTenantRecord[],
  tenantId: number,
  businessProfile:
    SystemAdminBusinessProfileView,
): SystemAdminTenantRecord[] {
  return tenants.map((tenant) =>
    tenant.tenantId === tenantId
      ? {
          ...tenant,
          displayName:
            businessProfile.businessName,
          businessProfile,
        }
      : tenant,
  );
}

function AdminState({
  language,
  direction,
  status,
}: {
  language: InterfaceLanguage;
  direction: "ltr" | "rtl";
  status: Exclude<
    SystemAdminTenantDirectoryStatus,
    "ready"
  >;
}) {
  const messages =
    readSystemAdminTenantMessages(language);
  const content = messages.states[status];

  return (
    <main
      className="admin-state-shell"
      dir={direction}
      lang={language}
    >
      <section
        className="admin-state-card"
        role={
          status === "server-error"
            ? "alert"
            : "status"
        }
      >
        <span aria-hidden="true">!</span>
        <p>Connect System Admin</p>
        <h1>{content.title}</h1>
        <p>{content.description}</p>
        <AdminLanguageSelector
          language={language}
          pathname="/admin"
        />
        <Link
          href={adminHomePath(language)}
          className="secondary-button"
        >
          {messages.backHome}
        </Link>
      </section>
    </main>
  );
}

function SubscriptionSummary({
  language,
  subscription,
}: {
  language: InterfaceLanguage;
  subscription:
    TenantSubscriptionAdminView;
}) {
  const messages =
    readSystemAdminTenantMessages(language);

  return (
    <dl className="admin-subscription-summary">
      <div>
        <dt>{messages.periodStart}</dt>
        <dd>
          {formatDateTime(
            subscription.startsAt,
            messages.locale,
          )}
          {" UTC"}
        </dd>
      </div>
      <div>
        <dt>{messages.periodEnd}</dt>
        <dd>
          {formatDateTime(
            subscription.endsAt,
            messages.locale,
          )}
          {" UTC"}
        </dd>
      </div>
      <div>
        <dt>{messages.version}</dt>
        <dd>{subscription.version}</dd>
      </div>
      <div>
        <dt>{messages.lastUpdated}</dt>
        <dd>
          {formatDateTime(
            subscription.updatedAt,
            messages.locale,
          )}
        </dd>
      </div>
    </dl>
  );
}

export function SystemAdminTenantPanel({
  language,
  initialStatus,
  initialDirectory,
}: {
  language: InterfaceLanguage;
  initialStatus:
    SystemAdminTenantDirectoryStatus;
  initialDirectory:
    SystemAdminTenantDirectoryPage;
}) {
  const messages =
    readSystemAdminTenantMessages(language);
  const direction =
    useAdminDocumentLocale(language);
  const [tenants, setTenants] =
    useState([
      ...initialDirectory.tenants,
    ]);
  const [nextCursor, setNextCursor] =
    useState(
      initialDirectory.nextCursor,
    );
  const [query, setQuery] = useState("");
  const [tenantStatusFilter, setTenantStatusFilter] =
    useState<SystemAdminTenantStatusFilter>(
      "all",
    );
  const [subscriptionFilter, setSubscriptionFilter] =
    useState<SystemAdminSubscriptionFilter>(
      "all",
    );
  const [appliedFilters, setAppliedFilters] =
    useState<SystemAdminTenantDirectoryFilters>(
      DEFAULT_SYSTEM_ADMIN_TENANT_DIRECTORY_FILTERS,
    );
  const [feedback, setFeedback] =
    useState<Feedback>(null);
  const [isPending, startTransition] =
    useTransition();

  const draftFilters = {
    search: query,
    tenantStatus: tenantStatusFilter,
    subscription: subscriptionFilter,
  } satisfies SystemAdminTenantDirectoryFilters;

  const subscriptionCount =
    tenants.filter(
      (tenant) =>
        tenant.subscription !== null,
    ).length;
  const activeCount = tenants.filter(
    (tenant) =>
      tenant.subscription?.status ===
      "active",
  ).length;

  if (initialStatus !== "ready") {
    return (
      <AdminState
        language={language}
        direction={direction}
        status={initialStatus}
      />
    );
  }

  function applyMutation(
    tenantId: number,
    operation:
      () => Promise<SystemAdminSubscriptionActionResult>,
    successMessage: string,
  ) {
    setFeedback(null);

    startTransition(async () => {
      const result = await operation();

      if (result.status !== "saved") {
        setFeedback({
          tone: "danger",
          message:
            messages.subscriptionActionFailures[
              result.status
            ],
        });
        return;
      }

      setTenants((current) =>
        replaceSubscription(
          current,
          tenantId,
          result.subscription,
        ).filter((tenant) =>
          matchesSystemAdminTenantDirectoryFilters(
            tenant,
            appliedFilters,
          ),
        ),
      );
      setFeedback({
        tone: "success",
        message: successMessage,
      });
    });
  }

  function updateBusinessProfile(
    tenantId: number,
    draft:
      SystemAdminBusinessProfileDraft,
  ) {
    setFeedback(null);

    startTransition(async () => {
      const result =
        await updateBusinessProfileAdminAction(
          {
            tenantId,
            ...draft,
          },
        );

      if (result.status !== "saved") {
        setFeedback({
          tone: "danger",
          message:
            messages.profileActionFailures[
              result.status
            ],
        });
        return;
      }

      setTenants((current) =>
        replaceBusinessProfile(
          current,
          tenantId,
          result.profile,
        ).filter((tenant) =>
          matchesSystemAdminTenantDirectoryFilters(
            tenant,
            appliedFilters,
          ),
        ),
      );
      setFeedback({
        tone: "success",
        message:
          result.outcome === "updated"
            ? messages.profileUpdated
            : messages.profileUnchanged,
      });
    });
  }

  function createSubscription(
    tenantId: number,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const formData = new FormData(
      event.currentTarget,
    );
    const startsAt = canonicalUtcDate(
      formData.get("startsAt"),
    );
    const endsAt = canonicalUtcDate(
      formData.get("endsAt"),
    );
    const status =
      formData.get("status");

    if (
      !startsAt ||
      !endsAt ||
      (status !== "trial" &&
        status !== "active")
    ) {
      setFeedback({
        tone: "danger",
        message:
          messages.invalidCreation,
      });
      return;
    }

    applyMutation(
      tenantId,
      () =>
        createTenantSubscriptionAdminAction(
          {
            tenantId,
            status,
            startsAt,
            endsAt,
          },
        ),
      messages.subscriptionCreated,
    );
  }

  function extendSubscription(
    tenant: SystemAdminTenantRecord,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!tenant.subscription) {
      return;
    }

    const formData = new FormData(
      event.currentTarget,
    );
    const newEndsAt = canonicalUtcDate(
      formData.get("newEndsAt"),
    );

    if (!newEndsAt) {
      setFeedback({
        tone: "danger",
        message:
          messages.invalidEndDate,
      });
      return;
    }

    applyMutation(
      tenant.tenantId,
      () =>
        extendTenantSubscriptionAdminAction(
          {
            tenantId: tenant.tenantId,
            expectedVersion:
              tenant.subscription?.version,
            newEndsAt,
          },
        ),
      messages.subscriptionExtended,
    );
  }

  function changeStatus(
    tenant: SystemAdminTenantRecord,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!tenant.subscription) {
      return;
    }

    const formData = new FormData(
      event.currentTarget,
    );
    const status = formData.get("status");

    if (
      status !== "active" &&
      status !== "suspended" &&
      status !== "blocked"
    ) {
      setFeedback({
        tone: "danger",
        message:
          messages.invalidOperationalStatus,
      });
      return;
    }

    applyMutation(
      tenant.tenantId,
      () =>
        changeTenantSubscriptionStatusAdminAction(
          {
            tenantId: tenant.tenantId,
            expectedVersion:
              tenant.subscription?.version,
            status,
          },
        ),
      messages.subscriptionStatusUpdated,
    );
  }

  function cancelSubscription(
    tenant: SystemAdminTenantRecord,
  ) {
    if (
      !tenant.subscription ||
      !window.confirm(
        messages.cancelConfirmation(
          tenant.displayName,
        ),
      )
    ) {
      return;
    }

    applyMutation(
      tenant.tenantId,
      () =>
        cancelTenantSubscriptionAdminAction(
          {
            tenantId: tenant.tenantId,
            expectedVersion:
              tenant.subscription?.version,
          },
        ),
      messages.subscriptionCancelled,
    );
  }

  function loadMore() {
    if (nextCursor === null) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const result =
        await loadSystemAdminTenantDirectoryAction(
          {
            afterTenantId: nextCursor,
            ...appliedFilters,
          },
        );

      if (result.status !== "loaded") {
        setFeedback({
          tone: "danger",
          message:
            messages.directoryLoadFailures[
              result.status
            ],
        });
        return;
      }

      setTenants((current) => {
        const existingIds = new Set(
          current.map(
            (tenant) => tenant.tenantId,
          ),
        );

        return [
          ...current,
          ...result.directory.tenants.filter(
            (tenant) =>
              !existingIds.has(
                tenant.tenantId,
              ),
          ),
        ];
      });
      setNextCursor(
        result.directory.nextCursor,
      );
    });
  }

  function requestFilteredDirectory(
    filters:
      SystemAdminTenantDirectoryFilters,
  ) {
    const normalizedFilters = {
      ...filters,
      search: filters.search.trim(),
    };

    setFeedback(null);

    startTransition(async () => {
      const result =
        await loadSystemAdminTenantDirectoryAction(
          {
            afterTenantId: null,
            ...normalizedFilters,
          },
        );

      if (result.status !== "loaded") {
        setFeedback({
          tone: "danger",
          message:
            messages.directoryLoadFailures[
              result.status
            ],
        });
        return;
      }

      setTenants([
        ...result.directory.tenants,
      ]);
      setNextCursor(
        result.directory.nextCursor,
      );
      setAppliedFilters(normalizedFilters);
      setQuery(normalizedFilters.search);
      setTenantStatusFilter(
        normalizedFilters.tenantStatus,
      );
      setSubscriptionFilter(
        normalizedFilters.subscription,
      );
    });
  }

  function applyDirectoryFilters(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    requestFilteredDirectory(
      draftFilters,
    );
  }

  function clearDirectoryFilters() {
    requestFilteredDirectory(
      DEFAULT_SYSTEM_ADMIN_TENANT_DIRECTORY_FILTERS,
    );
  }

  return (
    <main
      className="admin-shell"
      dir={direction}
      lang={language}
    >
      <header className="admin-header">
        <Link
          href={adminHomePath(language)}
          className="admin-brand"
          aria-label={messages.homeAriaLabel}
        >
          <span aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div>
            <strong>Connect</strong>
            <small>System Admin</small>
          </div>
        </Link>
        <div className="admin-header-actions">
          <AdminLanguageSelector
            language={language}
            pathname="/admin"
          />
          <span className="admin-security-badge">
            {messages.serverPermission}
          </span>
          <Link
            href={adminPath(
              "/admin/decisions",
              language,
            )}
            className="secondary-button"
          >
            {messages.decisionsLink}
          </Link>
          <Link
            href={workspaceSectionPath(
              "dashboard",
              language,
            )}
            className="secondary-button"
          >
            {messages.workspaceLink}
          </Link>
        </div>
      </header>

      <div className="admin-content">
        <section className="admin-hero">
          <div>
            <span>{messages.eyebrow}</span>
            <h1>{messages.title}</h1>
            <p>{messages.description}</p>
          </div>
          <div className="admin-stat-grid">
            <article>
              <small>{messages.loadedTenants}</small>
              <strong>{tenants.length}</strong>
            </article>
            <article>
              <small>{messages.withSubscription}</small>
              <strong>
                {subscriptionCount}
              </strong>
            </article>
            <article>
              <small>{messages.activeSubscriptions}</small>
              <strong>{activeCount}</strong>
            </article>
          </div>
        </section>

        <form
          className="admin-directory-toolbar"
          onSubmit={applyDirectoryFilters}
          aria-controls="admin-tenant-results"
        >
          <div className="admin-directory-filters">
            <label className="admin-directory-search">
              <span>{messages.searchLabel}</span>
              <input
                type="search"
                value={query}
                maxLength={80}
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
                placeholder={messages.searchPlaceholder}
              />
            </label>
            <label>
              <span>{messages.tenantStatus}</span>
              <select
                value={tenantStatusFilter}
                onChange={(event) =>
                  setTenantStatusFilter(
                    event.target.value as SystemAdminTenantStatusFilter,
                  )
                }
              >
                <option value="all">
                  {messages.allStatuses}
                </option>
                {Object.entries(
                  messages.tenantStatuses,
                ).map(([value, label]) => (
                  <option
                    value={value}
                    key={value}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{messages.subscriptionRecord}</span>
              <select
                value={subscriptionFilter}
                onChange={(event) =>
                  setSubscriptionFilter(
                    event.target.value as SystemAdminSubscriptionFilter,
                  )
                }
              >
                <option value="all">
                  {messages.allSubscriptionRecords}
                </option>
                <option value="with-subscription">
                  {messages.withSubscriptionFilter}
                </option>
                <option value="without-subscription">
                  {messages.withoutSubscriptionFilter}
                </option>
              </select>
            </label>
          </div>
          <div className="admin-directory-actions">
            <span
              role="status"
              aria-live="polite"
            >
              {messages.loadedResults(
                tenants.length,
              )}
            </span>
            <button
              className="primary-button"
              disabled={isPending}
            >
              {isPending
                ? messages.loading
                : messages.searchAndFilter}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={
                isPending ||
                (!hasDirectoryFilters(
                  draftFilters,
                ) &&
                  !hasDirectoryFilters(
                    appliedFilters,
                  ))
              }
              onClick={clearDirectoryFilters}
            >
              {messages.clearFilters}
            </button>
          </div>
        </form>

        {feedback ? (
          <p
            className={`admin-feedback ${feedback.tone}`}
            role={
              feedback.tone === "danger"
                ? "alert"
                : "status"
            }
            aria-live="polite"
          >
            {feedback.message}
          </p>
        ) : null}

        <div id="admin-tenant-results">
          {tenants.length === 0 ? (
            <section
              className="admin-empty-state"
              role="status"
            >
              <h2>
                {hasDirectoryFilters(
                  appliedFilters,
                )
                  ? messages.noMatch
                  : messages.noTenants}
              </h2>
              <p>
                {hasDirectoryFilters(
                  appliedFilters,
                )
                  ? messages.filteredEmpty
                  : messages.unfilteredEmpty}
              </p>
            </section>
          ) : (
            <section className="admin-tenant-list">
              {tenants.map(
              (tenant) => (
                <article
                  className="admin-tenant-card"
                  key={tenant.tenantId}
                >
                  <div className="admin-tenant-heading">
                    <div>
                      <small>
                        {messages.tenantNumber(
                          tenant.tenantId,
                        )}
                      </small>
                      <h2>
                        {tenant.displayName}
                      </h2>
                    </div>
                    <div className="admin-tenant-heading-actions">
                      <Link
                        className="secondary-button"
                        href={adminPath(
                          `/admin/whatsapp-delivery-policy/${tenant.tenantId}`,
                          language,
                        )}
                      >
                        {messages.whatsappPolicy}
                      </Link>
                      <span
                        className={`admin-status ${tenant.tenantStatus}`}
                      >
                        {
                          messages.tenantStatuses[
                            tenant.tenantStatus
                          ]
                        }
                      </span>
                    </div>
                  </div>

                  <SystemAdminBusinessProfileForm
                    language={language}
                    tenantId={tenant.tenantId}
                    profile={
                      tenant.businessProfile
                    }
                    disabled={isPending}
                    onSave={(draft) =>
                      updateBusinessProfile(
                        tenant.tenantId,
                        draft,
                      )
                    }
                  />

                  {tenant.subscription ? (
                    <>
                      <SubscriptionSummary
                        language={language}
                        subscription={
                          tenant.subscription
                        }
                      />
                      <div className="admin-mutation-grid">
                        <form
                          onSubmit={(event) =>
                            extendSubscription(
                              tenant,
                              event,
                            )
                          }
                        >
                          <strong>
                            {messages.extendPeriod}
                          </strong>
                          <label>
                            <span>
                              {messages.newEndDate}
                            </span>
                            <input
                              name="newEndsAt"
                              type="date"
                              min={dateInputValue(
                                tenant
                                  .subscription
                                  .endsAt,
                              )}
                              defaultValue={dateInputValue(
                                tenant
                                  .subscription
                                  .endsAt,
                              )}
                              required
                            />
                          </label>
                          <button
                            className="secondary-button"
                            disabled={isPending}
                          >
                            {messages.extendSubscription}
                          </button>
                        </form>

                        <form
                          onSubmit={(event) =>
                            changeStatus(
                              tenant,
                              event,
                            )
                          }
                        >
                          <strong>
                            {messages.operationalStatus}
                          </strong>
                          <label>
                            <span>
                              {messages.targetStatus}
                            </span>
                            <select
                              name="status"
                              defaultValue={
                                tenant
                                  .subscription
                                  .status ===
                                  "active" ||
                                tenant
                                  .subscription
                                  .status ===
                                  "suspended" ||
                                tenant
                                  .subscription
                                  .status ===
                                  "blocked"
                                  ? tenant
                                      .subscription
                                      .status
                                  : "active"
                              }
                            >
                              <option value="active">
                                {messages.tenantStatuses.active}
                              </option>
                              <option value="suspended">
                                {messages.tenantStatuses.suspended}
                              </option>
                              <option value="blocked">
                                {messages.tenantStatuses.blocked}
                              </option>
                            </select>
                          </label>
                          <button
                            className="secondary-button"
                            disabled={isPending}
                          >
                            {messages.updateStatus}
                          </button>
                        </form>

                        <div className="admin-danger-zone">
                          <strong>
                            {messages.cancel}
                          </strong>
                          <p>
                            {messages.cancelDescription}
                          </p>
                          <button
                            type="button"
                            className="admin-danger-button"
                            disabled={
                              isPending ||
                              tenant
                                .subscription
                                .status ===
                                "cancelled"
                            }
                            onClick={() =>
                              cancelSubscription(
                                tenant,
                              )
                            }
                          >
                            {messages.cancelSubscription}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <form
                      className="admin-create-subscription"
                      onSubmit={(event) =>
                        createSubscription(
                          tenant.tenantId,
                          event,
                        )
                      }
                    >
                      <div>
                        <strong>
                          {messages.createManualSubscription}
                        </strong>
                        <p>
                          {messages.tenantHasNoSubscription}
                        </p>
                      </div>
                      <label>
                        <span>{messages.initialStatus}</span>
                        <select
                          name="status"
                          defaultValue="trial"
                        >
                          <option value="trial">
                            {messages.tenantStatuses.trial}
                          </option>
                          <option value="active">
                            {messages.tenantStatuses.active}
                          </option>
                        </select>
                      </label>
                      <label>
                        <span>
                          {messages.periodStartUtc}
                        </span>
                        <input
                          name="startsAt"
                          type="date"
                          required
                        />
                      </label>
                      <label>
                        <span>
                          {messages.periodEndUtc}
                        </span>
                        <input
                          name="endsAt"
                          type="date"
                          required
                        />
                      </label>
                      <button
                        className="primary-button"
                        disabled={isPending}
                      >
                        {messages.createSubscription}
                      </button>
                    </form>
                  )}
                </article>
              ),
              )}
            </section>
          )}
        </div>

        {nextCursor !== null ? (
          <button
            type="button"
            className="admin-load-more secondary-button"
            onClick={loadMore}
            disabled={isPending}
          >
            {isPending
              ? messages.loading
              : messages.loadMore}
          </button>
        ) : tenants.length > 0 ? (
          <p className="admin-list-end">
            {messages.allLoaded}
          </p>
        ) : null}
      </div>
    </main>
  );
}
