


# 🛡️ TrustChain: Blockchain-Powered Credentialing

[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth/Firestore-FFCA28?logo=firebase)](https://firebase.google.com/)


**TrustChain** is a decentralized-inspired professional platform designed to eliminate resume fraud. By combining **CNN-based document verification** with **Blockchain hashing**, it ensures that every skill on a candidate's profile is backed by an immutable digital seal.

---

## 🚀 Key Features

### 🔐 Multi-Layer Verification
* **CNN-Powered Analysis:** A mock Convolutional Neural Network analyzes certificate layouts and signatures to assign a "Trust Score."
* **Blockchain Anchoring:** Verified certificates are hashed using `ethers.js`, simulating an immutable ledger record for tamper-proof validation.
* **Public Hash Verifier:** Anyone can input a certificate hash to verify its authenticity instantly.

### 🤖 AI-Driven Career Growth
* **Gemini Chatbot:** A persistent career assistant that understands your profile context to offer optimization tips.
* **Smart Job Matching:** Automatically fetches real-time job opportunities that align specifically with your **verified** skill set.

### 📄 Professional Tools
* **Verified Resume Export:** Generate a sleek PDF resume using `jsPDF`, featuring a "Verified by TrustChain" digital seal.
* **Dual Dashboards:** Specialized interfaces for **Seekers** (credential management) and **Employers** (candidate discovery).

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite 6, TypeScript, Framer Motion |
| **Styling** | Tailwind CSS 4, Lucide React Icons |
| **Backend** | Node.js, Express 4 |
| **Database/Auth** | Firebase Firestore & Google Auth |
| **Blockchain** | Ethers.js (Hashing & Simulation) |
| **Artificial Intelligence** | Google Gemini API (`@google/genai`) |

---

## 🏗️ System Architecture



1.  **Upload:** User uploads a PDF/Image certificate.
2.  **Verify:** Backend "CNN" service validates the document structure.
3.  **Hash:** On success, a SHA-256 hash is generated and stored in Firestore (simulating the blockchain ledger).
4.  **Display:** The Seeker's profile updates with a "Verified" badge, visible to potential employers.

---

## 🚦 Getting Started

### Prerequisites
* **Node.js** (v18 or higher)
* **Firebase Project** (for Firestore and Auth)
* **Google AI Studio API Key** (for Gemini)

### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/trustchain.git
    cd trustchain
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Setup:**
    Create a `.env.local` file in the root directory and add:
    ```env
    VITE_FIREBASE_API_KEY=your_key
    VITE_GEMINI_API_KEY=your_gemini_key
    ```
4.  **Launch the development server:**
    ```bash
    npm run dev
    ```

---

## 🎓 Academic Context
Developed as a core project for **B.Tech Computer Science (Blockchain)** at **Presidency University**. This project explores the intersection of document security, deep learning, and decentralized identity.

