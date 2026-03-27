export type UserRole = 'seeker' | 'giver';

export interface ExperienceEntry {
  id: string;
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  year: string;
}

export interface ProjectEntry {
  id: string;
  title: string;
  description: string;
  link?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  bio?: string;
  contact?: string;
  experience?: string; // Keep for backward compatibility
  experienceList?: ExperienceEntry[];
  educationList?: EducationEntry[];
  projectList?: ProjectEntry[];
  skills?: string[];
  manualSkills?: string[];
  createdAt: string;
}

export interface Certificate {
  id: string;
  seekerUid: string;
  seekerName?: string;
  title: string;
  imageUrl: string;
  trustScore: number;
  certHash: string;
  verified: boolean;
  keywords: string[];
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  link: string;
  description: string;
  platform?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
