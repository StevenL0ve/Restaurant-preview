# ORSync Cloud setup (one time, about 5 minutes)

ORSync Cloud gives every signed-in user one primary home for their library
(cards, carts, loaners, on-call, rep stock) with live updates on all their
devices. It runs on Firebase's free tier. The code is already shipped and
dormant; these steps create the project and drop in its keys.

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com and sign in with any Google
   account you control (this account owns the data).
2. "Create a project" → name it `orsync` → Google Analytics off → Create.

## 2. Turn on sign-in and the database

3. In the left sidebar: **Build → Authentication → Get started →
   Email/Password → Enable → Save**.
4. **Build → Firestore Database → Create database → Start in production
   mode** → pick a US location → Enable.
5. Still in Firestore: **Rules** tab → replace everything with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Each account's own library.
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    // Facility workspaces (one shared library per hospital OR). The path key
    // is derived on-device from the facility name + password, so knowing it
    // IS the credential: signed-in users can open a workspace only by its
    // exact address ("get"), never list them.
    match /workspaces/{ws} {
      allow get, create, update: if request.auth != null;
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

   → Publish. (Each account can only touch its own data, and a facility's
   shared data only by knowing its name + password.)

## 3. Get the keys

6. Click the gear → **Project settings** → under "Your apps" click the
   **</> (Web)** icon → nickname `orsync-app` → Register app.
7. It shows a `firebaseConfig = { ... }` block. Copy it and paste it into
   the chat. The keys are identifiers, not secrets; access is enforced by
   the rules above.

## 4. Done

Paste the config block into the chat and the keys go into
`src/cloudConfig.ts`, followed by a new TestFlight build. From then on:
creating an account in the app stores the library in the cloud, signing in
on a second device pulls it down, and edits appear live everywhere.
