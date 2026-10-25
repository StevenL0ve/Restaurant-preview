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
5. Still in Firestore: **Rules** tab → replace everything with the
   contents of `firestore.rules` (repo root; copied below) → Publish.

   What the rules enforce: each account can only touch its own data. A
   facility's shared library is readable and writable only by that
   facility's ACTIVE members. Joining needs the facility password (checked
   server-side against a proof only admins can read) and is refused for a
   blocked email. Admins change the password and block or allow members;
   ORSync owners (the `ownerEmails()` list) assign admins at any facility.

```
rules_version = '2';

// ORSync Cloud security rules. Paste into Firebase console → Firestore →
// Rules → Publish. Everything the app relies on for facility access control
// is enforced HERE, not on the device, so a removed member's phone can't
// touch the facility no matter what it sends.
//
// Layout:
//   users/{uid}/...                       a person's own library and setups
//   workspaces/{ws}                       facility (name, createdBy); ws = sha256 of the name
//   workspaces/{ws}/private/auth          { proof } the current password proof (admins only)
//   workspaces/{ws}/members/{uid}         { email, name, phone, position, role, status }
//   workspaces/{ws}/blocked/{email}       people an admin shut out (rejoin refused)
//   workspaces/{ws}/data/library/...      the shared library (active members only)

service cloud.firestore {
  match /databases/{db}/documents {

    // ORSync (the company). Owners assign facility admins anywhere.
    function ownerEmails() {
      return ['stevenlnelson24@gmail.com'];
    }
    function signedIn() { return request.auth != null; }
    function myEmail() { return request.auth.token.email.lower(); }
    function isOwner() {
      return signedIn() && ('email' in request.auth.token) && myEmail() in ownerEmails();
    }

    function wsDoc(ws) { return get(/databases/$(db)/documents/workspaces/$(ws)); }
    function memberPath(ws) { return /databases/$(db)/documents/workspaces/$(ws)/members/$(request.auth.uid); }
    function isActiveMember(ws) {
      return signedIn() && exists(memberPath(ws)) && get(memberPath(ws)).data.status == 'active';
    }
    function isAdmin(ws) {
      return isActiveMember(ws) && get(memberPath(ws)).data.role == 'admin';
    }
    function facilityProof(ws) {
      return get(/databases/$(db)/documents/workspaces/$(ws)/private/auth).data.proof;
    }
    function isBlockedEmail(ws) {
      return exists(/databases/$(db)/documents/workspaces/$(ws)/blocked/$(myEmail()));
    }
    function changedOnly(keys) {
      return request.resource.data.diff(resource.data).affectedKeys().hasOnly(keys);
    }

    // Each account's own library.
    match /users/{uid}/{document=**} {
      allow read, write: if signedIn() && request.auth.uid == uid;
    }

    match /workspaces/{ws} {
      // Anyone signed in can look a facility up by its exact address (to
      // tell "no such facility" from "wrong password"); never list them.
      allow get: if signedIn();
      allow list: if false;
      allow create: if signedIn() && request.resource.data.createdBy == request.auth.uid;
      allow update: if isAdmin(ws) || isOwner();
      allow delete: if false;

      // The password proof. Written once by the creator, changed by admins.
      match /private/auth {
        allow read: if isAdmin(ws) || isOwner();
        allow create: if signedIn() && wsDoc(ws).data.createdBy == request.auth.uid;
        allow update: if isAdmin(ws) || isOwner();
        allow delete: if false;
      }

      match /members/{uid} {
        allow read: if isActiveMember(ws) || isOwner();
        // Joining: your own record, active, with the facility's current
        // password proof, and not on the blocked list. The facility's
        // creator joins as its first admin; everyone else as a member.
        allow create: if signedIn()
          && uid == request.auth.uid
          && request.resource.data.email == myEmail()
          && request.resource.data.status == 'active'
          && !isBlockedEmail(ws)
          && request.resource.data.proof == facilityProof(ws)
          && (request.resource.data.role == 'member'
              || (request.resource.data.role == 'admin' && wsDoc(ws).data.createdBy == request.auth.uid));
        // You keep your own name/phone/position current (and drop the proof
        // once in). Admins change status. Owners change anything (roles).
        allow update: if (isActiveMember(ws) && uid == request.auth.uid
              && changedOnly(['name', 'phone', 'position', 'updatedAt', 'proof'])
              && !('proof' in request.resource.data))
          || (isAdmin(ws) && changedOnly(['status', 'updatedAt', 'blockedAt', 'blockedBy']))
          || isOwner();
        allow delete: if isAdmin(ws) || isOwner();
      }

      match /blocked/{email} {
        allow read, write: if isAdmin(ws) || isOwner();
      }

      // The shared library: cards, carts, pulls, QC, schedule, on-call, notes.
      match /data/{document=**} {
        allow read, write: if isActiveMember(ws);
      }
    }
  }
}
```

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
