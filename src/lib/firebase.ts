import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Connectivity check & optimization: Force long polling to avoid WebSocket stream issues
// specifically targetting "Target id not found" errors common in proxy environments.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errStr = error instanceof Error ? error.message : String(error);
  
  // Transient "Target id not found" (Code 5) often happens on network/stream shifts.
  // We log it as a warning and do not throw to allow listeners to attempt internal recovery or re-attachement.
  if (errStr.includes('Target id not found') || errStr.includes('Code: 5')) {
    console.warn(`[Firestore ${operationType}] Transient NOT_FOUND error (suppressed):`, errStr);
    return false; // Not a fatal error that should crash the flow
  }

  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connectivity Handshake
async function checkConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Connected to project: " + firebaseConfig.projectId);
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.log("Connected (Auth Restricted): " + firebaseConfig.projectId);
    } else {
      console.warn("Handshake missed: " + e.message);
    }
  }
}
checkConnection();

export default app;
