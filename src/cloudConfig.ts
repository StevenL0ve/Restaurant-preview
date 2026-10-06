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

export const CLOUD_CONFIG: CloudConfig | null = null;
