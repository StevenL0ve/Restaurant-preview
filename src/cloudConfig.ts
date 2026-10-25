// ORSync Cloud configuration.
//
// Null = cloud off: the app is fully local, exactly as before. To turn the
// cloud on, create a (free) Firebase project and paste its web-app config
// object here; see docs/cloud-setup.md for the 5-minute walkthrough. These
// values are identifiers, not secrets: data access is enforced server-side
// by Firestore security rules, never by hiding this config.

export interface CloudConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export const CLOUD_CONFIG: CloudConfig | null = {
  apiKey: "AIzaSyBYuQo508yrUl8pRvnG6EVhc2k_oVwHrDc",
  authDomain: "orsync-8f84a.firebaseapp.com",
  projectId: "orsync-8f84a",
  storageBucket: "orsync-8f84a.firebasestorage.app",
  messagingSenderId: "608797386852",
  appId: "1:608797386852:web:30a5b2dbe2849a0a471771",
};
