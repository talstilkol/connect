"use client";

import { ChangeEvent, ReactNode, useRef, useState } from "react";

type SectionId =
  | "dashboard"
  | "contacts"
  | "campaigns"
  | "inbox"
  | "bot"
  | "ai"
  | "reports"
  | "billing"
  | "decisions";

type BotBlock = {
  id: string;
  label: string;
  icon: string;
};

const navigation: Array<{
  id: SectionId;
  label: string;
  icon: string;
  group?: string;
}> = [
  { id: "dashboard", label: "סקירה כללית", icon: "⌂", group: "מרחב עבודה" },
  { id: "contacts", label: "אנשי קשר", icon: "♙" },
  { id: "campaigns", label: "קמפיינים", icon: "◒" },
  { id: "inbox", label: "תיבת שיחות", icon: "◌" },
  { id: "bot", label: "תהליכי בוט", icon: "⌘", group: "אוטומציה ונתונים" },
  { id: "ai", label: "סוכן AI", icon: "✦" },
  { id: "reports", label: "דוחות", icon: "↗" },
  { id: "billing", label: "מנוי וחיוב", icon: "◇", group: "חשבון" },
  { id: "decisions", label: "מרכז החלטות", icon: "✓" },
];

const setupSteps = [
  { title: "פרטי העסק", description: "שם, אזור זמן ושפת הממשק" },
  { title: "חיבור Meta", description: "Business Portfolio ו־WhatsApp Business" },
  { title: "בחירת חשבון WhatsApp", description: "בחירת WABA מאושר" },
  { title: "חיבור מספר טלפון", description: "אימות ושמירת מצב החיבור" },
  { title: "שם תצוגה", description: "השם שיוצג ללקוחות ב־WhatsApp" },
  { title: "תבנית ראשונה", description: "יצירה ושליחה לאישור Meta" },
  { title: "אנשי קשר", description: "ייבוא CSV או Excel ובדיקת הסכמה" },
  { title: "בוט או AI", description: "בחירת מסלול המענה הראשוני" },
  { title: "שליחת ניסיון", description: "בדיקת תהליך מקצה לקצה" },
  { title: "הפעלת סביבת העבודה", description: "מעבר ממצב הקמה למצב פעיל" },
];

const criticalDecisions = [
  {
    title: "ספק WhatsApp והמבנה מול Meta",
    detail: "יש להכריע בין חיבור ישיר כ־Tech Provider לבין ספק חיצוני.",
    owner: "מוצר + הנהלה",
  },
  {
    title: "ספק סליקה והפקת חשבוניות",
    detail: "הספק יקבע את תהליך ההרשמה, Webhooks, החזרים וחשבוניות.",
    owner: "כספים + פיתוח",
  },
  {
    title: "חבילות, מחירים ומגבלות",
    detail: "נדרשים מחירים אמיתיים ומגבלות משתמשים, מספרים, הודעות ו־AI.",
    owner: "הנהלה",
  },
  {
    title: "ספקי AI ומודל חיוב",
    detail: "נדרשת החלטה על ספק, מודלים, מפתח משותף או מפתח לכל לקוח.",
    owner: "מוצר + פיתוח",
  },
  {
    title: "רשימת יכולות מדויקת ל־MVP",
    detail: "יש לקבע אילו מסכים ופעולות נדרשים לגרסה הראשונה.",
    owner: "מוצר",
  },
  {
    title: "מדיניות הסכמה והסרה",
    detail: "הכללים יקבעו מי רשאי לקבל קמפיין ואיך מטפלים בבקשת הסרה.",
    owner: "משפטי + מוצר",
  },
  {
    title: "מיקום אחסון הנתונים",
    detail: "נדרשת החלטה על אזור אחסון, גיבויים ומדיניות שמירת מידע.",
    owner: "אבטחה + פיתוח",
  },
  {
    title: "משתמשים ומספרי WhatsApp",
    detail: "הכמויות המותרות לכל לקוח חייבות להיות חלק ממודל החבילות.",
    owner: "מוצר",
  },
  {
    title: "שיטת מעבר מבוט לנציג",
    detail: "יש להגדיר טריגרים, הקצאה, נעילת שיחה וחזרה לבוט.",
    owner: "שירות + מוצר",
  },
  {
    title: "מדיניות שמירת הודעות וקבצים",
    detail: "יש לקבוע תקופת שמירה, מחיקה, ייצוא והרשאות צפייה.",
    owner: "משפטי + אבטחה",
  },
];

const botBlockTypes = [
  { label: "הודעת טקסט", icon: "T" },
  { label: "מילת מפתח", icon: "#" },
  { label: "תנאי", icon: "?" },
  { label: "המתנה", icon: "◷" },
  { label: "הוספת תגית", icon: "+" },
  { label: "AI", icon: "✦" },
  { label: "העברה לנציג", icon: "↗" },
  { label: "סיום", icon: "■" },
];

export default function Home() {
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [metaPanelOpen, setMetaPanelOpen] = useState(false);
  const [contactFileName, setContactFileName] = useState<string | null>(null);
  const [botBlocks, setBotBlocks] = useState<BotBlock[]>([]);
  const [decisionNotes, setDecisionNotes] = useState<Record<number, string>>({});
  const blockCounter = useRef(0);

  const navigate = (section: SectionId) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  const addBotBlock = (label: string, icon: string) => {
    blockCounter.current += 1;
    setBotBlocks((current) => [
      ...current,
      {
        id: `bot-block-${blockCounter.current}`,
        label,
        icon,
      },
    ]);
  };

  const removeBotBlock = (id: string) => {
    setBotBlocks((current) => current.filter((block) => block.id !== id));
  };

  return (
    <main className="app-shell" dir="rtl">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>Connect</strong>
            <small>WhatsApp Business Platform</small>
          </div>
        </div>

        <nav className="main-navigation" aria-label="ניווט ראשי">
          {navigation.map((item, index) => {
            const previousGroup = index > 0 ? navigation[index - 1].group : null;
            const showGroup = item.group && item.group !== previousGroup;

            return (
              <div key={item.id}>
                {showGroup ? <p className="nav-group">{item.group}</p> : null}
                <button
                  type="button"
                  className={`nav-item ${activeSection === item.id ? "active" : ""}`}
                  onClick={() => navigate(item.id)}
                >
                  <span className="nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.id === "decisions" ? (
                    <span className="nav-count">10</span>
                  ) : null}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="workspace-avatar" aria-hidden="true">
            C
          </div>
          <div>
            <strong>סביבת עבודה חדשה</strong>
            <small>טרם הוגדר חשבון עסקי</small>
          </div>
          <button type="button" className="icon-button" aria-label="הגדרות חשבון">
            •••
          </button>
        </div>
      </aside>

      {mobileMenuOpen ? (
        <button
          className="mobile-overlay"
          type="button"
          aria-label="סגירת תפריט"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      <section className="content-area">
        <header className="topbar">
          <div className="topbar-start">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label="פתיחת תפריט"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              ☰
            </button>
            <div className="breadcrumb">
              <span>Connect</span>
              <b>/</b>
              <strong>{navigation.find((item) => item.id === activeSection)?.label}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="environment-badge">
              <i />
              סביבת הקמה
            </span>
            <button type="button" className="topbar-icon" aria-label="עזרה">
              ?
            </button>
            <button type="button" className="topbar-icon" aria-label="התראות">
              ♢
              <span className="notification-dot" />
            </button>
          </div>
        </header>

        <div className="page-content">
          {activeSection === "dashboard" ? (
            <Dashboard
              onNavigate={navigate}
              onConnectMeta={() => setMetaPanelOpen(true)}
            />
          ) : null}
          {activeSection === "contacts" ? (
            <Contacts
              fileName={contactFileName}
              onFileChange={(event) =>
                setContactFileName(event.target.files?.[0]?.name ?? null)
              }
            />
          ) : null}
          {activeSection === "campaigns" ? <Campaigns /> : null}
          {activeSection === "inbox" ? <Inbox /> : null}
          {activeSection === "bot" ? (
            <BotBuilder
              blocks={botBlocks}
              onAddBlock={addBotBlock}
              onRemoveBlock={removeBotBlock}
            />
          ) : null}
          {activeSection === "ai" ? <AiAgent /> : null}
          {activeSection === "reports" ? <Reports /> : null}
          {activeSection === "billing" ? <Billing /> : null}
          {activeSection === "decisions" ? (
            <DecisionCenter
              notes={decisionNotes}
              onNoteChange={(index, value) =>
                setDecisionNotes((current) => ({ ...current, [index]: value }))
              }
            />
          ) : null}
        </div>
      </section>

      {metaPanelOpen ? (
        <MetaConnectionPanel onClose={() => setMetaPanelOpen(false)} />
      ) : null}
    </main>
  );
}

function Dashboard({
  onNavigate,
  onConnectMeta,
}: {
  onNavigate: (section: SectionId) => void;
  onConnectMeta: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">מרכז השליטה</p>
          <h1>בוקר טוב, מתחילים לחבר את העסק.</h1>
          <p>
            סביבת העבודה מוכנה. כדי לשלוח הודעה רשמית ראשונה צריך להשלים את
            החיבור ל־Meta ולהגדיר את נתוני העסק.
          </p>
        </div>
        <div className="heading-actions">
          <button type="button" className="secondary-button" onClick={() => onNavigate("decisions")}>
            הצגת החלטות פתוחות
          </button>
          <button type="button" className="primary-button" onClick={onConnectMeta}>
            חיבור חשבון Meta
            <span aria-hidden="true">←</span>
          </button>
        </div>
      </div>

      <section className="connection-banner">
        <div className="connection-illustration" aria-hidden="true">
          <span className="phone-shape">◉</span>
          <span className="connection-line" />
          <span className="cloud-shape">M</span>
        </div>
        <div className="connection-copy">
          <span className="status-pill warning">
            <i />
            WhatsApp לא מחובר
          </span>
          <h2>השלב הראשון: חיבור רשמי ל־Meta</h2>
          <p>
            החיבור הרשמי מחליף את הזרקת הקוד ל־WhatsApp Web במערכת Connect
            הישנה. הודעות נכנסות וסטטוסי מסירה יגיעו דרך Webhooks.
          </p>
        </div>
        <button type="button" className="outline-button" onClick={onConnectMeta}>
          התחלת החיבור
        </button>
      </section>

      <section className="metrics-grid" aria-label="מדדי חשבון">
        <MetricCard label="הודעות החודש" icon="↗" />
        <MetricCard label="אנשי קשר" icon="♙" />
        <MetricCard label="קמפיינים פעילים" icon="◒" />
        <MetricCard label="צריכת AI" icon="✦" />
      </section>

      <div className="dashboard-grid">
        <section className="card onboarding-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">אשף הקמה</span>
              <h2>10 צעדים עד לשליחה הראשונה</h2>
            </div>
            <span className="progress-label">0 מתוך 10</span>
          </div>
          <div className="progress-track" aria-label="התקדמות 0 מתוך 10">
            <span style={{ width: "0%" }} />
          </div>
          <div className="setup-list">
            {setupSteps.slice(0, 5).map((step, index) => (
              <div className="setup-row" key={step.title}>
                <span className="step-number">{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{step.description}</small>
                </div>
                <span className="step-state">טרם התחיל</span>
              </div>
            ))}
          </div>
          <button type="button" className="text-button" onClick={onConnectMeta}>
            מעבר לשלב הראשון
            <span aria-hidden="true">←</span>
          </button>
        </section>

        <aside className="side-stack">
          <section className="card decision-card">
            <div className="decision-top">
              <span className="decision-icon">!</span>
              <span className="status-pill critical">דורש החלטה</span>
            </div>
            <h2>10 החלטות חוסמות פיתוח</h2>
            <p>
              ספק Meta, סליקה, חבילות, AI ומדיניות מידע עדיין לא הוגדרו באפיון.
            </p>
            <button type="button" className="text-button" onClick={() => onNavigate("decisions")}>
              פתיחת מרכז ההחלטות
              <span aria-hidden="true">←</span>
            </button>
          </section>

          <section className="card quick-actions-card">
            <span className="card-kicker">פעולות מהירות</span>
            <div className="quick-actions">
              <button type="button" onClick={() => onNavigate("contacts")}>
                <span>＋</span>
                ייבוא אנשי קשר
              </button>
              <button type="button" onClick={() => onNavigate("bot")}>
                <span>⌘</span>
                בניית תהליך
              </button>
              <button type="button" onClick={() => onNavigate("ai")}>
                <span>✦</span>
                הגדרת סוכן AI
              </button>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function MetricCard({ label, icon }: { label: string; icon: string }) {
  return (
    <article className="metric-card">
      <div className="metric-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <span>{label}</span>
        <strong>—</strong>
        <small>טרם קיים מקור נתונים</small>
      </div>
    </article>
  );
}

function Contacts({
  fileName,
  onFileChange,
}: {
  fileName: string | null;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <FeaturePage
      eyebrow="קהל ונתונים"
      title="אנשי קשר"
      description="ניהול אנשי קשר, תגיות, רשימות ותיעוד הסכמה לקבלת הודעות."
      action={
        <label className="primary-button file-button">
          בחירת קובץ לייבוא
          <input type="file" accept=".csv,.xlsx,.xls" onChange={onFileChange} />
        </label>
      }
    >
      {fileName ? (
        <section className="card import-card">
          <span className="document-icon">CSV</span>
          <div>
            <span className="card-kicker">קובץ נבחר</span>
            <h2>{fileName}</h2>
            <p>
              השלב הבא יהיה התאמת עמודות. הייבוא עצמו יופעל לאחר חיבור Backend
              והגדרת כללי כפילויות והסכמה.
            </p>
          </div>
          <span className="status-pill warning">ממתין להגדרות</span>
        </section>
      ) : (
        <EmptyState
          icon="♙"
          title="עדיין אין אנשי קשר"
          description="ייבוא יתמוך ב־CSV וב־Excel, אך לפני שמירת מידע צריך להכריע איך מזהים כפילויות ואיך מתעדים הסכמה לדיוור."
          footer="החלטות תלויות: מדיניות הסכמה, הסרה, כפילויות ואימות מספרי טלפון."
        />
      )}
    </FeaturePage>
  );
}

function Campaigns() {
  return (
    <FeaturePage
      eyebrow="שליחה ותזמון"
      title="קמפיינים"
      description="יצירת קמפיין מתבנית מאושרת, בחירת קהל, הערכת עלות ותזמון."
      action={
        <button type="button" className="primary-button" disabled>
          יצירת קמפיין
        </button>
      }
    >
      <EmptyState
        icon="◒"
        title="אי אפשר ליצור קמפיין עדיין"
        description="קמפיין דורש מספר WhatsApp מחובר, תבנית מאושרת וקהל עם הסכמה תקפה."
        footer="סדר הפעולות: חיבור Meta ← אישור תבנית ← ייבוא קהל ← שליחת ניסיון."
      />
    </FeaturePage>
  );
}

function Inbox() {
  return (
    <FeaturePage
      eyebrow="שירות לקוחות"
      title="תיבת שיחות"
      description="כל ההודעות הנכנסות, הקצאה לנציג ומעבר מבוט לאדם במקום אחד."
    >
      <div className="inbox-shell card">
        <div className="conversation-list">
          <div className="search-placeholder">חיפוש בשיחות</div>
          <div className="conversation-tabs">
            <button className="active" type="button">פתוחות</button>
            <button type="button">ממתינות</button>
            <button type="button">סגורות</button>
          </div>
          <div className="mini-empty">
            <span>◌</span>
            <strong>אין שיחות</strong>
            <small>שיחות יופיעו לאחר חיבור Webhook של Meta.</small>
          </div>
        </div>
        <div className="conversation-stage">
          <div className="empty-orbit" aria-hidden="true">
            <span>◌</span>
          </div>
          <h2>בחרו שיחה כדי להתחיל</h2>
          <p>היסטוריה, קבצים, הערות פנימיות ופרטי איש הקשר יוצגו כאן.</p>
        </div>
        <aside className="contact-panel">
          <span className="panel-label">פרטי איש קשר</span>
          <div className="skeleton-line wide" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </aside>
      </div>
    </FeaturePage>
  );
}

function BotBuilder({
  blocks,
  onAddBlock,
  onRemoveBlock,
}: {
  blocks: BotBlock[];
  onAddBlock: (label: string, icon: string) => void;
  onRemoveBlock: (id: string) => void;
}) {
  return (
    <FeaturePage
      eyebrow="אוטומציה"
      title="בונה תהליכי בוט"
      description="בניית זרימה ויזואלית. בגרסת ה־MVP הזרימה תתמקד במילות מפתח, הודעות ומעבר לנציג."
      action={
        <button type="button" className="secondary-button" disabled>
          שמירת טיוטה
        </button>
      }
    >
      <div className="bot-builder">
        <aside className="block-library card">
          <span className="card-kicker">ספריית בלוקים</span>
          <p>לחצו על בלוק כדי להוסיף אותו לזרימה.</p>
          <div className="block-buttons">
            {botBlockTypes.map((block) => (
              <button
                type="button"
                key={block.label}
                onClick={() => onAddBlock(block.label, block.icon)}
              >
                <span>{block.icon}</span>
                {block.label}
              </button>
            ))}
          </div>
        </aside>
        <section className="flow-canvas card">
          <div className="canvas-toolbar">
            <span>תהליך ללא שם</span>
            <div>
              <button type="button" aria-label="הקטנת תצוגה">−</button>
              <span>100%</span>
              <button type="button" aria-label="הגדלת תצוגה">＋</button>
            </div>
          </div>
          <div className="canvas-grid">
            <div className="start-node">
              <span>▶</span>
              <div>
                <small>נקודת התחלה</small>
                <strong>הודעה נכנסת</strong>
              </div>
            </div>
            {blocks.length === 0 ? (
              <div className="canvas-hint">
                <span>＋</span>
                <strong>הוסיפו את הבלוק הראשון</strong>
                <small>הבלוקים שתוסיפו יופיעו כאן לפי הסדר.</small>
              </div>
            ) : (
              <div className="flow-nodes">
                {blocks.map((block, index) => (
                  <div className="flow-node" key={block.id}>
                    <span className="node-connector" />
                    <span className="node-icon">{block.icon}</span>
                    <div>
                      <small>שלב {index + 1}</small>
                      <strong>{block.label}</strong>
                    </div>
                    <button
                      type="button"
                      aria-label={`הסרת ${block.label}`}
                      onClick={() => onRemoveBlock(block.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </FeaturePage>
  );
}

function AiAgent() {
  return (
    <FeaturePage
      eyebrow="מענה חכם"
      title="סוכן AI"
      description="הגדרת תפקיד, כללי מענה, מקורות ידע ומעבר בטוח לנציג אנושי."
      action={
        <button type="button" className="primary-button" disabled>
          יצירת סוכן
        </button>
      }
    >
      <div className="ai-layout">
        <section className="card ai-intro">
          <div className="ai-orb" aria-hidden="true">✦</div>
          <span className="status-pill warning">ספק AI לא הוגדר</span>
          <h2>קודם מגדירים גבולות, אחר כך מחברים מודל</h2>
          <p>
            יש להכריע מי מספק את מפתח ה־API, איך נמדדת הצריכה ומה קורה כאשר
            אין תשובה במאגר הידע.
          </p>
          <div className="safety-list">
            <span>✓ מקור ידע לפני תשובה</span>
            <span>✓ סף ביטחון למעבר לנציג</span>
            <span>✓ מגבלת עלות חודשית</span>
            <span>✓ רישום מלא ביומן ביקורת</span>
          </div>
        </section>
        <section className="card knowledge-card">
          <span className="card-kicker">מאגר ידע</span>
          <h2>אין מקורות ידע</h2>
          <p>העלאת קבצים תופעל לאחר הגדרת אחסון, סריקה וגודל קובץ מרבי.</p>
          <div className="knowledge-dropzone">
            <span>⇧</span>
            <strong>אזור העלאה עתידי</strong>
            <small>TXT, PDF, Word ו־CSV לפי החלטות ה־MVP</small>
          </div>
        </section>
      </div>
    </FeaturePage>
  );
}

function Reports() {
  return (
    <FeaturePage
      eyebrow="ביצועים"
      title="דוחות"
      description="מדדי שליחה, מסירה, קריאה, תגובה, עלות וביצועי בוט ו־AI."
    >
      <section className="reports-grid">
        {["דוחות קמפיינים", "דוחות שיחות", "דוחות בוט ו־AI"].map((title, index) => (
          <article className="card report-card" key={title}>
            <span className="report-icon">{["↗", "◌", "✦"][index]}</span>
            <h2>{title}</h2>
            <p>הנתונים יוצגו לאחר הפעלת מקורות האירועים המתאימים.</p>
            <div className="report-placeholder">
              <span />
              <span />
              <span />
              <span />
            </div>
          </article>
        ))}
      </section>
    </FeaturePage>
  );
}

function Billing() {
  return (
    <FeaturePage
      eyebrow="חשבון"
      title="מנוי וחיוב"
      description="חבילה, מגבלות שימוש, אמצעי תשלום, חשבוניות והיסטוריית חיובים."
    >
      <section className="card billing-card">
        <div>
          <span className="status-pill critical">לא הוגדר באפיון</span>
          <h2>אין עדיין חבילה או מחיר להצגה</h2>
          <p>
            ספק הסליקה, המחירים, המע״מ, תקופת הניסיון ומדיניות ניסיונות החיוב
            טרם הוכרעו. לכן לא מוצגים כאן נתוני חיוב מומצאים.
          </p>
        </div>
        <div className="billing-logic">
          <span>בחירת חבילה</span>
          <b>←</b>
          <span>אישור תשלום</span>
          <b>←</b>
          <span>יצירת Tenant</span>
          <b>←</b>
          <span>אשף הקמה</span>
        </div>
      </section>
    </FeaturePage>
  );
}

function DecisionCenter({
  notes,
  onNoteChange,
}: {
  notes: Record<number, string>;
  onNoteChange: (index: number, value: string) => void;
}) {
  const answeredCount = Object.values(notes).filter((note) => note.trim().length > 0).length;

  return (
    <FeaturePage
      eyebrow="שער לפני פיתוח"
      title="מרכז החלטות"
      description="10 הנושאים שחייבים לקבל תשובה אמיתית לפני חיבור שירותים וכתיבת לוגיקה עסקית."
      action={<span className="decision-progress">{answeredCount} מתוך 10 תועדו</span>}
    >
      <section className="decision-summary card">
        <div>
          <span className="summary-number">{10 - answeredCount}</span>
          <div>
            <strong>החלטות עדיין פתוחות</strong>
            <small>תשובה מקומית נשמרת רק בזמן שהמסך פתוח.</small>
          </div>
        </div>
        <div className="summary-progress">
          <span style={{ width: `${answeredCount * 10}%` }} />
        </div>
      </section>
      <div className="decisions-list">
        {criticalDecisions.map((decision, index) => {
          const hasNote = Boolean(notes[index]?.trim());
          return (
            <article className={`card decision-row ${hasNote ? "answered" : ""}`} key={decision.title}>
              <span className="decision-index">{String(index + 1).padStart(2, "0")}</span>
              <div className="decision-content">
                <div className="decision-title-row">
                  <div>
                    <h2>{decision.title}</h2>
                    <p>{decision.detail}</p>
                  </div>
                  <span className={`status-pill ${hasNote ? "success" : "critical"}`}>
                    {hasNote ? "תועדה תשובה" : "פתוח"}
                  </span>
                </div>
                <label>
                  <span>החלטה / הערה</span>
                  <textarea
                    rows={2}
                    value={notes[index] ?? ""}
                    placeholder="יש להזין החלטה אמיתית — לא ייווצר ערך ברירת מחדל."
                    onChange={(event) => onNoteChange(index, event.target.value)}
                  />
                </label>
                <small className="decision-owner">בעלי החלטה: {decision.owner}</small>
              </div>
            </article>
          );
        })}
      </div>
    </FeaturePage>
  );
}

function FeaturePage({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action ? <div className="heading-actions">{action}</div> : null}
      </div>
      {children}
    </>
  );
}

function EmptyState({
  icon,
  title,
  description,
  footer,
}: {
  icon: string;
  title: string;
  description: string;
  footer: string;
}) {
  return (
    <section className="card empty-state">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="empty-footer">
        <span>i</span>
        {footer}
      </div>
    </section>
  );
}

function MetaConnectionPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-layer" role="presentation">
      <button
        type="button"
        className="modal-backdrop"
        aria-label="סגירת חלון חיבור"
        onClick={onClose}
      />
      <section className="connection-panel" role="dialog" aria-modal="true" aria-labelledby="meta-title">
        <div className="panel-header">
          <div>
            <span className="card-kicker">חיבור רשמי</span>
            <h2 id="meta-title">חיבור Meta ו־WhatsApp</h2>
          </div>
          <button type="button" className="close-button" aria-label="סגירה" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="panel-notice">
          <span>!</span>
          <p>
            לא ניתן לפתוח Embedded Signup עד שיוגדרו Meta App ID, הרשאות ומודל
            הפעילות כ־Tech Provider או דרך ספק חיצוני.
          </p>
        </div>
        <ol className="connection-steps">
          <li>
            <span>1</span>
            <div>
              <strong>הגדרת ספק ומזהי Meta</strong>
              <small>החלטה חוסמת — טרם הוגדר</small>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Embedded Signup</strong>
              <small>כניסת Facebook ובחירת Business Portfolio</small>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Webhook ואימות החיבור</strong>
              <small>שמירת WABA, מספר טלפון וסטטוס חיבור</small>
            </div>
          </li>
        </ol>
        <div className="panel-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            סגירה
          </button>
          <button type="button" className="primary-button" disabled>
            פתיחת Meta
          </button>
        </div>
      </section>
    </div>
  );
}
