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
   Or, once: Project settings → Service accounts → Generate new private
   key, save the JSON as the GitHub secret `FIREBASE_SERVICE_ACCOUNT`, and
   the **Firestore rules** workflow publishes every change to the file
   automatically.

   What the rules enforce: each account can only touch its own data. A
   facility's shared library is readable and writable only by that
   facility's ACTIVE members. Joining needs the facility password (checked
   server-side against a proof only admins can read), is refused for a
   blocked email, and waits as PENDING until a facility admin approves it. Admins change the password and block or allow members;
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
//                                         status: pending → active (admin approved) | denied | blocked
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
    function memberData(ws) { return get(memberPath(ws)).data; }
    // Active, and (after a password change) still inside the 30-day window
    // to enter the new password. Past it, the facility is closed to them
    // until they re-enter the password (see the self re-key update below).
    function isActiveMember(ws) {
      return signedIn() && exists(memberPath(ws)) && memberData(ws).status == 'active'
        && (!('rekeyBy' in memberData(ws)) || memberData(ws).rekeyBy > request.time);
    }
    function isAdmin(ws) {
      return isActiveMember(ws) && get(memberPath(ws)).data.role == 'admin';
    }
    // OR staff (admins and members). Vendor reps are active members too,
    // but linked for set-request tracking only: they never see the library.
    function isStaff(ws) {
      return isActiveMember(ws) && memberData(ws).role != 'rep';
    }
    function isRep(ws) {
      return isActiveMember(ws) && memberData(ws).role == 'rep';
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
      // Facilities are set up by ORSync (owners) only; the owner who creates
      // one is its first admin and assigns the rest.
      allow create: if isOwner() && request.resource.data.createdBy == request.auth.uid;
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
        // Members and owners see the roster; anyone can read their own
        // record (to learn whether their request was approved).
        allow get: if isActiveMember(ws) || isOwner() || (signedIn() && uid == request.auth.uid);
        allow list: if isActiveMember(ws) || isOwner();
        // Asking to join: your own record, with the facility's current
        // password proof, not on the blocked list, and PENDING until an
        // admin approves it. The facility's creator is its first admin and
        // starts active.
        allow create: if signedIn()
          && uid == request.auth.uid
          && request.resource.data.email == myEmail()
          && !isBlockedEmail(ws)
          && request.resource.data.proof == facilityProof(ws)
          && (((request.resource.data.role == 'member' || request.resource.data.role == 'rep') && request.resource.data.status == 'pending')
              || (request.resource.data.role == 'admin' && request.resource.data.status == 'active'
                  && wsDoc(ws).data.createdBy == request.auth.uid));
        // You keep your own name/phone/position current (and drop the proof
        // once sent). Entering the facility's current password clears your
        // re-key deadline. Admins change status (approve, deny, block,
        // allow) and set re-key deadlines. Owners change anything (roles).
        allow update: if (signedIn() && uid == request.auth.uid
              && changedOnly(['name', 'phone', 'position', 'photo', 'updatedAt', 'proof'])
              && !('proof' in request.resource.data))
          || (signedIn() && uid == request.auth.uid
              && changedOnly(['rekeyBy', 'rekeyedAt', 'updatedAt', 'proof'])
              && !('rekeyBy' in request.resource.data)
              && request.resource.data.proof == facilityProof(ws))
          || (isAdmin(ws) && changedOnly(['status', 'updatedAt', 'blockedAt', 'blockedBy', 'approvedAt', 'approvedBy', 'deniedAt', 'rekeyBy', 'rekeyedAt']))
          || (isAdmin(ws) && uid != request.auth.uid && changedOnly(['role', 'updatedAt'])
              && request.resource.data.role in ['admin', 'member'])
          || isOwner();
        // Admins remove people; anyone can delete their own membership
        // (leaving, or deleting their account).
        allow delete: if isAdmin(ws) || isOwner() || (signedIn() && uid == request.auth.uid);
      }

      match /blocked/{email} {
        allow read, write: if isAdmin(ws) || isOwner();
      }

      // Set requests: staff see and edit all; a rep sees and updates only
      // the ones assigned to their account (their queries filter on repUid),
      // and only the fields a rep owns (status, sets, ETA, contact).
      match /data/library/loaners/{id} {
        allow read: if isStaff(ws) || (isRep(ws) && resource.data.repUid == request.auth.uid);
        allow create, delete: if isStaff(ws);
        allow update: if isStaff(ws)
          || (isRep(ws) && resource.data.repUid == request.auth.uid
              && request.resource.data.repUid == request.auth.uid
              && changedOnly(['status', 'sets', 'history', 'estimatedDelivery', 'repName', 'repPhone', 'repEmail', 'altContact', 'updatedAt', '_ord']));
      }
      // The shared library: cards, carts, pulls, QC, schedule, on-call, notes.
      match /data/{document=**} {
        allow read, write: if isStaff(ws);
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
