import type { Metadata } from "next";
import AuthForm from "../../features/auth/AuthForm";
import { authMessages } from "../../shared/i18n/auth";

export const metadata: Metadata = {
  title: authMessages.he.metadata.login.title,
};

export default function LoginPage() {
  return <AuthForm language="he" mode="login" />;
}
