"use client";

import { useAuth } from "@clerk/nextjs";
import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft.ts";
import { readMetaMediaDownloadOrigin } from "./metaMediaDownloadClient.ts";
import { MetaMediaDownloadControl } from "./MetaMediaDownloadControl.tsx";

const origin = readMetaMediaDownloadOrigin(process.env.NEXT_PUBLIC_META_MEDIA_DOWNLOAD_ORIGIN, process.env.NODE_ENV === "production");
type Props = { messageKey: string; language: InterfaceLanguage };

export function MetaMediaDownloadButton(props: Props) {
  return origin ? <AuthenticatedDownload {...props} origin={origin} /> : null;
}
function AuthenticatedDownload(props: Props & { origin: string }) {
  const { getToken, userId, orgId, sessionId, isLoaded, isSignedIn } = useAuth();
  if (!isLoaded || !isSignedIn || !orgId) return null;
  return <MetaMediaDownloadControl key={`${userId}:${orgId}:${sessionId}:${props.messageKey}`} {...props} getToken={getToken} />;
}
