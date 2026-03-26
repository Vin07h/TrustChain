
TrustChain: Project Documentation
1. Project Overview
TrustChain is a blockchain-powered professional credentialing platform designed to eliminate resume fraud and streamline the hiring process. It allows job seekers to upload certificates that are verified using a CNN (Convolutional Neural Network) model and secured via blockchain hashing. Employers can then search for and verify talent with absolute confidence in their credentials.
2. Key Features
Certificate Verification: Uses a mock CNN model to analyze certificate layouts and signatures for authenticity.
Blockchain Hashing: Generates unique hashes for verified certificates, simulating an immutable record on a blockchain.
Professional Profile Builder: A comprehensive section for job seekers to manage their bio, skills (both verified and manual), experience, and education.
AI-Powered Job Search: Leverages Google Gemini AI to find real-time job matches based on a user's verified skill set.
Candidate Search (Employer): Allows employers to filter and find candidates based on verified credentials.
Hash Verifier: A public tool to verify the authenticity of any certificate using its blockchain hash.
AI Chatbot: An intelligent assistant powered by Gemini to help users optimize their profiles and navigate the platform.
PDF Resume Export: Generates professional, verified resumes in PDF format using jsPDF.
3. Tech Stack
Frontend: React 19, Vite 6, Tailwind CSS 4, Motion (animations), Lucide React (icons).
Backend: Node.js with Express 4.
Database & Auth: Firebase (Authentication and Firestore).
AI Integration: Google Gemini API (@google/genai).
Blockchain Simulation: ethers.js.
PDF Generation: jspdf and jspdf-autotable.
Step-by-Step Building Approach
Phase 1: Foundation & Infrastructure
Project Initialization: Set up the React + TypeScript environment using Vite.
Styling Framework: Integrated Tailwind CSS for a utility-first, responsive design approach.
Full-Stack Setup: Created a custom Express server (server.ts) to handle API logic and serve the frontend, enabling a seamless full-stack development experience.
Firebase Integration: Configured Firebase for secure Google Authentication and Firestore for persisting user profiles and certificate data.
Phase 2: Core Logic & Security
API Layer Development: Built a robust API service (src/api.ts) to abstract all backend interactions, including auth, certificate management, and AI services.
CNN Verification Logic: Implemented a mock CNN service in the backend that simulates image analysis and provides a "Trust Score" for uploaded documents.
Blockchain Hashing: Developed a hashing utility using ethers.js to simulate the process of "anchoring" verified credentials to a blockchain.
Phase 3: Frontend Feature Implementation
Authentication Flow: Developed the login and role-selection logic, ensuring users are directed to the correct dashboard (Seeker vs. Employer).
Dashboard Architecture: Built a responsive, sidebar-driven dashboard using motion for smooth tab transitions and a premium feel.
Certificate Management: Created the upload and gallery interface, allowing users to see their verification status in real-time.
Profile & Resume Builder: Implemented the "My Profile" section with editable fields for bio, skills, and professional history, ensuring all data is synchronized with the global user state.
Phase 4: AI & External Integrations
Gemini AI Chatbot: Integrated a floating AI assistant that uses the user's profile context to provide personalized career advice.
Dynamic Job Search: Built a tool that uses Gemini to "search the internet" (simulated) for jobs that perfectly match the user's verified skills.
PDF Export Engine: Integrated jsPDF to allow users to download a professional resume that includes a "Verified by TrustChain" seal.
Phase 5: Refinement & Optimization
Responsive Polish: Conducted a full pass to ensure the application is mobile-first and works perfectly on all screen sizes.
Error Handling: Implemented global error boundaries and specific handlers for common issues like WebSocket connection errors in the development environment.
Deployment Readiness: Optimized the build process and ensured all environment variables are correctly managed for production.
Conclusion
TrustChain is a modern solution to a real-world problem, combining the power of AI, Blockchain, and Cloud Computing. The step-by-step approach ensured that core security features were built first, followed by a high-quality user experience and intelligent integrations.
## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
