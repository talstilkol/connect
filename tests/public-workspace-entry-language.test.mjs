import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Exercise the real public/auth components and proxy. Only framework/provider
// boundaries are replaced: no credentials, account sign-in, redirect execution,
// network access, or fabricated authorization success takes place in this test.
const root = fileURLToPath(new URL("../", import.meta.url));
async function loadBoundaryFixture(entry, exports) {
  const result = await build({
    stdin: { contents: exports, resolveDir: root, sourcefile: entry },
    bundle: true, write: false, format: "esm", platform: "node", jsx: "automatic",
    plugins: [{
      name: "entry-language-framework-boundaries",
      setup(api) {
        api.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, args =>
          ({ path: import.meta.resolve(args.path), external: true }));
        api.onResolve({ filter: /^(next\/link|next\/server|@clerk\/nextjs(?:\/server)?)$/ }, args =>
          ({ path: args.path, namespace: "entry-language-boundary" }));
        api.onResolve({ filter: /clerkConfiguration$/ }, () =>
          ({ path: "configuration", namespace: "entry-language-boundary" }));
        api.onLoad({ filter: /.*/, namespace: "entry-language-boundary" }, args => {
          const modules = {
            "next/link": `import {createElement} from 'react';
              export default function Link(props){return createElement('a',props,props.children)}`,
            "next/server": "export const NextResponse={next(){return new Response(null,{status:200})}}",
            "configuration": "export function inspectClerkConfiguration(){return {status:'configured'}}",
            "@clerk/nextjs": `import {createElement} from 'react';
              export function SignIn(props){return createElement('output',{'data-provider':'sign-in','data-fallback':props.fallbackRedirectUrl,'data-switch':props.signUpUrl})}
              export function SignUp(props){return createElement('output',{'data-provider':'sign-up','data-fallback':props.fallbackRedirectUrl,'data-switch':props.signInUrl})}`,
            "@clerk/nextjs/server": `
              export function clerkMiddleware(handler, options){return async(request,event)=>{
                const resolved=typeof options==='function'?await options(request):options??(typeof handler==='object'?handler:{});
                if(typeof handler==='function') await handler(undefined,request,event);
                return Response.json({options:resolved,requestUrl:request.nextUrl.href});
              }}`,
          };
          return { contents: modules[args.path], loader: "js" };
        });
      },
    }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
}

const { PublicLandingPage, AuthForm, proxy } = await loadBoundaryFixture("entry-language-check.mjs", `
  export {PublicLandingPage} from './features/public/PublicLandingPage.tsx';
  export {default as AuthForm} from './features/auth/AuthForm.tsx';
  export {default as proxy} from './proxy.ts';`);

const cases = [
  { language: "he", prefix: "", query: "" },
  { language: "en", prefix: "/en", query: "?lang=en" },
  { language: "ar", prefix: "/ar", query: "?lang=ar" },
];
function renderedLinks(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/gu)].map(match => match[1].replaceAll("&amp;", "&"));
}

for (const { language, prefix, query } of cases) {
  test(`${language}: public workspace and decision links retain the selected language`, () => {
    const html = renderToStaticMarkup(createElement(PublicLandingPage, { language }));
    const links = renderedLinks(html);
    assert.ok(links.includes(`/workspace${query}`), "setup workspace link must keep its language");
    assert.ok(links.includes(`/workspace/decisions${query}`), "decision link must keep its language");
    assert.ok(links.includes(`${prefix}/login`));
    assert.ok(links.includes(`${prefix}/register`));
  });

  test(`${language}: protected entry supplies localized Clerk routes without rewriting the deep link`, async () => {
    for (const pathname of ["/workspace", "/workspace/decisions", "/workspace/media-tasks"]) {
      const url = new URL(`${pathname}${query}`, "https://connect.example");
      url.searchParams.set("after", "cursor/value?preserve=1");
      const before = url.href;
      const response = await proxy({ nextUrl: url }, {});
      assert.deepEqual(await response.json(), {
        options: { signInUrl: `${prefix}/login`, signUpUrl: `${prefix}/register` },
        requestUrl: before,
      });
      assert.equal(url.href, before, "original return URL remains under Clerk's redirect handling");
    }
  });

  test(`${language}: rendered SignIn/SignUp keep localized fallback and switch URLs`, () => {
    for (const [mode, destination, otherMode] of [["login", "", "register"], ["register", "/onboarding", "login"]]) {
      const html = renderToStaticMarkup(createElement(AuthForm, { language, mode }));
      assert.ok(html.includes(`data-fallback="/workspace${destination}${query}"`));
      assert.ok(html.includes(`data-switch="${prefix}/${otherMode}"`));
      assert.ok(renderedLinks(html).includes(`${prefix}/${otherMode}`));
    }
  });
}

test("ambiguous and unsupported workspace language values fall back to Hebrew", async () => {
  for (const query of ["", "?lang=", "?lang=fr", "?lang=EN", "?lang=en&lang=ar", "?lang=en&lang=en", "?lang=%2F%2Fevil.example"]) {
    const response = await proxy({ nextUrl: new URL(`/workspace${query}`, "https://connect.example") }, {});
    assert.deepEqual((await response.json()).options, { signInUrl: "/login", signUpUrl: "/register" }, query);
  }
});

test("only actual workspace path segments read lang; auth routes use their locale segment", async () => {
  for (const [path, prefix] of [
    ["/workspace-evil?lang=en", ""], ["/workspaces?lang=ar", ""],
    ["/en/login?lang=ar", "/en"], ["/ar/register?lang=en", "/ar"],
    ["/en/login/tasks/setup-mfa", "/en"], ["/ar/register/tasks/choose-organization", "/ar"],
    ["/english/login", ""], ["/en-US/login", ""],
    ["/api?lang=ar", ""], ["/admin?lang=en", ""],
    ["/login?redirect_url=https%3A%2F%2Fevil.example%2Fen", ""],
  ]) {
    const url = new URL(path, "https://connect.example");
    const before = url.href;
    const response = await proxy({ nextUrl: url }, {});
    assert.deepEqual(await response.json(), {
      options: { signInUrl: `${prefix}/login`, signUpUrl: `${prefix}/register` },
      requestUrl: before,
    }, path);
  }
});
