import Link from "next/link";

const capabilities = [
  {
    number: "01",
    title: "קמפיינים רשמיים",
    description: "תבניות מאושרות, קהל עם הסכמה, תזמון ומעקב אחר מסירה.",
  },
  {
    number: "02",
    title: "שירות במקום אחד",
    description: "תיבת שיחות מרכזית, הקצאה לנציג ומעבר בטוח מהבוט לאדם.",
  },
  {
    number: "03",
    title: "אוטומציה מבוקרת",
    description: "Flow Builder, מאגר ידע ו־AI עם גבולות עלות וביטחון.",
  },
];

const systemFlow = [
  "חיבור Meta",
  "אישור תבנית",
  "קהל עם הסכמה",
  "שליחה דרך Queue",
  "דוח מסירה",
];

export default function Home() {
  return (
    <main className="public-shell" dir="rtl">
      <a className="skip-link" href="#public-content">
        דילוג לתוכן הראשי
      </a>
      <header className="public-header">
        <Link href="/" className="public-brand" aria-label="Connect - עמוד הבית">
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
        <nav aria-label="ניווט ציבורי">
          <a href="#capabilities">יכולות</a>
          <a href="#architecture">איך זה עובד</a>
          <a href="#pricing">חבילות</a>
        </nav>
        <div className="public-header-actions">
          <Link href="/login" className="secondary-button">
            התחברות
          </Link>
          <Link href="/register" className="primary-button">
            פתיחת חשבון
          </Link>
        </div>
      </header>

      <section
        className="public-hero"
        id="public-content"
        tabIndex={-1}
      >
        <div className="hero-copy">
          <span className="hero-badge">
            <i />
            מבוסס Meta Cloud API הרשמי
          </span>
          <h1>
            מנהלים WhatsApp עסקי
            <br />
            <em>בצורה מסודרת.</em>
          </h1>
          <p>
            פלטפורמת React לניהול אנשי קשר, תבניות, קמפיינים, שיחות, תהליכי
            בוט וסוכן AI — עם הפרדה מלאה בין לקוחות.
          </p>
          <div className="hero-actions">
            <Link href="/workspace" className="primary-button">
              כניסה לסביבת ההקמה
              <span aria-hidden="true">←</span>
            </Link>
            <a href="#architecture" className="secondary-button">
              הצגת מבנה המערכת
            </a>
          </div>
          <small className="hero-disclaimer">
            סביבת ההקמה אינה מחוברת עדיין ל־Meta, סליקה או ספק AI.
          </small>
        </div>

        <div className="hero-product-map" aria-label="מפת יכולות המוצר">
          <div className="map-orbit orbit-one" />
          <div className="map-orbit orbit-two" />
          <div className="map-center">
            <span>Connect</span>
            <strong>מרכז התקשורת</strong>
          </div>
          <div className="map-node node-meta">
            <span>M</span>
            <strong>Meta</strong>
            <small>חיבור רשמי</small>
          </div>
          <div className="map-node node-campaign">
            <span>↗</span>
            <strong>Campaigns</strong>
            <small>שליחה ותזמון</small>
          </div>
          <div className="map-node node-inbox">
            <span>◌</span>
            <strong>Inbox</strong>
            <small>בוט ונציג</small>
          </div>
          <div className="map-node node-ai">
            <span>✦</span>
            <strong>AI</strong>
            <small>ידע עסקי</small>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="עקרונות המערכת">
        <span>Multi-Tenant</span>
        <i />
        <span>Queue-based Sending</span>
        <i />
        <span>Webhook Idempotency</span>
        <i />
        <span>Consent First</span>
        <i />
        <span>Audit Log</span>
      </section>

      <section className="public-section" id="capabilities">
        <div className="section-heading">
          <span>יכולות הליבה</span>
          <h2>מסלול אחד מהחיבור ועד לדוח.</h2>
          <p>
            כל רכיב מקבל גבול אחריות ברור, כדי שהמערכת תוכל לגדול בלי לחזור
            למבנה המונוליטי של Connect הישן.
          </p>
        </div>
        <div className="capability-grid">
          {capabilities.map((capability) => (
            <article key={capability.number}>
              <span>{capability.number}</span>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section architecture-section" id="architecture">
        <div className="architecture-copy">
          <span>זרימת מערכת</span>
          <h2>React מנהל את הממשק. ה־Backend שומר על הגבולות.</h2>
          <p>
            סודות, Webhooks, הרשאות ופעולות שליחה אינם רצים בדפדפן. React
            מתקשר עם Backend מאובטח, וה־Backend מפעיל Adapters לספקים.
          </p>
        </div>
        <div className="flow-track">
          {systemFlow.map((step, index) => (
            <div className="flow-step" key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
              {index < systemFlow.length - 1 ? <i aria-hidden="true">←</i> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="public-section pricing-section" id="pricing">
        <div>
          <span className="status-pill critical">החלטה עסקית פתוחה</span>
          <h2>החבילות והמחירים טרם הוגדרו.</h2>
          <p>
            לא מוצגים מחירים או מגבלות מומצאים. לאחר החלטת מוצר יוגדרו מספר
            משתמשים, מספרי WhatsApp, אנשי קשר, הודעות וצריכת AI לכל חבילה.
          </p>
        </div>
        <Link href="/workspace/decisions" className="primary-button">
          מעבר למרכז ההחלטות
        </Link>
      </section>

      <footer className="public-footer">
        <Link href="/" className="public-brand">
          <strong>Connect</strong>
        </Link>
        <p>מערכת WhatsApp Business SaaS מבוססת React.</p>
        <div>
          <Link href="/login">התחברות</Link>
          <Link href="/register">פתיחת חשבון</Link>
        </div>
      </footer>
    </main>
  );
}
