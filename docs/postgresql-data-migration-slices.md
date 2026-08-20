# PostgreSQL Data Migration Slices

תאריך מיפוי: 2026-08-20

## 1. מטרה

1.1 ה־Schema parity מוכיח שקיימות 51 טבלאות מקבילות, אך אינו אומר באיזה
סדר בטוח להעביר את הנתונים.

1.2 Registry דטרמיניסטי ב־
`postgres/postgresDataMigrationSliceRegistry.mjs` מחלק כל טבלה בדיוק פעם
אחת ל־Slice עסקי, ומקודד את התלויות בין ה־Slices.

1.3 Slice הוא קבוצת טבלאות שניתן לייצא, לטעון, לאמת ולתרגל יחד. החלוקה
מונעת טעינת Child לפני Parent ומאפשרת לעצור ולחקור פער בלי לסכן את כל
ההגירה.

## 2. מפת ה־Slices

| סדר | Slice | טבלאות | תלות | מצב | אומדן נטו |
| --- | --- | ---: | --- | --- | ---: |
| 1 | `core` | 7 | אין | Rehearsal + Semantic parity הושלמו | הושלם |
| 2 | `tenant-access` | 5 | `core` | Rehearsal + Semantic parity הושלמו | הושלם |
| 3 | `contact-organization-import` | 6 | `core` | Rehearsal + Semantic parity הושלמו | הושלם |
| 4 | `meta-connection` | 3 | `core` | Rehearsal + Semantic parity הושלמו | הושלם |
| 5 | `templates-campaigns` | 3 | Core, Contacts, Meta | Rehearsal + Semantic parity הושלמו | הושלם |
| 6 | `conversations-messages` | 2 | Core, Meta | Rehearsal + Semantic parity הושלמו | הושלם |
| 7 | `bot-runtime` | 3 | Core, Conversations | Rehearsal + Semantic parity הושלמו | הושלם |
| 8 | `ai-knowledge-runtime` | 9 | Core, Conversations | Rehearsal + Semantic parity הושלמו | הושלם |
| 9 | `governance-billing` | 5 | `core` | Rehearsal + Semantic parity הושלמו | הושלם |
| 10 | `whatsapp-delivery-policy` | 8 | Core, Meta, Campaigns | Rehearsal + Semantic parity הושלמו | הושלם |

2.1 כל 10 ה־Slices וכל 51 הטבלאות עברו Data migration ו־Semantic parity
מקומיים. עדיין חסרים Export חי, ‏Accounts, המתנה לספקים, ‏Staging,
‏Load/Recovery ו־Cutover מבוקר.

2.2 ‏`read-d1-full-data-migration-snapshot.mjs` קורא כעת את כל עשרת
ה־Slices תחת Transaction מקור יחיד ומוכיח Schema, ‏Integrity ו־Foreign keys
לכל 51 הטבלאות. החוזה והפקודה ל־Export מורשה מתועדים ב־
`docs/postgresql-full-source-snapshot-contract.md`.

## 3. Slice שהושלם — Tenant Access

3.1 הטבלאות:

1. `tenant_membership_events`.
2. `team_invitations`.
3. `team_invitation_events`.
4. `team_invitation_deliveries`.
5. `team_invitation_acceptances`.

3.2 למה הוא הבא: כל ה־Foreign keys שלו נסגרים מול `tenants` ו־
`tenant_memberships` שכבר עברו ב־Core, והוא אינו תלוי בספק Meta, Queue,
Storage או AI.

3.3 כל תתי־השלבים הבאים הושלמו:

1. להגדיר Column contracts מדויקים מול ה־Schema הסופי של D1 ו־PostgreSQL.
2. לחסום Legacy rows שלא יכולים לעמוד ב־Actor kind, Key או Timestamp
   constraints של PostgreSQL.
3. ליצור Snapshot עקבי בתוך D1 transaction עם Integrity ו־Foreign-key
   checks.
4. ליצור Plan קצר־תוקף עם HMAC manifest לכל טבלה.
5. לנעול את חמש טבלאות היעד, לדרוש שהן ריקות ולטעון לפי סדר Parent-first.
6. לקרוא בחזרה Counts ו־Digests לפני Commit.
7. להריץ Membership mutation, Invitation request/revoke/expire,
   Delivery reconciliation ו־Acceptance parity בשני המנועים.
8. להוכיח Replay, Conflict, Rollback ושחזור Triggers מול PostgreSQL 16
   אמיתי.

3.4 ההרצה הנקייה עברה עם 36 מיגרציות D1, ‏24 מיגרציות PostgreSQL,
חמש טבלאות, 11 רשומות ושבעה תרחישי Semantic parity. מצב היעד הושווה
ל־D1 לאחר המעברים. פרטי הראיה נמצאים ב־
`docs/postgresql-tenant-access-data-migration-rehearsal.md`.

## 4. Slice שהושלם — Contact Organization & Import

4.1 שש הטבלאות הבאות הן `contact_tags`, ‏`contact_lists`,
`contact_tag_assignments`, ‏`contact_list_memberships`,
`contact_import_jobs` ו־`contact_import_rows`.

4.2 ה־Slice תלוי רק ב־Core שכבר עבר, וקיבל אימות פרטיות נפרד משום
ששורות Import שומרות Fingerprints, שגיאות ותוצאות עיבוד בעלות מחזור חיים
שונה מ־Contact רגיל.

4.3 ה־Rehearsal האמיתי העביר 10 רשומות, אימת Digest לכל טבלה, חסם Replay,
הוכיח בידוד Tenant בשני קשרים מורכבים והריץ שבעה תרחישי Semantic parity.
מוני כל Import job הושוו לשורות בפועל לפני Commit, ו־Manifest/Evidence לא
חשפו שמות קבצים, Actors, שמות קבוצות או Fingerprints. פרטי הראיה נמצאים ב־
`docs/postgresql-contact-organization-import-data-migration-rehearsal.md`.

## 5. Slice שהושלם — Meta Connection

5.1 שלוש הטבלאות הבאות הן `meta_connections`,
`meta_webhook_receipts` ו־`meta_credential_envelopes`.

5.2 ה־Slice תלוי רק ב־Core, וקיבל בדיקה נפרדת שאין פענוח, הדפסה או
העתקה של Credentials גולמיים: רק Envelopes מוצפנים ורפרנסים מותרים.

5.3 ה־Rehearsal העביר שש רשומות, חסם Replay וקישור Receipt ל־WABA של
Tenant אחר, ואימת שאין עמודת Plaintext או Access token. שמונה תרחישי
Semantic parity עברו והמצב הסופי הושווה. פרטי הראיה נמצאים ב־
`docs/postgresql-meta-connection-data-migration-rehearsal.md`.

## 6. Slice שהושלם — Templates & Campaigns

6.1 שלוש הטבלאות הן `message_templates`, ‏`campaigns` ו־
`campaign_recipients`.

6.2 ה־Rehearsal העביר שמונה רשומות, חסם Replay, אימת Count של נמענים
לכל Campaign והוכיח בידוד Tenant. שמונה תרחישי Semantic parity בדקו את
מחזור חיי ה־Template, הפעלת Campaign, תזמון ו־Queue state. פרטי הראיה
נמצאים ב־`docs/postgresql-templates-campaigns-data-migration-rehearsal.md`.

6.3 במהלך ניתוח התלויות `campaign_delivery_provider_links` הועברה מ־Slice
זה ל־`whatsapp-delivery-policy`: כל Link מחזיק Foreign key אל
`whatsapp_rate_limit_reservations`, ולכן אסור להעביר אותו לפני ה־Reservation
וה־Settlement evidence. ה־Slice האחרון מכיל כעת שמונה טבלאות ותלוי גם ב־
`templates-campaigns`.

## 7. Slice שהושלם — Conversations & Messages

7.1 שתי הטבלאות הבאות הן `conversations` ו־`messages`. הן תלויות ב־Core
וב־Meta, שכבר עברו Rehearsal.

7.2 ה־Rehearsal העביר חמש רשומות, חסם Replay, הוכיח בידוד Tenant ואימת
שכל `last_message_key` מצביע ל־Message באותה שיחה ובאותו זמן. תשעה תרחישי
Semantic parity כיסו Delivery status, ‏Read state, שיוך Agent, הודעה ללא
Text וכפילויות Provider. פרטי הראיה נמצאים ב־
`docs/postgresql-conversations-messages-data-migration-rehearsal.md`.

## 8. Slice שהושלם — Bot Runtime

8.1 שלוש הטבלאות הבאות הן `bot_flows`, ‏`bot_flow_versions` ו־
`bot_reply_deliveries`. הן תלויות ב־Core וב־Conversations, שכבר עברו
Rehearsal.

8.2 ה־Rehearsal העביר שש רשומות, חסם Replay, הוכיח בידוד Tenant ואימת
שכל Projection של גרסה אחרונה/פעילה מצביע לגרסה של אותו Flow. כל Delivery
נבדק מול הודעת Inbound באותה Conversation ומול צמד Flow/Version מלא — קשר
ש־D1 הישן אינו אוכף במלואו.

8.3 תשעה תרחישי Semantic parity כיסו יצירת Draft נוסף, Projection של
הגרסה האחרונה, Claim ו־Acceptance של Delivery, כפילויות ו־Cross-tenant.
Definition, ‏Reply, טלפון, ‏Provider ID ו־Error code אינם מופיעים ב־Manifest
או ב־Evidence. פרטי הראיה נמצאים ב־
`docs/postgresql-bot-runtime-data-migration-rehearsal.md`.

8.4 נמצא פער Hardening: ‏D1 ו־PostgreSQL מאפשרים Name עם רווחים חיצוניים,
אך חוזה ה־Runtime דורש ערך חתוך. ה־Snapshot חוסם Legacy row כזה לפני טעינה;
הפער אינו הותר כ־Semantic parity.

## 9. Slice שהושלם — AI & Knowledge Runtime

9.1 תשע הטבלאות כוללות Agent וגרסאותיו, Knowledge sources/passages,
קישורי Version/Source, הרשאות עלות, Usage, ‏Audit ו־Reply outbox. ה־Slice
תלוי ב־Core וב־Conversations שכבר עברו Rehearsal.

9.2 ה־Rehearsal העביר תשע רשומות, חסם Replay, הוכיח בידוד Tenant והשווה
Counts ו־HMAC digests לכל טבלה. לפני Commit נבדקו Projection של Agent,
מיפוי Version/Source, רציפות Passages, התאמת Usage להרשאת עלות וקישור מלא
של Audit ו־Reply outbox להודעת Inbound ולמקורות ה־Knowledge.

9.3 תשעה תרחישי Semantic parity כיסו אישור תשובת AI, ארכוב Source, כיבוי
והפעלה של Agent, כפילויות Source/Passage, Cross-tenant והרשאות עלות. ‏Prompt,
תוכן Passage, תשובת AI, טלפון, Provider ID ומפתחות עסקיים אינם מופיעים ב־
Manifest או ב־Evidence. פרטי הראיה נמצאים ב־
`docs/postgresql-ai-knowledge-runtime-data-migration-rehearsal.md`.

## 10. Slice שהושלם — Governance & Billing

10.1 חמש הטבלאות הן Subscription והיסטוריית האירועים שלו, Production
decision records/events ו־Business profile admin events. ה־Slice תלוי רק
ב־Core שכבר עבר Rehearsal.

10.2 ה־Rehearsal העביר שבע רשומות, חסם Replay והשווה Counts ו־HMAC digests.
לפני Commit נבדקו Projection ורצף גרסאות של Subscription, התאמת ההחלטה
לאירוע האחרון, Registry של Check IDs וקישור אירועי Subscription/Admin אל
ה־Audit המקורי שכבר הועבר ב־Core.

10.3 תשעה תרחישי Semantic parity כיסו הארכת מנוי, השעיה, שינוי החלטת
Production, עדכון Profile בידי Admin, כפילויות, Version gaps ו־constraints
בלתי־משתנים. פרטי הראיה והפערים הקיימים ב־D1 מתועדים ב־
`docs/postgresql-governance-billing-data-migration-rehearsal.md`.

## 11. Slice שהושלם — WhatsApp Delivery Policy

11.1 שמונה הטבלאות כוללות Provider links, ‏Delivery-policy evidence,
Reservations, ‏Pair/Portfolio state, ‏Settlements ו־Provider cooldowns.
ה־Slice תלוי ב־Core, ‏Meta וב־Templates/Campaigns שכבר עברו Rehearsal.

11.2 ה־Rehearsal העביר 12 רשומות, חסם Replay והוכיח תשעה תרחישי
Semantic parity. לפני Cutover כל Reservation חייב להיות Settled, וכל
Policy, ‏Pair/Portfolio projection, ‏Cooldown ו־Provider link נבדקים מול
הראיה שממנה נגזרו.

11.3 ‏D1 לא שמר `template_category` היסטורית. לכן PostgreSQL שומר ברשומה
מיובאת `NULL` מפורש, חוסם Replay עמום, אך מאפשר Settlement. כל Reservation
חדש עדיין חייב `MARKETING` או `UTILITY`. פרטי הראיה נמצאים ב־
`docs/postgresql-whatsapp-delivery-policy-data-migration-rehearsal.md`.

## 12. תנאי בטיחות

12.1 ה־Registry אינו מעביר נתונים בעצמו. סטטוס `rehearsed` ניתן רק לאחר
הרצת PostgreSQL אמיתית ו־Semantic parity מתועד.

12.2 אין להרחיב את ה־Core plan בשקט. לכל Slice יהיו Version, Plan ID,
Manifest ו־Evidence משלו, כדי ש־Replay או החלפת Payload ייכשלו סגור.

12.3 אין לטעון Secrets גולמיים. ב־Meta slice יועברו רק Envelopes מוצפנים
שכבר עומדים בחוזה היעד.

12.4 אין להריץ את המנגנון על מסד יעד שאינו ריק ואין לבצע Merge אוטומטי.
