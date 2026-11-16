import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { DayMateState } from '../types/daymate';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export async function signInWithGmail(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (name.trim()) {
    await updateProfile(result.user, { displayName: name.trim() });
  }
  try {
    await sendEmailVerification(result.user);
  } catch {
    // Verification email optional if rate-limited
  }
  return result.user;
}

export async function resetUserPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || `rec_${Date.now()}`;
}

function extractRecordsFromState(state: DayMateState): Array<{ id: string; kind: string; payload: Record<string, unknown> }> {
  const out: Array<{ id: string; kind: string; payload: Record<string, unknown> }> = [];
  const pushAll = (kind: string, items: Array<{ id: string }>) => {
    items.forEach((item) => {
      out.push({
        id: sanitizeId(`${kind}_${item.id}`),
        kind,
        payload: { ...item },
      });
    });
  };
  pushAll('task', state.tasks);
  pushAll('timetable', state.timetable);
  pushAll('event', state.calendarEvents);
  pushAll('attendance', state.attendance);
  pushAll('note', state.notes);
  pushAll('flashcard', state.flashcards);
  pushAll('session', state.studySessions);
  pushAll('exam', state.exams);
  pushAll('gpa', state.gpaCourses);
  pushAll('habit', state.habits);
  pushAll('expense', state.expenses);
  pushAll('bookmark', state.bookmarks);
  pushAll('assessment', state.assessments);
  pushAll('viva', state.vivaQuestions);
  pushAll('contact', state.contacts);
  pushAll('milestone', state.milestones);
  pushAll('timeblock', state.timeBlocks);
  return out;
}

export async function saveWorkspaceToCloud(user: User, state: DayMateState): Promise<void> {
  if (!user.emailVerified) return;
  const uid = sanitizeId(user.uid);
  const profilePath = `users/${uid}/private/profile`;
  const profileRef = doc(db, 'users', uid, 'private', 'profile');

  try {
    const existingSnap = await getDoc(profileRef);
    const createdAtValue = existingSnap.exists() ? existingSnap.data().createdAt : serverTimestamp();
    await setDoc(profileRef, {
      ownerId: user.uid,
      name: (state.profile.name || user.displayName || 'Student').slice(0, 120),
      email: (state.profile.email || user.email || 'student@example.com').slice(0, 160),
      rollNumber: (state.profile.rollNumber || '').slice(0, 40),
      course: (state.profile.course || '').slice(0, 120),
      semester: (state.profile.semester || '').slice(0, 40),
      section: (state.profile.section || '').slice(0, 40),
      college: (state.profile.college || '').slice(0, 160),
      facultyMentor: (state.profile.facultyMentor || '').slice(0, 120),
      academicYear: (state.profile.academicYear || '').slice(0, 32),
      monthlyBudget: Number(state.profile.monthlyBudget) || 0,
      previousCredits: Number(state.profile.previousCredits) || 0,
      previousCgpa: Number(state.profile.previousCgpa) || 0,
      scratchpad: (state.scratchpad || '').slice(0, 8000),
      theme: state.theme,
      createdAt: createdAtValue,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, profilePath);
  }

  const recordsPath = `users/${uid}/records`;
  const recordsCol = collection(db, 'users', uid, 'records');

  try {
    const existingDocs = await getDocs(recordsCol);
    const desired = extractRecordsFromState(state);
    const desiredIds = new Set(desired.map((d) => d.id));
    const existingMap = new Map<string, unknown>();
    existingDocs.forEach((snap) => {
      existingMap.set(snap.id, snap.data().createdAt);
    });

    // Delete removed records
    for (const snap of existingDocs.docs) {
      if (!desiredIds.has(snap.id)) {
        await deleteDoc(snap.ref);
      }
    }

    // Batch upsert in chunks of 400
    for (let i = 0; i < desired.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = desired.slice(i, i + 400);
      chunk.forEach((rec) => {
        const ref = doc(db, 'users', uid, 'records', rec.id);
        const existingCreatedAt = existingMap.get(rec.id);
        batch.set(ref, {
          ownerId: user.uid,
          kind: rec.kind,
          payload: rec.payload,
          createdAt: existingCreatedAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, recordsPath);
  }
}

export async function loadWorkspaceFromCloud(
  user: User,
  baseState: DayMateState,
): Promise<DayMateState | null> {
  if (!user.emailVerified) return null;
  const uid = sanitizeId(user.uid);
  const profilePath = `users/${uid}/private/profile`;

  try {
    const profileSnap = await getDoc(doc(db, 'users', uid, 'private', 'profile'));
    if (!profileSnap.exists()) {
      return null;
    }

    const pData = profileSnap.data();
    const recordsSnap = await getDocs(collection(db, 'users', uid, 'records'));

    const buckets: Record<string, Array<Record<string, unknown>>> = {
      task: [],
      timetable: [],
      event: [],
      attendance: [],
      note: [],
      flashcard: [],
      session: [],
      exam: [],
      gpa: [],
      habit: [],
      expense: [],
      bookmark: [],
      assessment: [],
      viva: [],
      contact: [],
      milestone: [],
      timeblock: [],
    };

    recordsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (typeof data.kind === 'string' && data.kind in buckets && data.payload) {
        buckets[data.kind].push(data.payload as Record<string, unknown>);
      }
    });

    return {
      ...baseState,
      isAuthenticated: true,
      theme: pData.theme === 'dark' ? 'dark' : 'light',
      scratchpad: typeof pData.scratchpad === 'string' ? pData.scratchpad : baseState.scratchpad,
      profile: {
        ...baseState.profile,
        id: user.uid,
        name: String(pData.name || user.displayName || baseState.profile.name),
        email: String(pData.email || user.email || baseState.profile.email),
        rollNumber: String(pData.rollNumber ?? baseState.profile.rollNumber),
        course: String(pData.course ?? baseState.profile.course),
        semester: String(pData.semester ?? baseState.profile.semester),
        section: String(pData.section ?? baseState.profile.section),
        college: String(pData.college ?? baseState.profile.college),
        facultyMentor: String(pData.facultyMentor ?? baseState.profile.facultyMentor),
        academicYear: String(pData.academicYear ?? baseState.profile.academicYear),
        monthlyBudget: Number(pData.monthlyBudget ?? baseState.profile.monthlyBudget),
        previousCredits: Number(pData.previousCredits ?? baseState.profile.previousCredits),
        previousCgpa: Number(pData.previousCgpa ?? baseState.profile.previousCgpa),
        photoURL: user.photoURL || undefined,
        authProvider: user.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
      },
      tasks: buckets.task as unknown as DayMateState['tasks'],
      timetable: buckets.timetable as unknown as DayMateState['timetable'],
      calendarEvents: buckets.event as unknown as DayMateState['calendarEvents'],
      attendance: buckets.attendance as unknown as DayMateState['attendance'],
      notes: buckets.note as unknown as DayMateState['notes'],
      flashcards: buckets.flashcard as unknown as DayMateState['flashcards'],
      studySessions: buckets.session as unknown as DayMateState['studySessions'],
      exams: buckets.exam as unknown as DayMateState['exams'],
      gpaCourses: buckets.gpa as unknown as DayMateState['gpaCourses'],
      habits: buckets.habit as unknown as DayMateState['habits'],
      expenses: buckets.expense as unknown as DayMateState['expenses'],
      bookmarks: buckets.bookmark as unknown as DayMateState['bookmarks'],
      assessments: buckets.assessment as unknown as DayMateState['assessments'],
      vivaQuestions: buckets.viva as unknown as DayMateState['vivaQuestions'],
      contacts: buckets.contact as unknown as DayMateState['contacts'],
      milestones: buckets.milestone as unknown as DayMateState['milestones'],
      timeBlocks: buckets.timeblock as unknown as DayMateState['timeBlocks'],
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, profilePath);
  }
}
