import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getApp, getApps, initializeApp } from '@firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  setPersistence,
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
const IDLE_LIMIT = 30 * 60 * 1000;
const ACTIVITY_KEY = 'nysl:last-activity';
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
  const [sessionNotice, setSessionNotice] = useState('');
  const clearAuthError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    let unsubscribe;
    setPersistence(auth, browserLocalPersistence)
      .catch((nextError) => { if (active) setError(nextError); })
      .finally(() => {
        if (!active) return;
        getRedirectResult(auth).catch((nextError) => { if (active) setError(nextError); });
        unsubscribe = onAuthStateChanged(
          auth,
          (nextUser) => {
            setUser(nextUser);
            setError(null);
            if (nextUser) setSessionNotice('');
            setLoading(false);
          },
          (nextError) => {
            setError(nextError);
            setLoading(false);
          },
        );
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!auth || !user) return undefined;
    let lastActivity = Date.now();
    let lastWrite = 0;
    const readActivity = () => Number(localStorage.getItem(ACTIVITY_KEY)) || lastActivity;
    const markActivity = () => {
      const now = Date.now();
      lastActivity = now;
      if (now - lastWrite > 15000) {
        localStorage.setItem(ACTIVITY_KEY, String(now));
        lastWrite = now;
      }
    };
    const checkIdle = () => {
      if (Date.now() - readActivity() < IDLE_LIMIT) return;
      localStorage.removeItem(ACTIVITY_KEY);
      setSessionNotice('Your session ended after 30 minutes of inactivity. Sign in to continue.');
      signOut(auth).catch(setError);
    };
    localStorage.setItem(ACTIVITY_KEY, String(lastActivity));
    const timer = window.setInterval(checkIdle, 30000);
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((event) => window.addEventListener(event, markActivity, { passive: true }));
    return () => {
      window.clearInterval(timer);
      ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((event) => window.removeEventListener(event, markActivity));
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, error, sessionNotice, clearAuthError }}>
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
        snapshot.forEach((child) => {
          snapshots.push(child);
        });
        setState({ snapshots, loading: false, error: null });
      },
      (error) => setState({ snapshots: [], loading: false, error }),
    );
  }, [listQuery, retryKey]);

  return [state.snapshots, state.loading, state.error];
}

export function signInWithGoogle() {
  if (!auth) throw new Error('Configure Firebase to enable sign-in.');

  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signOutUser() {
  if (!auth) return Promise.resolve();
  localStorage.removeItem(ACTIVITY_KEY);
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
    throw new Error('Cloudinary could not upload the image. Check the image and try again.');
  }

  return result.secure_url;
}

export async function publishPicture(gameId, user, picture) {
  if (!database || !user) throw new Error('Sign in to post photos.');
  let pictureUrl;
  try { pictureUrl = new URL(picture?.url); } catch { pictureUrl = null; }
  if (!pictureUrl || pictureUrl.protocol !== 'https:' || pictureUrl.hostname !== 'res.cloudinary.com' || !pictureUrl.pathname.startsWith(`/${cloudinaryConfig.cloudName}/image/upload/`)) {
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
