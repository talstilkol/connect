import {
  clerkMiddleware,
} from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { inspectClerkConfiguration } from "./server/auth/clerkConfiguration";
import { readClerkRequestRoutes } from "./server/auth/clerkRequestRoutes";

const configuredClerkMiddleware = clerkMiddleware(
  () => NextResponse.next(),
  (request) => readClerkRequestRoutes(request.nextUrl),
);

export default function proxy(
  request: NextRequest,
  event: NextFetchEvent,
) {
  const configuration = inspectClerkConfiguration();

  if (configuration.status === "incomplete") {
    return new Response("Clerk configuration is incomplete", {
      status: 503,
    });
  }

  if (configuration.status === "disabled") {
    return NextResponse.next();
  }

  return configuredClerkMiddleware(request, event);
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/login/tasks/:path*",
    "/register/tasks/:path*",
    "/en/:path*",
    "/ar/:path*",
    "/workspace/:path*",
    "/admin/:path*",
    "/invite/:path*",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
