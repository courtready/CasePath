const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const FORBIDDEN = [
  /payment is optional/i,
  /freely usable/i,
  /payment is not required/i,
  /paid-access enforcement is not active/i,
  /not billed during/i,
  /free early access/i,
  /public beta/i,
  /create free account/i,
  /does not currently take payment/i,
  /there is no uk checkout/i,
  /no uk checkout, subscription, or billing/i,
  /does not currently use stripe/i,
  /uk has no billing/i,
  /everything stays free/i,
  /free during early access/i,
  /billing remains disabled/i,
  /casepath remains freely usable/i,
  /you can keep using casepath without paying/i,
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

const AU_PAGES = [
  { path: "/components/pricing.html", title: "AU pricing" },
  { path: "/how-it-works.html", title: "AU how-it-works" },
  { path: "/contact.html", title: "AU contact" },
  { path: "/index.html", title: "AU homepage/SPA shell" },
];

const UK_PAGES = [
  { path: "/pricing.html", title: "UK pricing" },
  { path: "/index.html", title: "UK homepage" },
  { path: "/how-it-works.html", title: "UK how-it-works" },
  { path: "/legal/terms.html", title: "UK terms" },
  { path: "/legal/refund-policy.html", title: "UK refund" },
  { path: "/legal/privacy.html", title: "UK privacy" },
  { path: "/legal/your-data.html", title: "UK your-data" },
];

function assertClean(label, text) {
  for (const re of FORBIDDEN) {
    expect.soft(text, `${label} must not match ${re}`).not.toMatch(re);
  }
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const pageDef of AU_PAGES) {
      test(`AU ${pageDef.title}`, async ({ page }) => {
        const res = await page.goto(pageDef.path, { waitUntil: "domcontentloaded" });
        expect(res && res.ok()).toBeTruthy();
        if (pageDef.path.includes("pricing")) {
          await page.waitForSelector(".pricing-root, h1", { timeout: 8000 });
        }
        const body = await page.locator("body").innerText();
        assertClean(`AU ${pageDef.title} ${vp.name}`, body);
        await page.screenshot({
          path: path.join(
            "/opt/cursor/artifacts/screenshots",
            `au-${pageDef.title.replace(/\s+/g, "-").toLowerCase()}-${vp.name}.png`
          ),
          fullPage: true,
        });
      });
    }

    for (const pageDef of UK_PAGES) {
      test(`UK ${pageDef.title}`, async ({ page }) => {
        const res = await page.goto("http://127.0.0.1:4174" + pageDef.path, {
          waitUntil: "domcontentloaded",
        });
        expect(res && res.ok()).toBeTruthy();
        if (pageDef.path === "/pricing.html") {
          await page.waitForSelector(".uk-pricing-root, #uk-pricing-static", { timeout: 8000 });
          await page.waitForTimeout(600);
        }
        const body = await page.locator("body").innerText();
        assertClean(`UK ${pageDef.title} ${vp.name}`, body);
        await page.screenshot({
          path: path.join(
            "/opt/cursor/artifacts/screenshots",
            `uk-${pageDef.title.replace(/\s+/g, "-").toLowerCase()}-${vp.name}.png`
          ),
          fullPage: true,
        });
      });
    }
  });
}

test("source audit of public copy files", async () => {
  const roots = [
    "components/pricing.html",
    "components/pricing/index.html",
    "how-it-works.html",
    "contact.html",
    "uk/pricing.html",
    "uk/index.html",
    "uk/how-it-works.html",
    "uk/legal/terms.html",
    "uk/legal/refund-policy.html",
    "uk/legal/privacy.html",
    "uk/legal/your-data.html",
    "uk/assets/js/uk-pricing.js",
    "uk/assets/js/uk-billing-checkout.js",
    "uk/assets/js/uk-shell.js",
    "uk/assets/js/uk-auth-gate.js",
    "assets/js/account/billing-checkout-lane.js",
  ];
  for (const rel of roots) {
    const text = fs.readFileSync(path.join("/workspace", rel), "utf8");
    assertClean(rel, text);
  }
});
