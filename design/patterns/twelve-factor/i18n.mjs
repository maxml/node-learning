// Localization on a server: built-in Intl, and why a process-global "current locale"
// (i18n.setLocale in the old course example) breaks under concurrent requests.
// Run: `node twelve-factor/i18n.mjs`
import { AsyncLocalStorage } from "node:async_hooks";

// 1. Plural categories differ by language: English has 2, Ukrainian 4.
const pr = (loc) => new Intl.PluralRules(loc);
console.log("plural en:", [1, 2, 5, 21].map((n) => `${n}=${pr("en").select(n)}`).join(" "));
console.log("plural uk:", [1, 2, 5, 21, 1.5].map((n) => `${n}=${pr("uk").select(n)}`).join(" "));
console.log("plural uk categories:", pr("uk").resolvedOptions().pluralCategories.join(","));

// 2. Numbers, money, dates: locale data ships with Node (full ICU).
console.log("number:", new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH" }).format(1234.5),
  "|", new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(1234.5));
const instant = new Date("2026-10-30T22:30:00Z");
console.log("date:", new Intl.DateTimeFormat("uk-UA", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Kyiv" }).format(instant),
  "|", new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/New_York" }).format(instant));
console.log("icu:", process.versions.icu, "| full data:", typeof Intl.DisplayNames === "function" && new Intl.DisplayNames(["uk"], { type: "language" }).of("de"));

// 3. Global current locale vs per-request locale.
const messages = { en: { hello: "Hello" }, de: { hello: "Hallo" } };
let globalLocale = "en";
const t = (key) => messages[globalLocale][key];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function handlerGlobal(locale, delay) {
  globalLocale = locale;           // like i18n.setLocale(locale)
  await sleep(delay);              // any await: DB call, HTTP call
  return `${locale} request got "${t("hello")}"`;
}
console.log("global locale:", await Promise.all([handlerGlobal("en", 20), handlerGlobal("de", 5)]));

const als = new AsyncLocalStorage();
const tReq = (key) => messages[als.getStore().locale][key];
async function handlerScoped(locale, delay) {
  return als.run({ locale }, async () => { await sleep(delay); return `${locale} request got "${tReq("hello")}"`; });
}
console.log("per-request locale:", await Promise.all([handlerScoped("en", 20), handlerScoped("de", 5)]));
