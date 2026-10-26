// Sets up ORSync's RevenueCat project through the v2 API, idempotently:
// imports the two App Store subscriptions as products, creates the "pro"
// entitlement with both attached, and fills the current "default" offering
// with Monthly and Annual packages (the package types src/lib/iap.ts reads).
// Prints the public SDK keys (appl_… / goog_…), which are safe to log.
//
//   REVENUECAT_SECRET_KEY  a v2 secret key with project read/write access
const KEY = process.env.REVENUECAT_SECRET_KEY;
const BASE = "https://api.revenuecat.com/v2";
const PRODUCTS = [
  { id: "orsync_pro_monthly", name: "ORSync Pro Monthly", pkg: "$rc_monthly", pkgName: "Monthly" },
  { id: "orsync_pro_annual", name: "ORSync Pro Annual", pkg: "$rc_annual", pkgName: "Annual" },
];

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${data.message ?? text.slice(0, 300)}`);
  return data;
}

async function all(path) {
  const out = [];
  let url = path + (path.includes("?") ? "&" : "?") + "limit=100";
  while (url) {
    const page = await api("GET", url);
    out.push(...(page.items ?? []));
    url = page.next_page ? page.next_page.replace(/^\/v2/, "") : null;
  }
  return out;
}

const report = [];
async function step(name, fn) {
  try {
    const r = await fn();
    report.push(`OK    ${name}${typeof r === "string" ? `: ${r}` : ""}`);
    return r;
  } catch (e) {
    report.push(`FAIL  ${name}: ${String(e.message).slice(0, 400)}`);
    return null;
  }
}

const projects = await all("/projects");
const project = projects.find((p) => /orsync/i.test(p.name)) ?? (projects.length === 1 ? projects[0] : null);
if (!project) {
  console.error(`No ORSync project found. Projects this key sees: ${projects.map((p) => p.name).join(", ") || "none"}`);
  process.exit(1);
}
const P = `/projects/${project.id}`;
console.log(`Project ${project.name} (${project.id})`);

const apps = await all(`${P}/apps`);
for (const a of apps) console.log(`  app ${a.name} [${a.type}] ${a.id}`);
let ios = apps.find((a) => a.type === "app_store");
if (!ios) {
  ios = await step("App Store app", () =>
    api("POST", `${P}/apps`, { name: "ORSync", type: "app_store", app_store: { bundle_id: "com.stevennelson.orsync" } }));
  if (!ios) {
    console.log(report.join("\n"));
    process.exit(1);
  }
  apps.push(ios);
}

const productIds = {};
for (const p of PRODUCTS) {
  productIds[p.id] = await step(`product ${p.id}`, async () => {
    const existing = (await all(`${P}/products?app_id=${ios.id}`)).find((x) => x.store_identifier === p.id && x.app_id === ios.id);
    if (existing) return existing.id;
    const made = await api("POST", `${P}/products`, {
      store_identifier: p.id, app_id: ios.id, type: "subscription", display_name: p.name,
    });
    return made.id;
  });
}

// Reuses one RevenueCat's onboarding already made ("ORSync Pro"); the app
// checks the lookup key printed here (PRO_ENTITLEMENT in src/lib/iap.ts).
const ent = await step("entitlement pro", async () => {
  const ents = await all(`${P}/entitlements`);
  const existing = ents.find((e) => e.lookup_key === "pro") ?? ents.find((e) => e.display_name === "ORSync Pro");
  return existing ?? (await api("POST", `${P}/entitlements`, { lookup_key: "pro", display_name: "ORSync Pro" }));
});
if (ent) {
  report.push(`      entitlement lookup key: ${ent.lookup_key}`);
  await step("attach products to pro", async () => {
    const have = new Set((await all(`${P}/entitlements/${ent.id}/products`)).map((x) => x.id));
    const add = Object.values(productIds).filter((id) => id && !have.has(id));
    if (!add.length) return "already attached";
    await api("POST", `${P}/entitlements/${ent.id}/actions/attach_products`, { product_ids: add });
    return `${add.length} attached`;
  });
}

const offering = await step("offering default", async () => {
  const existing = (await all(`${P}/offerings`)).find((o) => o.lookup_key === "default");
  const o = existing ?? (await api("POST", `${P}/offerings`, { lookup_key: "default", display_name: "Default" }));
  if (!o.is_current) await api("POST", `${P}/offerings/${o.id}`, { is_current: true });
  return o;
});
if (offering) {
  const pkgs = await all(`${P}/offerings/${offering.id}/packages`);
  for (const [i, p] of PRODUCTS.entries()) {
    await step(`package ${p.pkgName}`, async () => {
      const pkg = pkgs.find((x) => x.lookup_key === p.pkg) ??
        (await api("POST", `${P}/offerings/${offering.id}/packages`, { lookup_key: p.pkg, display_name: p.pkgName, position: i + 1 }));
      const attached = (await all(`${P}/packages/${pkg.id}/products`)).map((x) => x.product?.id ?? x.id);
      const pid = productIds[p.id];
      if (!pid || attached.includes(pid)) return "ready";
      await api("POST", `${P}/packages/${pkg.id}/actions/attach_products`, {
        products: [{ product_id: pid, eligibility_criteria: "all" }],
      });
      return "product attached";
    });
  }
}

for (const a of apps) {
  await step(`public SDK key (${a.type})`, async () => {
    const keys = await all(`${P}/apps/${a.id}/public_api_keys`);
    return keys.map((k) => k.key).join(", ") || "none";
  });
}

console.log("\n==== RevenueCat report ====");
for (const l of report) console.log(l);
if (report.some((l) => l.startsWith("FAIL"))) process.exitCode = 1;
