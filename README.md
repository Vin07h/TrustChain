Since you're a **Blockchain student** at **Presidency University**, this enhanced README focuses on the security architecture and the "Trust" logic of your project—making it a perfect centerpiece for your GitHub profile.

---

# 🛡️ TrustChain: Blockchain-Powered Credentialing

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini-8E75B2?logo=googlegemini&logoColor=white)](https://ai.google.dev/)

**TrustChain** is a decentralized-inspired professional credentialing platform designed to eliminate resume fraud. By combining **CNN-based document verification** with **Blockchain hashing**, it ensures that every skill on a candidate's profile is backed by an immutable digital seal.

---

## 🚀 Key Features

### 🔐 Multi-Layer Verification
* **CNN-Powered Analysis:** Uses a mock Convolutional Neural Network model to analyze certificate layouts and signatures for authenticity.
* **Blockchain Hashing:** Generates unique SHA-256 hashes using `ethers.js`, simulating an immutable record on a blockchain for tamper-proof validation.
* **Public Hash Verifier:** A public tool to verify the authenticity of any certificate using its specific blockchain hash.

### 🤖 AI-Driven Career Growth
* **Gemini AI Chatbot:** An intelligent assistant that uses profile context to provide personalized career advice and platform navigation.
* **Dynamic Job Search:** Leverages Google Gemini to find real-time job matches based specifically on a user’s **verified** skill set.

### 📄 Professional Tools
* **Verified Resume Export:** Generates professional resumes in PDF format (via `jsPDF`) featuring a "Verified by TrustChain" digital seal.
* **Dual Dashboard Architecture:** Specialized interfaces for **Job Seekers** (credential management) and **Employers** (candidate discovery).

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite 6, TypeScript, Framer Motion |
| **Styling** | Tailwind CSS 4, Lucide React Icons |
| **Backend** | Node.js, Express 4 |
| **Database & Auth** | Firebase (Authentication and Firestore) |
| **AI Integration** | Google Gemini API (`@google/genai`) |
| **Blockchain** | Ethers.js (Hashing & Simulation) |
| **PDF Engine** | jsPDF & jsPDF-AutoTable |

---

## 🏗️ Development Phases

1.  **Foundation:** Vite + React setup with Tailwind CSS and Firebase integration for secure Auth.
2.  **Core Logic:** Robust API layer development and CNN/Blockchain simulation utilities.
3.  **Frontend:** Responsive, sidebar-driven dashboard with smooth Motion transitions.
4.  **Intelligence:** Integration of Gemini AI for career assistance and dynamic matching.
5.  **Refinement:** Global error handling and mobile-first optimization.

---

## 🚦 Getting Started

### Prerequisites
* **Node.js** (v18 or higher)
* **Gemini API Key** (from Google AI Studio)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Vin07h/TrustChain.git
    cd TrustChain
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env.local` file in the root directory and add your API key:
    ```env
    VITE_GEMINI_API_KEY=your_gemini_api_key_here
    ```

4.  **Launch the development server:**
    ```bash
    npm run dev
    ```

---

## 🎓 Academic Context
This project was developed as a modern solution for professional credentialing, exploring the intersection of AI, Blockchain simulation, and Cloud Computing. It serves as a comprehensive full-stack implementation for **B.Tech Computer Science Engineering** students focusing on **Blockchain technology**.

---

