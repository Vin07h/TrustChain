import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Upload, 
  Search, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  User, 
  Briefcase,
  Hash,
  ArrowRight,
  Loader2,
  LogOut,
  X,
  Printer,
  Download,
  Menu,
  Mail,
  Phone,
  MapPin,
  Info
} from 'lucide-react';
import { 
  auth, 
  api, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  db 
} from './api';
import { UserProfile, Certificate, Job, ExperienceEntry, EducationEntry, ProjectEntry } from './types';
import { ResumeBuilder } from './ResumeBuilder';
import { motion, AnimatePresence } from 'motion/react';
import { ethers } from 'ethers';
import { cn } from './lib/utils';
import { geminiService } from './services/geminiService';

interface DashboardProps {
  userProfile: UserProfile;
  onProfileUpdate?: (profile: UserProfile) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userProfile, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'certificates' | 'jobs' | 'candidates' | 'verify' | 'resume' | 'about'>('overview');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [verifyHash, setVerifyHash] = useState('');
  const [selectedVerifyFile, setSelectedVerifyFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ exists: boolean; details?: any } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [certDescription, setCertDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [resumeProfile, setResumeProfile] = useState<UserProfile>(userProfile);
  const [selectedCertIds, setSelectedCertIds] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<UserProfile | null>(null);
  const [candidateCertificates, setCandidateCertificates] = useState<Certificate[]>([]);
  const [isNotifying, setIsNotifying] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);

  // 1. Fetch Certificates for Seeker (Real-time)
  useEffect(() => {
    if (userProfile.role === 'seeker') {
      const q = query(collection(db, 'certificates'), where('seekerUid', '==', userProfile.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const certs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certificate));
        setCertificates(certs);
        // Initially select all verified certificates
        setSelectedCertIds(certs.filter(c => c.verified).map(c => c.id));
      }, (error) => {
        console.error("Firestore error in Dashboard:", error);
      });
      return () => unsubscribe();
    }
  }, [userProfile.uid, userProfile.role]);

  // Update resumeProfile when userProfile prop changes
  useEffect(() => {
    setResumeProfile(userProfile);
  }, [userProfile]);

  // 2. Fetch Candidates for Giver (Real-time)
  useEffect(() => {
    if (userProfile.role === 'giver') {
      const q = query(collection(db, 'users'), where('role', '==', 'seeker'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const seekers = snapshot.docs.map(doc => doc.data() as UserProfile);
        setCandidates(seekers);
      }, (error) => {
        console.error("Firestore error fetching candidates:", error);
      });
      return () => unsubscribe();
    }
  }, [userProfile.role]);

  const refreshJobs = async () => {
    if (userProfile.role === 'seeker' && certificates.length > 0) {
      setIsLoadingJobs(true);
      try {
        const keywords = Array.from(new Set(certificates.flatMap(c => c.keywords))).join(',');
        if (keywords) {
          const jobsData = await geminiService.searchJobs(keywords);
          setJobs(jobsData);
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setIsLoadingJobs(false);
      }
    }
  };

  // 3. Fetch Jobs based on Keywords
  useEffect(() => {
    if (userProfile.role === 'seeker' && certificates.length > 0 && jobs.length === 0) {
      refreshJobs();
    }
  }, [certificates, userProfile.role]);

  const optimizeImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = base64Str;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Hash copied to clipboard!");
  };

  const handleStartUpload = async () => {
    if (!selectedFile || !certDescription.trim()) return;

    setIsUploading(true);
    setIsUploadModalOpen(false);
    try {
      // 1. Convert file to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
      
      let downloadUrl = await base64Promise;

      // 1.1 Optimize if it's an image
      if (selectedFile.type.startsWith('image/')) {
        downloadUrl = await optimizeImage(downloadUrl);
      }

      // 2. AI Analysis via Gemini (replacing mock verifyCNN)
      const analysis = await geminiService.analyzeCertificate(downloadUrl, userProfile.displayName);
      
      if (!analysis.nameMatch) {
        alert(`Verification Failed: The name on the certificate ("${analysis.extractedName}") does not match your profile name ("${userProfile.displayName}"). Please ensure you are uploading your own certificates.`);
        setIsUploading(false);
        return;
      }

      // 3. Blockchain Hashing
      const certHash = ethers.keccak256(ethers.toUtf8Bytes(downloadUrl));

      // 4. Extract Keywords from User Description using Gemini
      const keywords = await geminiService.extractKeywords(certDescription);

      // 5. Save via API
      const newCert: Partial<Certificate> = {
        seekerUid: userProfile.uid,
        seekerName: userProfile.displayName,
        title: selectedFile.name.split('.')[0],
        imageUrl: downloadUrl,
        trustScore: analysis.trustScore,
        certHash,
        verified: analysis.verified,
        keywords: keywords.length > 0 ? keywords : ["General"],
      };

      await api.uploadCertificate(newCert);
      
      // Refresh certificates
      const certs = await api.getCertificates(userProfile.uid);
      setCertificates(certs);
      
      // Reset state
      setCertDescription('');
      setSelectedFile(null);

    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload and verify certificate.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleSaveResume = async () => {
    try {
      const updated = await api.createUser(resumeProfile);
      if (onProfileUpdate) onProfileUpdate(updated);
      setIsEditingResume(false);
    } catch (error) {
      console.error("Error saving resume profile:", error);
      alert("Failed to save profile changes.");
    }
  };

  const handleVerifyHash = async () => {
    if (!verifyHash && !selectedVerifyFile) return;
    setIsVerifying(true);
    try {
      let hashToVerify = verifyHash;

      if (selectedVerifyFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedVerifyFile);
        });
        let base64 = await base64Promise;

        // Optimize if it's an image to match the upload process
        if (selectedVerifyFile.type.startsWith('image/')) {
          base64 = await optimizeImage(base64);
        }

        hashToVerify = ethers.keccak256(ethers.toUtf8Bytes(base64));
      }

      const result = await api.verifyHash(hashToVerify);
      setVerificationResult(result ? { exists: true, details: result } : { exists: false });
    } catch (error) {
      console.error("Verification error:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  const toggleCertSelection = (id: string) => {
    setSelectedCertIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const addExperience = () => {
    const newExp: ExperienceEntry = {
      id: Math.random().toString(36).substr(2, 9),
      company: 'New Company',
      role: 'Role',
      duration: 'Dates',
      description: 'Job description...'
    };
    setResumeProfile(prev => ({
      ...prev,
      experienceList: [...(prev.experienceList || []), newExp]
    }));
  };

  const removeExperience = (id: string) => {
    setResumeProfile(prev => ({
      ...prev,
      experienceList: (prev.experienceList || []).filter(e => e.id !== id)
    }));
  };

  const updateExperience = (id: string, field: keyof ExperienceEntry, value: string) => {
    setResumeProfile(prev => ({
      ...prev,
      experienceList: (prev.experienceList || []).map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  const addEducation = () => {
    const newEdu: EducationEntry = {
      id: Math.random().toString(36).substr(2, 9),
      institution: 'University/School',
      degree: 'Degree',
      year: 'Year'
    };
    setResumeProfile(prev => ({
      ...prev,
      educationList: [...(prev.educationList || []), newEdu]
    }));
  };

  const removeEducation = (id: string) => {
    setResumeProfile(prev => ({
      ...prev,
      educationList: (prev.educationList || []).filter(e => e.id !== id)
    }));
  };

  const updateEducation = (id: string, field: keyof EducationEntry, value: string) => {
    setResumeProfile(prev => ({
      ...prev,
      educationList: (prev.educationList || []).map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  const addProject = () => {
    const newProj: ProjectEntry = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Project Title',
      description: 'Project description...',
      link: 'https://github.com/...'
    };
    setResumeProfile(prev => ({
      ...prev,
      projectList: [...(prev.projectList || []), newProj]
    }));
  };

  const removeProject = (id: string) => {
    setResumeProfile(prev => ({
      ...prev,
      projectList: (prev.projectList || []).filter(p => p.id !== id)
    }));
  };

  const updateProject = (id: string, field: keyof ProjectEntry, value: string) => {
    setResumeProfile(prev => ({
      ...prev,
      projectList: (prev.projectList || []).map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const addManualSkill = (skill: string) => {
    if (!skill.trim()) return;
    setResumeProfile(prev => ({
      ...prev,
      manualSkills: [...(prev.manualSkills || []), skill.trim()]
    }));
  };

  const removeManualSkill = (skill: string) => {
    setResumeProfile(prev => ({
      ...prev,
      manualSkills: (prev.manualSkills || []).filter(s => s !== skill)
    }));
  };

  const handleViewCandidate = async (candidate: UserProfile) => {
    setSelectedCandidate(candidate);
    setNotificationSent(false);
    try {
      const certs = await api.getCertificates(candidate.uid);
      setCandidateCertificates(certs);
    } catch (error) {
      console.error("Error fetching candidate certificates:", error);
    }
  };

  const handleContactCandidate = async () => {
    if (!selectedCandidate) return;
    setIsNotifying(true);
    try {
      const subject = `TrustChain: ${userProfile.displayName} is interested in your profile`;
      const body = `Hello ${selectedCandidate.displayName},\n\n${userProfile.displayName} from SIH25200 TrustChain has viewed your verified profile and is interested in connecting with you regarding potential opportunities.\n\nYou can reach out to them at ${userProfile.email}.\n\nBest regards,\nSIH25200 TrustChain Team`;
      
      await api.notify(selectedCandidate.uid, selectedCandidate.email, subject, body, userProfile.displayName);
      setNotificationSent(true);
    } catch (error) {
      console.error("Error sending notification:", error);
    } finally {
      setIsNotifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row print:bg-white">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-40 print:hidden">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
          <Shield size={24} />
          <span>TrustChain</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 print:hidden",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
            <Shield size={28} />
            <span>TrustChain</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem 
            icon={<Briefcase size={20} />} 
            label="Overview" 
            active={activeTab === 'overview'} 
            onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }} 
          />
          {userProfile.role === 'seeker' ? (
            <>
              <SidebarItem 
                icon={<User size={20} />} 
                label="My Profile" 
                active={activeTab === 'resume'} 
                onClick={() => { setActiveTab('resume'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={<FileText size={20} />} 
                label="My Certificates" 
                active={activeTab === 'certificates'} 
                onClick={() => { setActiveTab('certificates'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={<Search size={20} />} 
                label="Internet Jobs" 
                active={activeTab === 'jobs'} 
                onClick={() => { setActiveTab('jobs'); setIsSidebarOpen(false); }} 
              />
            </>
          ) : (
            <>
              <SidebarItem 
                icon={<User size={20} />} 
                label="Candidates" 
                active={activeTab === 'candidates'} 
                onClick={() => { setActiveTab('candidates'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={<Hash size={20} />} 
                label="Hash Verifier" 
                active={activeTab === 'verify'} 
                onClick={() => { setActiveTab('verify'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={<Info size={20} />} 
                label="About TrustChain" 
                active={activeTab === 'about'} 
                onClick={() => { setActiveTab('about'); setIsSidebarOpen(false); }} 
              />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              {userProfile?.displayName?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userProfile?.displayName || 'User'}</p>
              <p className="text-xs text-gray-500 capitalize">{userProfile?.role || 'Role'}</p>
            </div>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Welcome back, {(userProfile?.displayName || 'User').split(' ')[0]}!</h1>
            <p className="text-sm text-gray-500">Manage your {userProfile?.role === 'seeker' ? 'credentials and career' : 'hiring pipeline'} with TrustChain.</p>
          </div>
          {userProfile?.role === 'seeker' && (
            <div className="flex items-center gap-2">
              {/* Other header actions could go here */}
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <StatCard 
                title={userProfile.role === 'seeker' ? "Verified Certs" : "Total Candidates"} 
                value={userProfile.role === 'seeker' ? certificates.filter(c => c.verified).length : candidates.length} 
                icon={<CheckCircle className="text-green-500" />} 
              />
              <StatCard 
                title={userProfile.role === 'seeker' ? "Trust Score Avg" : "Verified Skills"} 
                value={userProfile.role === 'seeker' 
                  ? (certificates.length > 0 ? Math.round(certificates.reduce((acc, c) => acc + c.trustScore, 0) / certificates.length) : 0) + "%"
                  : Array.from(new Set(candidates.flatMap(c => c.skills || []))).length
                } 
                icon={<Shield className="text-indigo-500" />} 
              />
              <StatCard 
                title={userProfile.role === 'seeker' ? "Live Job Matches" : "Hash Verifications"} 
                value={userProfile.role === 'seeker' ? jobs.length : "24"} 
                icon={<Briefcase className="text-orange-500" />} 
              />

              <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {userProfile.role === 'seeker' ? (
                    certificates.length > 0 ? (
                      certificates.slice(0, 3).map(cert => (
                        <ActivityItem 
                          key={cert.id}
                          title={`Certificate Uploaded: ${cert.title}`}
                          time={new Date(cert.createdAt).toLocaleDateString()}
                          status={cert.verified ? 'Verified' : 'Pending'}
                        />
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No recent activity. Upload your first certificate!</p>
                    )
                  ) : (
                    candidates.slice(0, 3).map(cand => (
                      <ActivityItem 
                        key={cand.uid}
                        title={`New Candidate: ${cand.displayName}`}
                        time="Today"
                        status="Profile Ready"
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="bg-indigo-600 p-6 rounded-xl shadow-lg text-white flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg mb-2">TrustChain Tip</h3>
                  <p className="text-indigo-100 text-sm">
                    {userProfile.role === 'seeker' 
                      ? "Verified certificates increase your visibility to employers by 4x." 
                      : "Use the Hash Verifier to instantly confirm a candidate's digital credentials."}
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab('about')}
                  className="mt-4 flex items-center gap-2 text-sm font-medium hover:gap-3 transition-all"
                >
                  Learn more <ArrowRight size={16} />
                </button>
              </div>

              {userProfile.role === 'seeker' && (
                <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg">My Profile Summary</h3>
                    <button 
                      onClick={() => setActiveTab('resume')}
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      Edit Profile <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Professional Bio</h4>
                      <p className="text-gray-700 leading-relaxed">
                        {userProfile.bio || "No bio set yet. Head over to 'My Profile' to write one!"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Top Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set([
                          ...(userProfile.skills || []),
                          ...(userProfile.manualSkills || [])
                        ])).slice(0, 8).map(skill => (
                          <span key={skill} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold uppercase border border-indigo-100">
                            {skill}
                          </span>
                        ))}
                        {(!userProfile.skills?.length && !userProfile.manualSkills?.length) && (
                          <p className="text-xs text-gray-400 italic">No skills added yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'certificates' && userProfile.role === 'seeker' && (
            <motion.div 
              key="certificates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <h2 className="text-xl font-bold">My Certificates</h2>
                <button 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="w-full lg:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Upload size={18} />
                  {isUploading ? "Uploading..." : "Upload New"}
                </button>
              </div>

              {isUploading && (
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-center gap-4">
                  <Loader2 className="animate-spin text-indigo-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-900">Processing Certificate...</p>
                    <p className="text-xs text-indigo-600">Our CNN model is analyzing the layout and signatures.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certificates.map(cert => (
                  <div key={cert.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="aspect-video bg-gray-100 relative flex items-center justify-center overflow-hidden">
                      {cert.imageUrl.startsWith('data:application/pdf') ? (
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <FileText size={48} />
                          <span className="text-[10px] font-bold uppercase">PDF Document</span>
                        </div>
                      ) : (
                        <img 
                          src={cert.imageUrl} 
                          alt={cert.title} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            console.error("Image load error:", cert.title);
                            (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=Image+Error";
                          }}
                        />
                      )}
                      <div className={cn(
                        "absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                        cert.verified ? "bg-green-500 text-white" : "bg-orange-500 text-white"
                      )}>
                        {cert.verified ? "Verified" : "Pending"}
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-gray-900 mb-1">{cert.title}</h4>
                      <div className="flex items-center gap-2 mb-3">
                        <Shield size={14} className="text-indigo-600" />
                        <span className="text-xs text-gray-500">Trust Score: {cert.trustScore}%</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {cert.keywords.map(kw => (
                          <span key={kw} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{kw}</span>
                        ))}
                      </div>
                        <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                          <button 
                            onClick={() => copyToClipboard(cert.certHash)}
                            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-600 transition-colors group"
                            title="Click to copy full hash"
                          >
                            <Hash size={12} />
                            <span className="truncate w-24 group-hover:underline">{cert.certHash}</span>
                          </button>
                          <button 
                            onClick={() => window.open(cert.imageUrl, '_blank')}
                            className="text-indigo-600 hover:text-indigo-700 p-1 hover:bg-indigo-50 rounded transition-colors"
                            title="View Certificate"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'jobs' && userProfile.role === 'seeker' && (
            <motion.div 
              key="jobs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                  <h2 className="text-xl font-bold">Live Jobs from Web</h2>
                  <p className="text-sm text-gray-500">Based on your verified certificate keywords: {Array.from(new Set(certificates.flatMap(c => c.keywords))).join(', ')}</p>
                </div>
                <button 
                  onClick={refreshJobs}
                  disabled={isLoadingJobs}
                  className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <Loader2 className={cn("w-4 h-4", isLoadingJobs && "animate-spin")} />
                  Refresh Jobs
                </button>
              </div>

              {isLoadingJobs ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="animate-spin text-indigo-600" size={40} />
                  <p className="text-gray-500">Searching the internet for matching jobs...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {jobs.length > 0 ? (
                    jobs.map(job => (
                      <div key={job.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-200 transition-colors">
                        <div>
                          <h4 className="font-bold text-lg text-gray-900">{job.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1"><Briefcase size={14} /> {job.company}</span>
                            <span className="flex items-center gap-1"><Search size={14} /> {job.location}</span>
                            {job.platform && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase">{job.platform}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{job.description}</p>
                          <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 font-mono truncate max-w-[300px]">
                            <ExternalLink size={10} />
                            {job.link}
                          </div>
                        </div>
                        <a 
                          href={job.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                        >
                          Apply Now <ExternalLink size={16} />
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white p-12 rounded-xl border border-dashed border-gray-200 text-center">
                      <Search className="mx-auto text-gray-300 mb-4" size={48} />
                      <h3 className="text-lg font-bold text-gray-900">No live jobs found</h3>
                      <p className="text-gray-500 max-w-xs mx-auto mt-2">
                        We couldn't find any direct job links for your current keywords. Try uploading more certificates or refreshing.
                      </p>
                      <button 
                        onClick={refreshJobs}
                        className="mt-6 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'resume' && userProfile.role === 'seeker' && (
            <motion.div 
              key="resume"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                  <h2 className="text-xl font-bold">My Professional Profile</h2>
                  <p className="text-sm text-gray-500">Manage your bio, skills, and generate a verified resume.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setIsEditingResume(!isEditingResume)}
                    className={cn(
                      "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      isEditingResume ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {isEditingResume ? <CheckCircle size={18} /> : <User size={18} />}
                    {isEditingResume ? "Done Editing" : "Edit Profile"}
                  </button>
                  {isEditingResume && (
                    <button 
                      onClick={handleSaveResume}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Save Changes
                    </button>
                  )}
                  <ResumeBuilder user={resumeProfile} certificates={certificates.filter(c => selectedCertIds.includes(c.id))} />
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                  >
                    <Printer size={18} />
                    Print / Save PDF
                  </button>
                </div>
              </div>

              <div id="resume-content" className="bg-white p-6 md:p-10 rounded-2xl shadow-xl border border-gray-100 max-w-4xl mx-auto print:shadow-none print:border-none print:p-0">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-indigo-600 pb-8 mb-8">
                  <div className="flex-1 w-full">
                    {isEditingResume ? (
                      <input 
                        type="text" 
                        value={resumeProfile.displayName}
                        onChange={(e) => setResumeProfile({...resumeProfile, displayName: e.target.value})}
                        className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight w-full bg-gray-50 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">{resumeProfile.displayName}</h1>
                    )}
                    <p className="text-indigo-600 font-bold text-base md:text-lg mt-1 uppercase tracking-wider">Verified Professional</p>
                    <div className="flex flex-wrap gap-4 mt-4 text-xs md:text-sm text-gray-600">
                      <span className="flex items-center gap-1"><FileText size={14} /> {resumeProfile.email}</span>
                      {isEditingResume ? (
                        <input 
                          type="text" 
                          placeholder="Contact Number"
                          value={resumeProfile.contact || ''}
                          onChange={(e) => setResumeProfile({...resumeProfile, contact: e.target.value})}
                          className="bg-gray-50 px-2 py-1 rounded border border-gray-200 focus:outline-none"
                        />
                      ) : (
                        userProfile.contact && <span className="flex items-center gap-1"><Briefcase size={14} /> {userProfile.contact}</span>
                      )}
                      <span className="flex items-center gap-1"><Shield size={14} /> Trust Score: {certificates.length > 0 ? Math.round(certificates.reduce((acc, c) => acc + c.trustScore, 0) / certificates.length) : 0}%</span>
                    </div>
                  </div>
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border-2 border-indigo-100 shrink-0">
                    <Shield size={40} className="md:w-12 md:h-12" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {/* Derived Skills */}
                        {Array.from(new Set(certificates.filter(c => selectedCertIds.includes(c.id)).flatMap(c => c.keywords))).map(skill => (
                          <span key={skill} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">{skill}</span>
                        ))}
                        {/* Manual Skills */}
                        {(resumeProfile.manualSkills || []).map(skill => (
                          <span key={skill} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold flex items-center gap-1 group">
                            {skill}
                            {isEditingResume && (
                              <button onClick={() => removeManualSkill(skill)} className="text-gray-400 hover:text-red-500">
                                <X size={12} />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                      {isEditingResume && (
                        <div className="mt-4 flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Add skill..."
                            className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addManualSkill((e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                        </div>
                      )}
                      {isEditingResume && (
                        <p className="text-[10px] text-gray-400 mt-2 italic">Skills are derived from selected certificates or added manually.</p>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Education</h3>
                      <div className="space-y-4">
                        {(resumeProfile.educationList || []).map(edu => (
                          <div key={edu.id} className="relative group">
                            {isEditingResume ? (
                              <div className="space-y-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                <input 
                                  value={edu.institution}
                                  onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                                  className="text-xs font-bold w-full bg-transparent focus:outline-none"
                                  placeholder="Institution"
                                />
                                <input 
                                  value={edu.degree}
                                  onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                                  className="text-[10px] w-full bg-transparent focus:outline-none"
                                  placeholder="Degree"
                                />
                                <input 
                                  value={edu.year}
                                  onChange={(e) => updateEducation(edu.id, 'year', e.target.value)}
                                  className="text-[10px] text-gray-500 w-full bg-transparent focus:outline-none"
                                  placeholder="Year"
                                />
                                <button 
                                  onClick={() => removeEducation(edu.id)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ) : (
                              <div>
                                <p className="text-xs font-bold text-gray-900">{edu.institution}</p>
                                <p className="text-[10px] text-gray-600">{edu.degree}</p>
                                <p className="text-[10px] text-gray-400">{edu.year}</p>
                              </div>
                            )}
                          </div>
                        ))}
                        {isEditingResume && (
                          <button 
                            onClick={addEducation}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            + Add Education
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Projects</h3>
                      <div className="space-y-4">
                        {(resumeProfile.projectList || []).map(proj => (
                          <div key={proj.id} className="relative group">
                            {isEditingResume ? (
                              <div className="space-y-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                <input 
                                  value={proj.title}
                                  onChange={(e) => updateProject(proj.id, 'title', e.target.value)}
                                  className="text-xs font-bold w-full bg-transparent focus:outline-none"
                                  placeholder="Project Title"
                                />
                                <input 
                                  value={proj.link || ''}
                                  onChange={(e) => updateProject(proj.id, 'link', e.target.value)}
                                  className="text-[10px] text-indigo-600 w-full bg-transparent focus:outline-none"
                                  placeholder="Link (Optional)"
                                />
                                <textarea 
                                  value={proj.description}
                                  onChange={(e) => updateProject(proj.id, 'description', e.target.value)}
                                  className="text-[10px] text-gray-600 w-full bg-transparent focus:outline-none min-h-[40px]"
                                  placeholder="Description"
                                />
                                <button 
                                  onClick={() => removeProject(proj.id)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ) : (
                              <div>
                                <p className="text-xs font-bold text-gray-900">{proj.title}</p>
                                {proj.link && <p className="text-[10px] text-indigo-600 truncate">{proj.link}</p>}
                                <p className="text-[10px] text-gray-600 mt-1">{proj.description}</p>
                              </div>
                            )}
                          </div>
                        ))}
                        {isEditingResume && (
                          <button 
                            onClick={addProject}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            + Add Project
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Trust Verification</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-green-600 font-bold">
                          <CheckCircle size={14} /> CNN Verified Assets
                        </div>
                        <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold">
                          <Hash size={14} /> Blockchain Hashed
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-8">
                    <div>
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Professional Summary</h3>
                      {isEditingResume ? (
                        <textarea 
                          value={resumeProfile.bio || ''}
                          onChange={(e) => setResumeProfile({...resumeProfile, bio: e.target.value})}
                          placeholder="Write a professional summary..."
                          className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
                        />
                      ) : (
                        <p className="text-gray-700 leading-relaxed">
                          {resumeProfile.bio || `A dedicated professional with a focus on ${Array.from(new Set(certificates.flatMap(c => c.keywords))).slice(0, 3).join(', ')}. Proven track record of verified skills backed by TrustChain's blockchain verification system.`}
                        </p>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Experience</h3>
                      <div className="space-y-6">
                        {(resumeProfile.experienceList || []).map(exp => (
                          <div key={exp.id} className="relative group">
                            {isEditingResume ? (
                              <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex justify-between">
                                  <input 
                                    value={exp.role}
                                    onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                                    className="font-bold text-gray-900 bg-transparent focus:outline-none w-full"
                                    placeholder="Job Title / Role"
                                  />
                                  <input 
                                    value={exp.duration}
                                    onChange={(e) => updateExperience(exp.id, 'duration', e.target.value)}
                                    className="text-xs text-indigo-600 font-bold bg-transparent focus:outline-none text-right"
                                    placeholder="Duration (e.g. 2020 - Present)"
                                  />
                                </div>
                                <input 
                                  value={exp.company}
                                  onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                                  className="text-sm text-gray-600 bg-transparent focus:outline-none w-full"
                                  placeholder="Company Name"
                                />
                                <textarea 
                                  value={exp.description}
                                  onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                                  className="text-sm text-gray-700 bg-transparent focus:outline-none w-full min-h-[80px] mt-2"
                                  placeholder="Describe your responsibilities and achievements..."
                                />
                                <button 
                                  onClick={() => removeExperience(exp.id)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div className="flex justify-between items-start">
                                  <h4 className="font-bold text-gray-900">{exp.role}</h4>
                                  <span className="text-xs text-indigo-600 font-bold">{exp.duration}</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{exp.company}</p>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {isEditingResume && (
                          <button 
                            onClick={addExperience}
                            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-all font-bold text-sm"
                          >
                            + Add Experience Item
                          </button>
                        )}

                        {/* Backward Compatibility Experience Field */}
                        {!isEditingResume && resumeProfile.experience && !resumeProfile.experienceList?.length && (
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {resumeProfile.experience}
                          </p>
                        )}
                        {isEditingResume && !resumeProfile.experienceList?.length && (
                           <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-4">
                             <p className="text-xs text-orange-700">
                               Tip: Use the "Add Experience Item" button above to create structured entries. 
                               Your old experience text is still saved but won't show in the new layout.
                             </p>
                           </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                        {isEditingResume ? "Select Certificates to Include" : "Verified Credentials"}
                      </h3>
                      <div className="space-y-6">
                        {certificates.map(cert => (
                          <div 
                            key={cert.id} 
                            onClick={() => isEditingResume && toggleCertSelection(cert.id)}
                            className={cn(
                              "relative pl-6 border-l-2 transition-all",
                              selectedCertIds.includes(cert.id) ? "border-indigo-600 opacity-100" : "border-gray-100 opacity-40",
                              isEditingResume && "cursor-pointer hover:border-indigo-400"
                            )}
                          >
                            <div className={cn(
                              "absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2",
                              selectedCertIds.includes(cert.id) ? "border-indigo-600" : "border-gray-200"
                            )}></div>
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-gray-900">{cert.title}</h4>
                              <div className="flex gap-2">
                                {cert.verified && <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase">Verified</span>}
                                <button 
                                  onClick={() => window.open(cert.imageUrl, '_blank')}
                                  className="text-indigo-600 hover:text-indigo-700"
                                  title="View Certificate"
                                >
                                  <ExternalLink size={12} />
                                </button>
                                {isEditingResume && (
                                  <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center",
                                    selectedCertIds.includes(cert.id) ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300"
                                  )}>
                                    {selectedCertIds.includes(cert.id) && <CheckCircle size={10} />}
                                  </div>
                                )}
                              </div>
                            </div>
                            <p 
                              className="text-xs text-gray-500 mt-1 cursor-pointer hover:text-indigo-600 transition-colors" 
                              onClick={() => copyToClipboard(cert.certHash)}
                              title="Click to copy full hash"
                            >
                              Trust Score: {cert.trustScore}% • Hash: {cert.certHash.substring(0, 16)}...
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                    Generated by TrustChain SIH25200 • Digital Signature Verified
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'candidates' && userProfile.role === 'giver' && (
            <motion.div 
              key="candidates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <h2 className="text-xl font-bold">Potential Candidate Suggestions</h2>
                <div className="flex gap-2 w-full lg:w-auto">
                  <input 
                    type="text" 
                    placeholder="Filter by skills (e.g. Java)..." 
                    className="w-full lg:w-64 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {candidates.map(cand => (
                  <div key={cand.uid} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                        {cand.displayName[0]}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-900">{cand.displayName}</h4>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{cand.bio || 'No bio provided.'}</p>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {(cand.skills || []).map(skill => (
                            <span key={skill} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase">{skill}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center">
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle size={12} /> Blockchain Verified
                      </span>
                      <button 
                        onClick={() => handleViewCandidate(cand)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        View Profile <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'verify' && userProfile.role === 'giver' && (
            <motion.div 
              key="verify"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto space-y-8 py-10"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Certificate Verifier</h2>
                <p className="text-gray-500 mt-2">Upload a certificate file to verify if it was issued and verified through TrustChain.</p>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <div 
                  onClick={() => document.getElementById('verify-file-input')?.click()}
                  className={cn(
                    "w-full py-12 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 transition-all cursor-pointer",
                    selectedVerifyFile ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                  )}
                >
                  <input 
                    id="verify-file-input"
                    type="file" 
                    className="hidden" 
                    onChange={(e) => setSelectedVerifyFile(e.target.files?.[0] || null)}
                  />
                  {selectedVerifyFile ? (
                    <>
                      <FileText size={48} className="text-indigo-600" />
                      <div className="text-center">
                        <p className="font-bold text-indigo-900">{selectedVerifyFile.name}</p>
                        <p className="text-xs text-indigo-600">Click to change file</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                        <Upload size={24} />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-gray-700">Click to upload certificate</p>
                        <p className="text-xs text-gray-400">PDF, PNG, or JPG (Max 10MB)</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-100"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400 font-bold tracking-widest">Or enter hash manually</span>
                  </div>
                </div>

                <input 
                  type="text" 
                  value={verifyHash}
                  onChange={(e) => setVerifyHash(e.target.value)}
                  placeholder="Enter Keccak-256 hash..." 
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                />

                <button 
                  onClick={handleVerifyHash}
                  disabled={(!verifyHash && !selectedVerifyFile) || isVerifying}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isVerifying ? <Loader2 className="animate-spin" /> : <Shield size={20} />}
                  Verify Authenticity
                </button>
              </div>

              {verificationResult && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "p-6 rounded-2xl border flex items-start gap-4",
                    verificationResult.exists ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                  )}
                >
                  {verificationResult.exists ? (
                    <>
                      <CheckCircle className="text-green-600 mt-1" size={24} />
                      <div>
                        <h4 className="font-bold text-green-900 text-lg">TrustChain Verified</h4>
                        <p className="text-green-700 text-sm mt-1">This certificate is authentic and its digital footprint is secured on the SIH25200 TrustChain.</p>
                        <div className="mt-4 bg-white p-4 rounded-xl border border-green-200 space-y-2">
                          <p className="text-xs text-gray-500"><span className="font-bold">Issued To:</span> {verificationResult.details.seekerName || 'Verified Candidate'}</p>
                          <p className="text-xs text-gray-500"><span className="font-bold">Title:</span> {verificationResult.details.title}</p>
                          <p className="text-xs text-gray-500"><span className="font-bold">Trust Score:</span> {verificationResult.details.trustScore}%</p>
                          <p className="text-xs text-gray-500"><span className="font-bold">Issued At:</span> {new Date(verificationResult.details.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="text-red-600 mt-1" size={24} />
                      <div>
                        <h4 className="font-bold text-red-900 text-lg">Not TrustChain Verified</h4>
                        <p className="text-red-700 text-sm mt-1">
                          This certificate's digital footprint was not found in our secure database. 
                          It may be authentic, but it has not been verified through the SIH25200 TrustChain process.
                        </p>
                        <div className="mt-4 p-4 bg-red-100/50 rounded-xl border border-red-200">
                          <p className="text-xs text-red-800 font-bold">Action Required:</p>
                          <p className="text-xs text-red-700 mt-1">Please ask the candidate to upload and verify this certificate on their TrustChain profile to ensure its authenticity.</p>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div 
              key="about"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 max-w-4xl mx-auto pb-20"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-3 bg-indigo-100 text-indigo-600 rounded-2xl mb-2">
                  <Shield size={40} />
                </div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">About TrustChain</h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                  The world's first decentralized professional credentialing platform powered by AI and Blockchain.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <CheckCircle size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">CNN Verification</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Our proprietary Convolutional Neural Network (CNN) analyzes certificate layouts, logos, and signatures to detect tampering and ensure authenticity with 99.9% accuracy.
                  </p>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                    <Hash size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Blockchain Hashing</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Once verified, every certificate is hashed and anchored to a secure blockchain, creating an immutable, permanent record that can be instantly verified by anyone, anywhere.
                  </p>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                    <Search size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">AI Job Matching</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Our Gemini-powered AI analyzes your verified skill set and searches the live web to find job opportunities that perfectly match your proven expertise.
                  </p>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                    <User size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Verified Profiles</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Build a professional presence that employers can trust. Your TrustChain profile is a living document of your achievements, backed by cryptographic proof.
                  </p>
                </div>
              </div>

              <div className="bg-indigo-600 rounded-3xl p-8 md:p-12 text-white overflow-hidden relative">
                <div className="relative z-10 space-y-6">
                  <h3 className="text-2xl md:text-3xl font-bold">Ready to secure your future?</h3>
                  <p className="text-indigo-100 text-lg max-w-xl">
                    Join thousands of professionals who are already using TrustChain to prove their skills and land their dream jobs.
                  </p>
                  <button 
                    onClick={() => setActiveTab('overview')}
                    className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
                  >
                    Get Started Now
                  </button>
                </div>
                <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10">
                  <Shield size={400} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Upload Certificate</h3>
                <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    What is this certificate about?
                  </label>
                  <textarea
                    value={certDescription}
                    onChange={(e) => setCertDescription(e.target.value)}
                    placeholder="e.g., This is a certificate for completing a 6-month React and Node.js bootcamp with a focus on full-stack development."
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Certificate File
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-400">PNG, JPG or PDF (MAX. 5MB)</p>
                      </div>
                      <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />
                    </label>
                  </div>
                  {selectedFile && (
                    <p className="mt-2 text-xs text-indigo-600 font-medium flex items-center gap-1">
                      <CheckCircle size={12} /> {selectedFile.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartUpload}
                  disabled={!selectedFile || !certDescription.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
                >
                  Upload & Verify
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Candidate Profile Modal */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedCandidate(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl">
                    {selectedCandidate.displayName[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{selectedCandidate.displayName}</h3>
                    <p className="text-indigo-100 text-sm">Verified Candidate Profile</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCandidate(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  {/* Left Column: Info & Skills */}
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Contact Information</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <Mail size={16} className="text-indigo-600" />
                          {selectedCandidate.email}
                        </div>
                        {selectedCandidate.contact && (
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <Phone size={16} className="text-indigo-600" />
                            {selectedCandidate.contact}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <Shield size={16} className="text-indigo-600" />
                          Trust Score: {candidateCertificates.length > 0 ? Math.round(candidateCertificates.reduce((acc, c) => acc + c.trustScore, 0) / candidateCertificates.length) : 0}%
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Verified Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(candidateCertificates.flatMap(c => c.keywords))).map(skill => (
                          <span key={skill} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
                            {skill}
                          </span>
                        ))}
                        {(selectedCandidate.manualSkills || []).map(skill => (
                          <span key={skill} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold border border-gray-200">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Education</h4>
                      <div className="space-y-4">
                        {(selectedCandidate.educationList || []).map(edu => (
                          <div key={edu.id}>
                            <p className="text-sm font-bold text-gray-900">{edu.institution}</p>
                            <p className="text-xs text-gray-600">{edu.degree}</p>
                            <p className="text-xs text-gray-400">{edu.year}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Experience & Projects */}
                  <div className="lg:col-span-2 space-y-8">
                    <div>
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Professional Summary</h4>
                      <p className="text-gray-700 leading-relaxed">
                        {selectedCandidate.bio || 'No bio provided.'}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Experience</h4>
                      <div className="space-y-6">
                        {(selectedCandidate.experienceList || []).map(exp => (
                          <div key={exp.id}>
                            <div className="flex justify-between items-start">
                              <h5 className="font-bold text-gray-900">{exp.role}</h5>
                              <span className="text-xs text-indigo-600 font-bold">{exp.duration}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{exp.company}</p>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Verified Certificates</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {candidateCertificates.map(cert => (
                          <div key={cert.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <h5 className="font-bold text-sm text-gray-900 mb-1">{cert.title}</h5>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1">
                                <CheckCircle size={10} /> Verified
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {cert.certHash.substring(0, 12)}...
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedCandidate(null)}
                  className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={handleContactCandidate}
                  disabled={isNotifying || notificationSent}
                  className={cn(
                    "px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2",
                    notificationSent 
                      ? "bg-green-100 text-green-700 border border-green-200" 
                      : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  )}
                >
                  {isNotifying ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : notificationSent ? (
                    <CheckCircle size={18} />
                  ) : (
                    <Mail size={18} />
                  )}
                  {notificationSent ? "Interest Sent" : "Contact Candidate"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all print:hidden",
      active 
        ? "bg-indigo-50 text-indigo-600" 
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    )}
  >
    {icon}
    {label}
  </button>
);

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
    <div className="flex justify-between items-start mb-2 md:mb-4">
      <div className="p-2 bg-gray-50 rounded-lg shrink-0">{icon}</div>
    </div>
    <p className="text-xs md:text-sm text-gray-500 font-medium truncate">{title}</p>
    <h4 className="text-lg md:text-2xl font-bold text-gray-900 mt-1 truncate">{value}</h4>
  </div>
);

const ActivityItem: React.FC<{ title: string; time: string; status: string }> = ({ title, time, status }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors gap-2">
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
    </div>
    <span className="self-start sm:self-center text-[10px] font-bold uppercase px-2 py-1 bg-gray-100 text-gray-600 rounded whitespace-nowrap">
      {status}
    </span>
  </div>
);
