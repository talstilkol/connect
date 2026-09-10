# 1. Connect — D05/D14-A5 הכרעת הצפנת S3 ו־GuardDuty

## 1.1 זהות ומעמד

1.1.1 `decisionIds={D05-A5,D14-A5}`.

1.1.2 `artifactId=CONNECT-D05-D14-A5-SSE-KMS-ENCRYPTION-RECONCILIATION-2026-08-30`.

1.1.3 status=`SELECTED-FOR-PLANNING;NOT-ACCOUNT-VERIFIED;NOT-IMPLEMENTED;UPLOADS-OFF`.

1.1.4 predecessor=`docs/planning/d05-d14-a4-object-storage-and-malware-scanning-reconciliation-2026-08-29.md`.

1.1.5 תיקון זה מחליף את סעיף ההצפנה של A4 בלבד; בחירת S3 private versioned Buckets ו־GuardDuty Malware Protection for S3 נשמרת.

1.1.6 ההכרעה מיישבת את הסתירה בין `SSE-S3 default unless required` ב־A4 לבין דרישת Customer-managed KMS שנרשמה קודם ב־Master draft.

1.1.7 לא בוצעו AWS signup, Region opt-in, KMS/S3/IAM/GuardDuty mutation, Credential use, purchase, Product change, Build, Git/GitHub mutation או Deployment.

1.1.8 repository=`PUBLIC`; operational identifiers, key ARNs, account IDs, Bucket names ו־Secrets נשארים מחוץ למסמך.

# 2. עובדות רשמיות עדכניות

## 2.1 תאימות GuardDuty

2.1.1 [AWS GuardDuty supportability](https://docs.aws.amazon.com/guardduty/latest/ug/supported-s3-features-malware-protection-s3.html) מציין תמיכה ב־SSE-S3,‏ SSE-KMS,‏ DSSE-KMS וב־Customer-managed KMS keys.

2.1.2 אותו מקור מציין תמיכה ב־S3 Versioning,‏ Object Lock,‏ Legal Hold,‏ Lifecycle ו־tag-based access control.

2.1.3 SSE-C ו־client-side encryption אינם נתמכים למסלול סריקה שבו GuardDuty צריך לקרוא את התוכן.

2.1.4 [GuardDuty IAM prerequisites](https://docs.aws.amazon.com/guardduty/latest/ug/malware-protection-s3-iam-policy-prerequisite.html) דורש הרשאות KMS מתאימות כאשר Bucket משתמש ב־SSE-KMS/DSSE-KMS.

2.1.5 התמיכה המתועדת אינה מוכיחה שה־Role, key policy, Region או Plan של חשבון Connect תקינים.

## 2.2 Bucket Keys ועלות

2.2.1 [S3 Bucket Keys](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html) מפחיתים AWS KMS request traffic ועלויות פוטנציאליות עבור SSE-KMS.

2.2.2 AWS מציינת הפחתה אפשרית של עד `99%`; זהו Provider claim תלוי workload ולא אומדן עלות של Connect.

2.2.3 Bucket Key חל על Objects חדשים; Objects קיימים אינם מקבלים אותו אוטומטית.

2.2.4 לאחר שימוש ב־Bucket Key, לא כל גישה עוקבת יוצרת KMS API request או policy revalidation.

2.2.5 לכן KMS disable/key-policy change אינו Kill switch יחיד; נדרשים גם Bucket policy, IAM deny, role revocation ו־application kill switch.

## 2.3 אכיפת Key נכון

2.3.1 [S3 SSE-KMS guidance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html) מאפשר Bucket policy הדוחה upload ללא SSE-KMS או ללא Key ID הנדרש.

2.3.2 אם Request מבקש `aws:kms` בלי Customer key ID, S3 עשוי להשתמש ב־AWS managed key; לכן בדיקת algorithm בלבד אינה מספיקה.

2.3.3 [AWS KMS least privilege guidance](https://docs.aws.amazon.com/kms/latest/developerguide/least-privilege.html) תומך בהגבלות כגון `kms:ViaService`,‏ caller account ו־service-supported encryption context.

2.3.4 Encryption context אינו Secret ומופיע ב־CloudTrail; אסור להכניס בו PII או מידע רגיש.

## 2.4 Objects קיימים

2.4.1 שינוי Bucket default encryption אינו משנה הצפנה של Objects שכבר קיימים.

2.4.2 [S3 UpdateObjectEncryption guidance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/update-sse-encryption.html) מתאר עדכון object-level מ־SSE-S3 ל־SSE-KMS עבור General Purpose Buckets.

2.4.3 Copy/Re-encryption או API ייעודי הם mutation נפרד עם version, checksum, retention, hold ו־rollback implications.

2.4.4 אין migration כזה מאושר במסגרת ההכרעה.

# 3. ההחלטה

## 3.1 Encryption profile

3.1.1 selected profile=`SSE-KMS with customer-managed symmetric keys + S3 Bucket Keys`.

3.1.2 profile חל על `KnowledgeQuarantine`,‏ `KnowledgeReleased`,‏ `BackupRecovery` ו־`OperationalEvidence` בכל סביבת Staging ו־Production.

3.1.3 לכל Environment ולכל אחת מארבע קבוצות ה־Data תהיה Key authority נפרדת; אין reuse בין Staging ל־Production.

3.1.4 Legal Hold נשאר מצב של exact object version ואינו מצדיק Key משותף או ביטול Key.

3.1.5 SSE-S3 נשאר Provider fallback טכני בלבד ואינו Accepted profile ל־authoritative Objects אלה.

3.1.6 DSSE-KMS אינו Pilot default; הוא דורש Legal/Security need, cost/latency/quota evidence וחוזה נפרד.

3.1.7 SSE-C ו־client-side encrypted opaque uploads אסורים במסלול GuardDuty.

## 3.2 הפרדת Roles

3.2.1 Key administrators אינם application data users.

3.2.2 Upload signer רשאי לכתוב רק ל־Quarantine עם exact Key ו־prefix.

3.2.3 GuardDuty role רשאי לקרוא/לתייג רק את Quarantine scope ולהשתמש רק ב־Quarantine Key לפי הרשאות השירות הנדרשות.

3.2.4 Release worker קורא exact clean Quarantine version וכותב exact Released identity עם Released Key.

3.2.5 Knowledge parser/retriever אינו מקבל decrypt על Quarantine, Backup או OperationalEvidence.

3.2.6 Backup writer אינו מקבל decrypt/read של Backup אלא אם operation דורש אותו במפורש; Restore role נפרד ו־short-lived.

3.2.7 Evidence writer אינו application runtime reader.

3.2.8 Break-glass דורש שני מאשרים, expiry קצר, reason, ticket/evidence root, alert ו־post-use review.

## 3.3 Key policy ו־Bucket policy

3.3.1 Bucket policy דוחה transport שאינו TLS.

3.3.2 Bucket policy דוחה write ללא `aws:kms` וללא logical approved key binding.

3.3.3 Key policy מגבילה principals, operations, account, Region, service path ו־resource context לפי מה ש־S3/GuardDuty תומכים בפועל.

3.3.4 Public artifact שומר logical key IDs ו־digests בלבד; ARN/account/bucket details נשמרים ב־private configuration/evidence.

3.3.5 S3 Block Public Access, ACLs disabled/Bucket-owner-enforced ו־anonymous access deny נשארים חובה.

3.3.6 Key deletion schedule, DisableKey, PutKeyPolicy ו־CreateGrant אינם Permissions של application roles.

3.3.7 destructive key lifecycle act דורש typed Permit, impact set, backup/recovery proof, trusted time, two-person approval ו־readback.

## 3.4 Rotation ושחזור

3.4.1 automatic key rotation מופעל כאשר סוג ה־Key והמדיניות החיים תומכים בכך.

3.4.2 Rotation אינה הוכחה ש־Objects ישנים הוצפנו מחדש; metadata שומר את Key revision observation של כל Version.

3.4.3 Restore exercise חייב להוכיח שגם Key, policy, grants/roles ו־encrypted object versions ניתנים לשימוש בסביבה המבודדת.

3.4.4 Backup בלי recovery של Key authority אינו Backup usable.

3.4.5 Key unavailable, disabled, pending deletion, wrong Region, wrong policy או conflicting readback חוסם Upload/Release/Restore בהתאם ל־Data class.

# 4. Upload ו־Scan identity

## 4.1 Upload Intent

4.1.1 Intent קושר Tenant, purpose, deterministic object key, maximum bytes, checksum, MIME policy, Quarantine Key profile, expiry ו־one-use capability.

4.1.2 presigned request מחייב exact encryption headers שה־Bucket policy דורש.

4.1.3 Browser אינו מקבל Key management permission או raw operational Key identifier מעבר לנדרש בפרוטוקול החתום.

4.1.4 upload readback מאמת Bucket, key, versionId, checksum, bytes, encryption algorithm ו־exact Key binding.

4.1.5 mismatch אחד משאיר את ה־Object quarantined ובלי scan/release credit.

## 4.2 GuardDuty

4.2.1 Malware Protection plan קושר exact Bucket/prefix, Region, account, role ו־Key policy roots.

4.2.2 Plan test object ו־live readback נדרשים לפני פתיחת upload capability.

4.2.3 access denied, KMS denied, Plan warning/error, unsupported, failed, stale או conflicting result נשאר blocked.

4.2.4 clean scan event לבדו אינו Release Permit; exact object version/checksum/encryption/Intent/Plan readbacks נדרשים.

# 5. בדיקות קבלה עתידיות

## 5.1 חיוביות

5.1.1 exact approved upload נשמר עם Customer-managed Key ו־Bucket Key.

5.1.2 GuardDuty role קורא את ה־Version המדויק ומחזיר result קשור.

5.1.3 release copy כותב עם Released Key ומוכיח checksum/version parity.

5.1.4 Backup ו־Restore משתמשים ב־BackupRecovery Key בלבד.

## 5.2 שליליות

5.2.1 reject SSE-S3, AWS-managed KMS Key, wrong Customer key, missing encryption headers ו־wrong Environment key.

5.2.2 reject cross-DataClass decrypt, cross-Environment decrypt ו־cross-account use.

5.2.3 reject GuardDuty role access ל־Released/Backup/Evidence.

5.2.4 reject parser access ל־Quarantine.

5.2.5 reject Key policy without exact least-privilege constraints supported by the service.

5.2.6 reject encryption context containing PII.

5.2.7 reject Key disable/deletion/grant actions from application identities.

## 5.3 כשל, Concurrency ושחזור

5.3.1 revoke Role בזמן scan חייב להיכשל סגור ולא לשחרר Object.

5.3.2 rotate/change Key head בין Intent ל־upload חייב לפסול את ה־Intent או לקשור successor generation מפורש.

5.3.3 response loss לאחר copy חייב להתיישב דרך version/checksum/encryption readback בלי duplicate release.

5.3.4 Bucket Key cache behavior נבדק כך ש־KMS policy change לבדו אינו מוצג כ־immediate access revocation.

5.3.5 isolated Restore מוכיח ciphertext, Key authority, role, checksum, retention ו־resurrection suppression.

# 6. Cost ו־Operations

## 6.1 Cost controls

6.1.1 exact KMS key monthly price, request price, free tier, S3 request price ו־GuardDuty price=`unknown/unavailable until current Region/account quote`.

6.1.2 Budget cap ו־alerts נפרדים ל־KMS, S3 ו־GuardDuty.

6.1.3 S3 Bucket Keys מופעלים להפחתת request traffic, אך savings אינם מובטחים במספר מסוים.

6.1.4 Cost spike אינו מצדיק fallback שקט ל־SSE-S3; הוא מפעיל Upload kill switch ו־review.

## 6.2 Ownership

6.2.1 required owners=`AWS account,Security,KMS,Storage,Backup/Restore,Knowledge,Operations,Finance,Privacy/Legal`.

6.2.2 named Primary/Backup לכל תפקיד=`unknown/unavailable`.

6.2.3 בלי Owners, runbook, alarm routing ו־break-glass rehearsal ה־profile אינו Ready.

# 7. Acceptance ומצב נוכחי

7.1 exact account, Region opt-in, Bucket names, Key aliases/ARNs, roles, policies, Plan ID, quotas, cost caps ו־owners=`unknown/unavailable`.

7.2 A5 Decision materialized=`1/1`;independently reviewed=`0/1`;accepted=`0/1`.

7.3 live KMS/S3/GuardDuty configuration=`NOT-CONFIGURED/NOT-PROVED`.

7.4 Knowledge uploads, parsing, Backup readiness ו־Restore readiness=`OFF/NOT-READY`.

7.5 Gate18.2/Gate23/Gate24/Gate29/Gate30=`BLOCKED`.

7.6 development freeze=`ACTIVE`;repository=`PUBLIC`.

7.7 ההחלטה מעניקה כיוון תכנוני בלבד ואינה מעניקה Implementation, Provider או Production credit.
