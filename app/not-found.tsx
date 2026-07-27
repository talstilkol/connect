import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page" dir="rtl">
      <span>404</span>
      <h1>העמוד לא נמצא</h1>
      <p>הכתובת אינה חלק מה־Routes המוגדרים של Connect.</p>
      <Link href="/" className="primary-button">
        חזרה לעמוד הבית
      </Link>
    </main>
  );
}
