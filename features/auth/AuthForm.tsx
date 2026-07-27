import { SignIn, SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { inspectClerkConfiguration } from "../../server/auth/clerkConfiguration";

type AuthMode = "login" | "register";

function ConfigurationNotice({
  status,
}: {
  status: "disabled" | "incomplete";
}) {
  return (
    <div className="auth-configuration-notice" role="status">
      <span aria-hidden="true">i</span>
      <div>
        <strong>
          {status === "disabled"
            ? "Clerk מוכן לחיבור אך טרם הופעל"
            : "הגדרת Clerk אינה מלאה"}
        </strong>
        <p>
          {status === "disabled"
            ? "יש להגדיר Publishable Key ו־Secret Key בסביבת ההרצה. לא נוצר משתמש חלופי ולא בוצעה כניסה מדומה."
            : "הוגדר רק חלק מחוזה ההתחברות. מטעמי אבטחה הטופס נשאר חסום עד השלמת שני המפתחות."}
        </p>
      </div>
    </div>
  );
}

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const isRegister = mode === "register";
  const configuration = inspectClerkConfiguration();

  return (
    <main className="auth-shell" dir="rtl">
      <section className="auth-brand-panel">
        <Link href="/" className="public-brand auth-brand">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Connect</strong>
            <small>WhatsApp Business Platform</small>
          </span>
        </Link>
        <div className="auth-panel-copy">
          <span className="hero-badge">
            <i />
            React SaaS
          </span>
          <h1>
            סביבת עבודה אחת.
            <br />
            כל התקשורת העסקית.
          </h1>
          <p>
            כל משתמש מזוהה על ידי Clerk, ולאחר מכן Membership בצד השרת
            קובע לאיזה Tenant ולאילו הרשאות הוא שייך.
          </p>
        </div>
        <div className="auth-security-note">
          <span>✓</span>
          <div>
            <strong>הסיסמה אינה נשמרת ב־Connect</strong>
            <small>אימות, Verification ואיפוס סיסמה מנוהלים דרך Clerk.</small>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <span>{isRegister ? "הצטרפות מאובטחת" : "כניסה מאובטחת"}</span>
            <h2>{isRegister ? "פתיחת חשבון" : "ברוכים השבים"}</h2>
            <p>
              {isRegister
                ? "לאחר אימות הזהות יתחיל תהליך יצירת סביבת העבודה."
                : "הגישה ל־Workspace דורשת Session מאומת ו-Membership פעיל."}
            </p>
          </div>

          <div className="auth-provider-slot">
            {configuration.status === "configured" ? (
              isRegister ? (
                <SignUp
                  routing="hash"
                  signInUrl="/login"
                  fallbackRedirectUrl="/workspace/onboarding"
                />
              ) : (
                <SignIn
                  routing="hash"
                  signUpUrl="/register"
                  fallbackRedirectUrl="/workspace"
                />
              )
            ) : (
              <ConfigurationNotice status={configuration.status} />
            )}
          </div>

          <p className="auth-switch">
            {isRegister ? "כבר יש לך חשבון?" : "עדיין אין לך חשבון?"}
            <Link href={isRegister ? "/login" : "/register"}>
              {isRegister ? "התחברות" : "פתיחת חשבון"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
