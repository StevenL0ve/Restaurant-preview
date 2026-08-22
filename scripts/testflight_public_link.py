#!/usr/bin/env python3
"""Create (or fetch) the public TestFlight link for CGP.

Ensures the external beta group exists with its public link enabled, attaches
the newest processed build, answers export compliance, fills in the Beta App
Review info, and submits the build for beta review. Prints the public link.
Safe to re-run: every step is get-or-create.
"""
import json, os, sys, textwrap, time

import jwt  # pyjwt
import requests

def normalized_pem(path: str) -> str:
    """Rebuild strict PEM framing — tolerates \r, literal \n, or single-line keys."""
    raw = open(path).read().replace("\\n", "\n")
    body = "".join(raw.split())
    for marker in ("-----BEGINPRIVATEKEY-----", "-----ENDPRIVATEKEY-----"):
        body = body.replace(marker, "")
    return ("-----BEGIN PRIVATE KEY-----\n"
            + "\n".join(textwrap.wrap(body, 64))
            + "\n-----END PRIVATE KEY-----\n")

KEY_ID = os.environ["ASC_KEY_ID"]
ISSUER_ID = os.environ["ASC_ISSUER_ID"]
PRIVATE_KEY = normalized_pem(os.environ["ASC_KEY_PATH"])
BUNDLE_ID = "com.commongroundprojects.cgp"
GROUP_NAME = "CGP Family & Friends"
FEEDBACK_EMAIL = "bkborngaraised@gmail.com"
API = "https://api.appstoreconnect.apple.com"

def token() -> str:
    now = int(time.time())
    return jwt.encode(
        {"iss": ISSUER_ID, "iat": now, "exp": now + 900, "aud": "appstoreconnect-v1"},
        PRIVATE_KEY, algorithm="ES256", headers={"kid": KEY_ID},
    )

def call(method, path, payload=None, params=None, ok=(200, 201, 204)):
    r = requests.request(method, API + path, params=params, json=payload,
                         headers={"Authorization": f"Bearer {token()}"})
    if r.status_code not in ok:
        print(f"!! {method} {path} -> {r.status_code}: {r.text[:500]}")
    return r

# 1) App
apps = call("GET", "/v1/apps", params={"filter[bundleId]": BUNDLE_ID}).json()["data"]
if not apps:
    sys.exit("app not found")
app_id = apps[0]["id"]
print(f"app id: {app_id}")

# 2) Beta group with public link
groups = call("GET", "/v1/betaGroups",
              params={"filter[app]": app_id, "filter[name]": GROUP_NAME}).json()["data"]
if groups:
    group = groups[0]
    if not group["attributes"].get("publicLinkEnabled"):
        group = call("PATCH", f"/v1/betaGroups/{group['id']}",
                     {"data": {"type": "betaGroups", "id": group["id"],
                               "attributes": {"publicLinkEnabled": True}}}).json()["data"]
else:
    group = call("POST", "/v1/betaGroups", {
        "data": {"type": "betaGroups",
                 "attributes": {"name": GROUP_NAME, "publicLinkEnabled": True,
                                "publicLinkLimitEnabled": False},
                 "relationships": {"app": {"data": {"type": "apps", "id": app_id}}}}
    }).json()["data"]
print(f"group: {group['id']}")

# 3) Newest processed build
builds = call("GET", "/v1/builds",
              params={"filter[app]": app_id, "filter[processingState]": "VALID",
                      "sort": "-uploadedDate", "limit": 1}).json()["data"]
if not builds:
    sys.exit("no processed build yet — retry in a few minutes")
build = builds[0]
build_id = build["id"]
print(f"build: {build['attributes']['version']} ({build_id})")

# 4) Export compliance (standard HTTPS only)
if build["attributes"].get("usesNonExemptEncryption") is None:
    call("PATCH", f"/v1/builds/{build_id}",
         {"data": {"type": "builds", "id": build_id,
                   "attributes": {"usesNonExemptEncryption": False}}})
    print("export compliance answered: no non-exempt encryption")

# 5) Beta App Review info (required once)
locs = call("GET", f"/v1/apps/{app_id}/betaAppLocalizations").json()["data"]
if locs:
    call("PATCH", f"/v1/betaAppLocalizations/{locs[0]['id']}",
         {"data": {"type": "betaAppLocalizations", "id": locs[0]["id"],
                   "attributes": {"feedbackEmail": FEEDBACK_EMAIL,
                                  "description": "One app for The Common Ground Projects: order from the cafe & kitchen, earn punch-card rewards, book yoga, Pilates, spa and massage, and play the community puzzle."}}})
else:
    call("POST", "/v1/betaAppLocalizations",
         {"data": {"type": "betaAppLocalizations",
                   "attributes": {"locale": "en-US", "feedbackEmail": FEEDBACK_EMAIL,
                                  "description": "One app for The Common Ground Projects: order from the cafe & kitchen, earn punch-card rewards, book yoga, Pilates, spa and massage, and play the community puzzle."},
                   "relationships": {"app": {"data": {"type": "apps", "id": app_id}}}}})
# Apple requires a real reachable phone for the beta-review contact; pass it
# via the workflow's contact_phone input (E.164, e.g. +12285551234).
review_contacts = call("GET", f"/v1/apps/{app_id}/betaAppReviewDetail").json().get("data")
contact_phone = os.environ.get("CONTACT_PHONE", "").strip()
if review_contacts and contact_phone:
    call("PATCH", f"/v1/betaAppReviewDetails/{review_contacts['id']}",
         {"data": {"type": "betaAppReviewDetails", "id": review_contacts["id"],
                   "attributes": {"contactEmail": FEEDBACK_EMAIL,
                                  "contactFirstName": "Steven", "contactLastName": "Nelson",
                                  "contactPhone": contact_phone}}})

# 6) What to test on this build
bl = call("GET", f"/v1/builds/{build_id}/betaBuildLocalizations").json()["data"]
whats = "Order food & coffee, stamp the punch card (staff PIN 7391), book a class, and try the cafe puzzle under More."
if bl:
    call("PATCH", f"/v1/betaBuildLocalizations/{bl[0]['id']}",
         {"data": {"type": "betaBuildLocalizations", "id": bl[0]["id"],
                   "attributes": {"whatsNew": whats}}})
else:
    call("POST", "/v1/betaBuildLocalizations",
         {"data": {"type": "betaBuildLocalizations",
                   "attributes": {"locale": "en-US", "whatsNew": whats},
                   "relationships": {"build": {"data": {"type": "builds", "id": build_id}}}}})

# 7) Attach the build to the group
call("POST", f"/v1/betaGroups/{group['id']}/relationships/builds",
     {"data": [{"type": "builds", "id": build_id}]}, ok=(200, 201, 204, 409))

# 8) Submit for beta review (409 = already submitted/approved, fine)
call("POST", "/v1/betaAppReviewSubmissions",
     {"data": {"type": "betaAppReviewSubmissions",
               "relationships": {"build": {"data": {"type": "builds", "id": build_id}}}}},
     ok=(200, 201, 409))

# 9) The link + external review state
group = call("GET", f"/v1/betaGroups/{group['id']}").json()["data"]
print("PUBLIC_LINK=" + str(group["attributes"].get("publicLink")))
details = call("GET", "/v1/buildBetaDetails",
               params={"filter[build]": build_id}).json().get("data", [])
if details:
    print("REVIEW_STATE=" + str(details[0]["attributes"].get("externalBuildState")))
