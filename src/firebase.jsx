import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getApp, getApps, initializeApp } from '@firebase/app';
import { formatAuthorName } from './utilities/names.js';
import { consumeCommunityLimit } from './utilities/communityLimits.js';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from '@firebase/auth';
import {
  connectDatabaseEmulator,
  get,
  getDatabase,
  onValue,
  push,
  remove,
  ref,
  set,
  serverTimestamp,
} from '@firebase/database';

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
const IDLE_LIMIT = 30 * 60 * 1000;
const ACTIVITY_KEY = 'nysl:last-activity';
function readActivity(fallback) {
  try { return Number(localStorage.getItem(ACTIVITY_KEY)) || fallback; } catch { return fallback; }
}
function writeActivity(value) {
  try { localStorage.setItem(ACTIVITY_KEY, String(value)); } catch { /* Keep inactivity tracking in memory. */ }
}
function clearActivity() {
  try { localStorage.removeItem(ACTIVITY_KEY); } catch { /* Sign-out must still proceed. */ }
}
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

    return onAuthStateChanged(
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
  }, []);

  useEffect(() => {
    if (!auth || !user) return undefined;
    let lastActivity = Date.now();
    let lastWrite = 0;
    const markActivity = () => {
      const now = Date.now();
      lastActivity = now;
      if (now - lastWrite > 15000) {
        writeActivity(now);
        lastWrite = now;
      }
    };
    const checkIdle = () => {
      if (Date.now() - readActivity(lastActivity) < IDLE_LIMIT) return;
      clearActivity();
      setSessionNotice('Your session ended after 30 minutes of inactivity. Sign in to continue.');
      signOut(auth).catch(setError);
    };
    writeActivity(lastActivity);
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

export function usePostingStatus(user, retryKey = 0) {
  const [status, setStatus] = useState({ uid: null, blocked: false, loading: false, error: null });

  useEffect(() => {
    if (!database || !user) {
      setStatus({ uid: null, blocked: false, loading: false, error: null });
      return undefined;
    }

    setStatus({ uid: user.uid, blocked: false, loading: true, error: null });
    return onValue(
      ref(database, `blockedUsers/${user.uid}`),
      (snapshot) => setStatus({ uid: user.uid, blocked: snapshot.val() === true, loading: false, error: null }),
      (error) => setStatus({ uid: user.uid, blocked: false, loading: false, error }),
    );
  }, [user?.uid, retryKey]);

  return user?.uid === status.uid
    ? status
    : { blocked: false, loading: Boolean(database && user), error: null };
}

async function assertPostingAllowed(user) {
  if (!database || !user) throw new Error('Sign in to post.');
  const snapshot = await get(ref(database, `blockedUsers/${user.uid}`));
  if (snapshot.val() === true) {
    const error = new Error('Posting is disabled for this account. Contact league staff if you think this is a mistake.');
    error.code = 'community/blocked';
    throw error;
  }
}

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
  clearActivity();
  return signOut(auth);
}

export function getAuthorName(user) {
  return formatAuthorName(user?.displayName || user?.email?.split('@')[0]);
}

export async function publishMessage(gameId, user, text) {
  if (!database || !user) throw new Error('Sign in to post.');
  const cleanText = text.trim();
  if (!cleanText || cleanText.length > 500) throw new Error('Messages must be between 1 and 500 characters.');

  await assertPostingAllowed(user);
  consumeCommunityLimit(user.uid, 'post');

  return push(ref(database, `messages/${gameId}`), {
    authorUid: user.uid,
    author: getAuthorName(user),
    text: cleanText,
    timestamp: serverTimestamp(),
  });
}

export async function uploadPicture(file, user) {
  if (!user) throw new Error('Sign in to post photos.');
  if (!cloudinaryConfigured) throw new Error('Configure Cloudinary to enable photo uploads.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file?.type)) {
    throw new Error('Choose a JPG, PNG, or WebP image.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('The image must be 10 MB or smaller.');

  await assertPostingAllowed(user);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset);

  consumeCommunityLimit(user.uid, 'post');

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

  await assertPostingAllowed(user);
  return push(ref(database, `pictures/${gameId}`), {
    authorUid: user.uid,
    author: getAuthorName(user),
    url: picture.url,
    caption: picture.caption.trim().slice(0, 160),
    timestamp: serverTimestamp(),
  });
}

export async function deleteOwnCommunityItem(type, gameId, itemId, user) {
  if (!database || !user) throw new Error('Sign in to remove your content.');
  if (!['messages', 'pictures'].includes(type) || !gameId || !itemId) {
    throw new Error('This item could not be identified.');
  }

  return remove(ref(database, `${type}/${gameId}/${itemId}`));
}

export async function reportCommunityItem(type, gameId, itemId, user) {
  if (!database || !user) throw new Error('Sign in to report content.');
  if (!['messages', 'pictures'].includes(type) || !gameId || !itemId) {
    throw new Error('This item could not be identified.');
  }

  consumeCommunityLimit(user.uid, 'report');
  const reportRef = ref(database, `moderation/reports/${type}/${gameId}/${itemId}/${user.uid}`);
  await set(reportRef, {
    reason: 'community_guidelines',
    createdAt: serverTimestamp(),
    status: 'pending',
  });

  const hiddenRef = ref(database, `moderation/hidden/${type}/${gameId}/${itemId}`);
  const hidden = await get(hiddenRef);
  if (!hidden.exists()) {
    try {
      await set(hiddenRef, true);
    } catch (error) {
      if (!(await get(hiddenRef)).exists()) throw error;
    }
  }
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
