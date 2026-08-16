import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { inspectClerkConfiguration } from "./server/auth/clerkConfiguration";

const isProtectedRoute = createRouteMatcher(["/workspace(.*)"]);

const configuredClerkMiddleware = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

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
    "/workspace/:path*",
    "/admin/:path*",
    "/invite/:path*",
    "/api/:path*",
    "/trpc/:path*",
    "/__clerk/:path*",
  ],
};
