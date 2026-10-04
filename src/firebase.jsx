import { createContext, useContext, useEffect, useState } from 'react';
import { getApp, getApps, initializeApp } from '@firebase/app';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from '@firebase/auth';
import {
  connectDatabaseEmulator,
  getDatabase,
  onValue,
  push,
  ref,
  serverTimestamp,
} from '@firebase/database';

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.databaseURL,
  firebaseConfig.projectId,
  firebaseConfig.appId,
].every(Boolean);

export const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
};
export const cloudinaryConfigured = Object.values(cloudinaryConfig).every(Boolean);

const app = firebaseConfigured
  ? getApps().length ? getApp() : initializeApp(firebaseConfig)
  : null;
export const auth = app ? getAuth(app) : null;
export const database = app ? getDatabase(app) : null;

if (useEmulators && auth && database) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDatabaseEmulator(database, '127.0.0.1', 9000);
}

const AuthContext = createContext({ user: null, loading: false, error: null });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    getRedirectResult(auth).catch(setError);
    return onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setError(null);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setLoading(false);
      },
    );
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useUserState = () => useContext(AuthContext);

export function useRealtimeList(listQuery, retryKey = 0) {
  const [state, setState] = useState({ snapshots: [], loading: Boolean(listQuery), error: null });

  useEffect(() => {
    if (!listQuery) {
      setState({ snapshots: [], loading: false, error: null });
      return undefined;
    }

    setState({ snapshots: [], loading: true, error: null });
    return onValue(
      listQuery,
      (snapshot) => {
        const snapshots = [];
        snapshot.forEach((child) => snapshots.push(child));
        setState({ snapshots, loading: false, error: null });
      },
      (error) => setState({ snapshots: [], loading: false, error }),
    );
  }, [listQuery, retryKey]);

  return [state.snapshots, state.loading, state.error];
}

export async function signInWithGoogle() {
  if (!auth) throw new Error('Configure Firebase to enable sign-in.');

  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  const isMobile = window.matchMedia('(max-width: 700px)').matches
    || window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true;

  if (isMobile) return signInWithRedirect(auth, provider);
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  if (!auth) return Promise.resolve();
  return signOut(auth);
}

export function getAuthorName(user) {
  return (user?.displayName || user?.email?.split('@')[0] || 'NYSL user').slice(0, 80);
}

export async function publishMessage(gameId, user, text) {
  if (!database || !user) throw new Error('Sign in to post.');
  const cleanText = text.trim();
  if (!cleanText || cleanText.length > 500) throw new Error('Messages must be between 1 and 500 characters.');

  return push(ref(database, `messages/${gameId}`), {
    authorUid: user.uid,
    author: getAuthorName(user),
    text: cleanText,
    timestamp: serverTimestamp(),
  });
}

export async function uploadPicture(file) {
  if (!cloudinaryConfigured) throw new Error('Configure Cloudinary to enable photo uploads.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file?.type)) {
    throw new Error('Choose a JPG, PNG, or WebP image.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('The image must be 10 MB or smaller.');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
    { method: 'POST', body: formData },
  );
  const result = await response.json();
  if (!response.ok || typeof result.secure_url !== 'string') {
    throw new Error(result.error?.message || 'Cloudinary could not upload the image. Try again.');
  }

  return result.secure_url;
}

export async function publishPicture(gameId, user, picture) {
  if (!database || !user) throw new Error('Sign in to post photos.');
  if (!picture?.url?.startsWith('https://res.cloudinary.com/')) {
    throw new Error('A valid Cloudinary URL was not found.');
  }

  return push(ref(database, `pictures/${gameId}`), {
    authorUid: user.uid,
    author: getAuthorName(user),
    url: picture.url,
    caption: picture.caption.trim().slice(0, 160),
    timestamp: serverTimestamp(),
  });
}

export async function publishRegistration(user, registration) {
  if (!database || !user) throw new Error('Sign in before submitting a registration.');
  if (!registration || registration.consent !== true) {
    throw new Error('Parent or guardian consent is required.');
  }

  return push(ref(database, `registrations/${user.uid}`), {
    ...registration,
    parentUid: user.uid,
    timestamp: serverTimestamp(),
  });
}
