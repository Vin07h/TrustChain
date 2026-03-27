import axios from 'axios';
import { UserProfile, Certificate, Job, UserRole } from './types';
import { 
  auth as firebaseAuth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  addDoc,
  deleteDoc
} from './firebase';

enum OperationType {
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
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const user = firebaseAuth.currentUser;
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: user?.uid,
      email: user?.email,
      emailVerified: user?.emailVerified,
      isAnonymous: user?.isAnonymous,
      tenantId: user?.tenantId,
      providerInfo: user?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  // Log the error for debugging
  if (errorMessage !== "User not found") {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }
}

export const auth = {
  get currentUser() {
    return firebaseAuth.currentUser;
  },
  onAuthStateChanged: (callback: (user: any) => void) => {
    return onAuthStateChanged(firebaseAuth, callback);
  },
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const user = result.user;
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      return { user, newUser: !userDoc.exists() };
    } catch (error) {
      console.error("Auth error:", error);
      throw error;
    }
  },
  signOut: async () => {
    await firebaseSignOut(firebaseAuth);
  }
};

export { 
  onSnapshot, 
  collection, 
  query, 
  where, 
  db 
} from './firebase';

export const api = {
  // User Management
  createUser: async (profile: Partial<UserProfile>): Promise<UserProfile> => {
    const uid = profile.uid || firebaseAuth.currentUser?.uid;
    if (!uid) throw new Error("No user ID provided");
    
    const path = `users/${uid}`;
    try {
      const profileWithTimestamp = {
        ...profile,
        uid,
        createdAt: new Date().toISOString(),
        skills: profile.skills || [],
        bio: profile.bio || ''
      } as UserProfile;
      await setDoc(doc(db, 'users', uid), profileWithTimestamp);
      return profileWithTimestamp;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  getUser: async (uid: string): Promise<UserProfile> => {
    const path = `users/${uid}`;
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) throw new Error("User not found");
      return userDoc.data() as UserProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      throw error;
    }
  },

  getSeekers: async (): Promise<UserProfile[]> => {
    const path = 'users';
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'seeker'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as UserProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      throw error;
    }
  },

  // Certificate Management
  uploadCertificate: async (cert: Partial<Certificate>): Promise<Certificate> => {
    const path = 'certificates';
    try {
      const newCert = {
        ...cert,
        createdAt: new Date().toISOString(),
        verified: cert.verified || false,
        trustScore: cert.trustScore || 0,
        keywords: cert.keywords || []
      };
      const docRef = await addDoc(collection(db, 'certificates'), newCert);
      return { id: docRef.id, ...newCert } as Certificate;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  getCertificates: async (seekerUid?: string): Promise<Certificate[]> => {
    const path = 'certificates';
    try {
      const q = seekerUid 
        ? query(collection(db, 'certificates'), where('seekerUid', '==', seekerUid))
        : collection(db, 'certificates');
      const snapshot = await getDocs(q as any);
      return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Certificate));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      throw error;
    }
  },

  verifyHash: async (hash: string): Promise<Certificate | null> => {
    const path = 'certificates';
    try {
      const q = query(collection(db, 'certificates'), where('certHash', '==', hash));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...(snapshot.docs[0].data() as any) } as Certificate;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      throw error;
    }
  },

  // CNN Verification Simulation (Still calling backend for AI logic)
  verifyCNN: async (url: string) => {
    const response = await axios.post('/api/verify-cnn', { certificateUrl: url });
    return response.data;
  },

  // Job Search (Now handled by geminiService)
  getJobs: async (_keywords: string): Promise<Job[]> => {
    return [];
  },

  // Chatbot (Now handled by geminiService)
  chat: async (_message: string): Promise<string> => {
    return "Please use the frontend chat service.";
  },

  // Notifications
  notify: async (toUid: string, toEmail: string, subject: string, body: string, fromName: string) => {
    const path = 'notifications';
    try {
      const fromUid = firebaseAuth.currentUser?.uid;
      if (!fromUid) throw new Error("Must be logged in to send notifications");
      
      const notification = {
        toUid,
        toEmail,
        fromUid,
        fromName,
        subject,
        body,
        read: false,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'notifications'), notification);
      
      // Also call the backend mock for console logging
      await axios.post('/api/notify', { to: toEmail, subject, body });
      
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  }
};
