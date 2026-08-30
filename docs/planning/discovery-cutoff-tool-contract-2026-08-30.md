# 1. Connect — Discovery Cutoff tool contract

## 1.1 מעמד וגבול

1.1.1 `contractId=CONNECT-DISCOVERY-CUTOFF-TOOL-CONTRACT-V1-2026-08-30`.

1.1.2 הכלים הם Planning infrastructure בלבד. הם אינם Source Universe,
אינם Acceptance ואינם מסירים את Development freeze.

1.1.3 `Owner=Tal`; אין שימוש ב־Primary/Backup/RACI.

1.1.4 כל מזהה תוכן ו־Root נגזרים ב־SHA-256 מ־bytes קיימים. אין
`Math.random()`, אין `crypto.randomUUID()` ואין מקור אקראי אחר.

## 1.2 סדר הפעלה

1.2.1 מכניסים את Builder, ‏Verifier וחוזה נתיבי הפלט ל־commit נקי.

1.2.2 מאמתים שכל ארבעת נתיבי הפלט המוצהרים אינם קיימים באותו commit.

1.2.3 מפעילים את ה־Builder עם `--observed-at` מפורש ב־UTC.

1.2.4 ה־Builder מסרב לעבוד כאשר עץ המוצר אינו נקי, נתיב פלט קיים,
Remote readback נכשל או זמן התצפית אינו RFC3339 מדויק.

1.2.5 מפעילים את ה־Verifier עם `--verified-at` מפורש. ה־Verifier
בודק Schemas סגורים, Digests, Package root, נתיבים ו־Mutations.

1.2.6 רק ארבעת נתיבי הפלט המוצהרים רשאים להופיע אחרי ה־Cutoff.
שינוי אחר ב־worktree מבטל את ה־Candidate.

## 1.3 פלטים

1.3.1 `receipt.json` — זהות Git, local frontier, remote frontier,
זמן, מגבלות וחסמים.

1.3.2 `source-candidates.json` — משפחות המקור ומצב Custody/Admission.

1.3.3 `manifest.json` — Hash של שני החברים ו־Package content root;
ה־Manifest אינו חבר ב־root של עצמו.

1.3.4 `verification-report.json` — דוח מנותק; הוא אינו חבר ב־Package
root ואינו יכול לאשר את ה־Candidate.

## 1.4 כללי בטיחות

1.4.1 אין לכתוב נתיב Host מוחלט, `file:` URI, ‏Secret, ‏Token,
מידע לקוח או Source bytes פרטיים לפלט.

1.4.2 `UNKNOWN` ו־`PRIVATE-REQUIRED` נשארים חסומים מפרסום bytes.

1.4.3 Root תקין מוכיח שלמות bytes בלבד; הוא אינו מוכיח נכונות,
זכויות, חוקיות, Freshness או עצמאות ביקורת.

1.4.4 זמן Local נרשם `LOCAL-CLOCK-UNTRUSTED`; אין להפוך אותו ל־
trusted time באמצעות ניסוח.

1.4.5 תצפית `ls-remote` אינה כוללת GitHub Rulesets, Security settings,
Pull request pagination או Branch protection. חסרים אלה נשמרים כחסם.
