import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { auth, api } from './api';
import { UserProfile, UserRole } from './types';
import { Dashboard } from './Dashboard';
import { Chatbot } from './Chatbot';
import { Shield, LogIn, Loader2, Briefcase, GraduationCap, ArrowRight, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    const state = (this as any).state;
    const props = (this as any).props;

    if (state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(state.error?.message || "");
        if (parsed.error) errorMessage = `Firestore Error: ${parsed.error}`;
      } catch (e) {
        errorMessage = state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-red-50">
          <AlertTriangle className="text-red-600 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-red-900 mb-2">Application Error</h2>
          <p className="text-red-700 text-center max-w-md mb-6">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <TrustChainApp />
    </ErrorBoundary>
  );
}

function TrustChainApp() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profile = await api.getUser(currentUser.uid);
          setUserProfile(profile);
          setShowRoleSelection(false);
        } catch (error: any) {
          // Handle "User not found" by showing role selection
          // Other errors will be caught by ErrorBoundary if they are fatal
          console.log("Profile check:", error.message);
          setUserProfile(null);
          setShowRoleSelection(true);
        }
      } else {
        setUserProfile(null);
        setShowRoleSelection(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await auth.signInWithGoogle();
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
    }
  };

  const handleRoleSelection = async (role: UserRole) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const newProfile = await api.createUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role
      });
      setUserProfile(newProfile);
      setShowRoleSelection(false);
    } catch (error) {
      console.error("Role selection error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div 
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-white to-blue-50"
          >
            <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl mb-8">
              <Shield size={40} />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">SIH25200 TrustChain</h1>
            <p className="text-gray-500 text-lg mb-12 text-center max-w-md">
              The next generation of blockchain-verified credentials and AI-powered job matching.
            </p>
            
            <button 
              onClick={handleLogin}
              className="flex items-center gap-3 px-8 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
            >
              <LogIn className="text-indigo-600 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-gray-700">Sign in with Google</span>
            </button>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
              <FeatureCard 
                icon={<Shield className="text-indigo-600" />}
                title="Blockchain Verified"
                description="Immutable Keccak-256 hashing for every credential."
              />
              <FeatureCard 
                icon={<Briefcase className="text-indigo-600" />}
                title="AI Job Matching"
                description="CNN-verified skills matched with real-time job listings."
              />
              <FeatureCard 
                icon={<GraduationCap className="text-indigo-600" />}
                title="Smart Resumes"
                description="Generate professional PDFs with verified trust scores."
              />
            </div>
          </motion.div>
        ) : showRoleSelection ? (
          <motion.div 
            key="role-selection"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen flex flex-col items-center justify-center p-6"
          >
            <h2 className="text-3xl font-bold mb-2">Choose Your Path</h2>
            <p className="text-gray-500 mb-12">How will you be using the TrustChain platform?</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
              <RoleCard 
                icon={<GraduationCap size={40} />}
                title="Job Seeker"
                description="I want to verify my certificates, build a resume, and find jobs."
                onClick={() => handleRoleSelection('seeker')}
                color="bg-indigo-600"
              />
              <RoleCard 
                icon={<Briefcase size={40} />}
                title="Job Giver"
                description="I want to verify candidate hashes and find verified talent."
                onClick={() => handleRoleSelection('giver')}
                color="bg-emerald-600"
              />
            </div>
          </motion.div>
        ) : userProfile ? (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen"
          >
            <Dashboard userProfile={userProfile} onProfileUpdate={setUserProfile} />
            <Chatbot />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-sm">
    <div className="mb-4">{icon}</div>
    <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-500">{description}</p>
  </div>
);

const RoleCard: React.FC<{ icon: React.ReactNode; title: string; description: string; onClick: () => void; color: string }> = ({ icon, title, description, onClick, color }) => (
  <button 
    onClick={onClick}
    className="group bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all text-left flex flex-col h-full"
  >
    <div className={`w-16 h-16 ${color} text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-500 mb-8 flex-1">{description}</p>
    <div className="flex items-center gap-2 font-bold text-indigo-600 group-hover:gap-3 transition-all">
      Get Started <ArrowRight size={20} />
    </div>
  </button>
);
