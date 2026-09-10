# PostgreSQL AI & Knowledge Runtime Data Migration Rehearsal

תאריך אימות: 2026-08-20

## 1. תוצאה

1.1 ‏Slice 8 עבר חזרה נקייה מול SQLite/D1 ומול PostgreSQL 16 אמיתי:

```text
PASS (36 D1 migrations, 24 PostgreSQL migrations, 9 tables, 9 rows,
replay rejected, tenant isolation verified, AI payload private,
9 parity scenarios)
```

1.2 תשע הטבלאות הן `ai_agents`, ‏`ai_agent_versions`,
`knowledge_sources`, ‏`knowledge_passages`, ‏`ai_agent_version_sources`,
`ai_runtime_cost_authorizations`, ‏`ai_runtime_usage`,
`ai_runtime_audit_events` ו־`ai_reply_outbox`. יחד עם שבעת ה־Slices
הקודמים הוכחו כעת 38 מתוך 51 טבלאות.

## 2. מה החוזה מגן עליו

2.1 מפתחות Agent, ‏Version, ‏Source, ‏Passage, ‏Request, ‏Audit ו־Outbox
נגזרים באופן דטרמיניסטי מהזהות העסקית ונבדקים מחדש לפני הטעינה.

2.2 הגדרת Agent עוברת את אותו Validator עסקי של ה־Runtime. ‏Lifecycle של
Agent, ‏Version, ‏Knowledge source ו־Outbox חייב להתאים לכל הזמנים, הסיבות
והקרנות של גרסה אחרונה ופעילה.

2.3 ‏Knowledge passage חייב להתאים ל־SHA-256 של התוכן, ל־Source הנכון
ולמספר סידורי רציף. Source שאינו במצב מוכן או ארכוב־מוכן אינו רשאי להחזיק
Passages.

2.4 הרשאת עלות ו־Usage חייבות להתאים ב־Tenant, ‏Agent, תקופת חיוב ומטבע.
עמודת `period_start` נקראת חזרה מ־PostgreSQL כטקסט קלנדרי כדי למנוע שינוי
תאריך שנובע מאזור זמן.

2.5 לפני Commit נבדקים גם:

1. Projection של גרסת Agent אחרונה ופעילה.
2. התאמה מדויקת בין רשימת המקורות ב־Definition לקישורי Version/Source.
3. רציפות Passage ordinals ומצב העיבוד של Source.
4. קישור Audit להודעת Inbound, לגרסת Agent ול־Usage המתאים.
5. קישור Reply outbox ל־Audit, ל־Contact ולמקורות שעליהם התשובה נשענה.

## 3. פרטיות וראיות

3.1 ה־Plan payload הוא Artifact רגיש ואסור לשמור אותו ב־Git, ב־Logs או
במערכת Tickets.

3.2 ‏Manifest ו־Evidence ציבוריים מכילים רק Table name, ‏Count ו־HMAC
digests. הם אינם מכילים:

1. System prompt או הגדרת Agent.
2. שם קובץ, Object-storage key או תוכן Knowledge passage.
3. תשובת AI, סיבת Handoff או נתוני Usage מפורטים.
4. מספר טלפון או Provider message ID.
5. מפתחות Tenant, ‏Conversation, ‏Message, ‏Agent, ‏Source או Request.

## 4. Semantic parity שנבדק

4.1 תשעת התרחישים הורצו בשני המנועים והשוו Accepted/Rejected ומצב סופי:

1. אישור תשובת AI ממתינה.
2. ארכוב Knowledge source מוכן.
3. כיבוי Agent פעיל.
4. הפעלה מחדש של Agent.
5. חסימת Source נוסף עם אותו Content digest.
6. חסימת Passage נוסף עם אותו Ordinal.
7. חסימת Version ששייך ל־Tenant אחר.
8. יצירת הרשאת עלות נוספת באותה תקופה.
9. חסימת Usage ללא הרשאת עלות.

4.2 לאחר התרחישים נקראו תשע הטבלאות מחדש בשני המנועים והושוו Row-for-row
באמצעות Snapshot קנוני ודטרמיניסטי.

## 5. הפעלה מקומית בטוחה

5.1 יש ליצור PostgreSQL מקומי, ריק וללא Password בשם:

```text
connect_ai_knowledge_runtime_data_migration_rehearsal
```

5.2 הפקודה מקבלת רק Host מסוג loopback, ‏Port מפורש, שם המסד הקבוע וללא
Query string:

```bash
CONNECT_POSTGRES_AI_KNOWLEDGE_RUNTIME_DATA_MIGRATION_REHEARSAL_URL="postgresql://<local-user>@127.0.0.1:<local-port>/connect_ai_knowledge_runtime_data_migration_rehearsal" \
  npm run verify:postgres-ai-knowledge-runtime-data-migration
```

5.3 הסקריפט מסרב למסד יעד שאינו ריק. בסיום החזרה יש לעצור את השרת הזמני
ולמחוק את תיקייתו.

## 6. מה עדיין חסר

6.1 ‏Rehearsal מקומי אינו Cutover. לפני Production עדיין נדרשים Export חי
עקבי, ‏Staging, ‏Load/Recovery rehearsal, ערכי Railway חיים וחלון Cutover
מאושר.

6.2 ה־Slice הבא הוא `governance-billing`, ובו חמש טבלאות. אסור לסמן אותו
`rehearsed` לפני חזרה אמיתית ו־Semantic parity משלו.
