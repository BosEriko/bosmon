import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onIdTokenChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  EmailAuthProvider,
  linkWithCredential,
  linkWithPopup,
} from "firebase/auth";
import type { Account } from "./account";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { parseSave, Save } from "./game";
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
export const cloudEnabled = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);
export function firebaseAuth() {
  if (!cloudEnabled) throw new Error("Firebase is not configured");
  return getAuth(getApps()[0] ?? initializeApp(config));
}
export function watchAccount(
  next: (account: Account | null) => void,
  error: () => void,
) {
  return onIdTokenChanged(
    firebaseAuth(),
    (user) =>
      next(
        user
          ? { uid: user.uid, email: user.email, isAnonymous: user.isAnonymous }
          : null,
      ),
    error,
  );
}
export async function emailAccount(
  email: string,
  password: string,
  register: boolean,
) {
  const auth = firebaseAuth();
  if (register && auth.currentUser?.isAnonymous)
    return linkWithCredential(
      auth.currentUser,
      EmailAuthProvider.credential(email.trim(), password),
    );
  return register
    ? createUserWithEmailAndPassword(auth, email.trim(), password)
    : signInWithEmailAndPassword(auth, email.trim(), password);
}
export function googleAccount() {
  const auth = firebaseAuth(),
    provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return auth.currentUser?.isAnonymous
    ? linkWithPopup(auth.currentUser, provider)
    : signInWithPopup(auth, provider);
}
export const resetPassword = (email: string) =>
  sendPasswordResetEmail(firebaseAuth(), email.trim());
export const signOutAccount = () => signOut(firebaseAuth());
export type Trainer = {
  id: string;
  name: string;
  x: number;
  y: number;
  caught: number;
  level: number;
  updatedAt: { toMillis: () => number } | null;
};
export async function connectCloud(
  uid: string,
  onTrainers: (t: Trainer[]) => void,
  onError: () => void,
) {
  const app = getApps()[0] ?? initializeApp(config);
  const auth = getAuth(app);
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new Error("Account changed");
  const db = getFirestore(app),
    ref = doc(db, "saves", user.uid);
  const snapshot = await getDoc(ref);
  const unsubscribe = onSnapshot(
    query(collection(db, "trainers"), orderBy("updatedAt", "desc"), limit(30)),
    (snap) =>
      onTrainers(
        snap.docs
          .filter((d) => d.id !== user.uid)
          .map((d) => ({ id: d.id, ...d.data() }) as Trainer),
      ),
    onError,
  );
  return {
    saved: parseSave(snapshot.data()),
    unsubscribe,
    save: async (s: Save) => {
      if (auth.currentUser?.uid !== uid) throw new Error("Account changed");
      await setDoc(ref, s);
      await setDoc(doc(db, "trainers", user.uid), {
        name: s.name,
        x: s.x,
        y: s.y,
        caught: s.caught.length,
        level: Math.max(...s.team.map((m) => m.level)),
        updatedAt: serverTimestamp(),
      });
    },
  };
}
