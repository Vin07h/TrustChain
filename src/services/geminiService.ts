import { GoogleGenAI, Type } from "@google/genai";
import { Job } from "../types";

const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || (process.env as any).GEMINI_API_KEY });

export const geminiService = {
  searchJobs: async (keywords: string): Promise<Job[]> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Search for live, active job openings for: ${keywords}. 
        Focus on major platforms like LinkedIn, Indeed, Naukri, and Google Careers.
        You MUST provide REAL, direct application links from the search results. 
        Do not provide homepages, generic search URLs, or placeholder links.
        If you cannot find a direct link, do not include the job.
        Return the results as a JSON array of job objects.
        Each object must have: title, company, location, link, description, and platform.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                company: { type: Type.STRING },
                location: { type: Type.STRING },
                link: { type: Type.STRING },
                description: { type: Type.STRING },
                platform: { type: Type.STRING }
              },
              required: ["title", "company", "location", "link", "description", "platform"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) return [];
      
      const jobs = JSON.parse(text);
      return jobs.map((job: any, index: number) => ({
        ...job,
        id: `external-${index}-${Date.now()}`
      }));
    } catch (error) {
      console.error("Error searching jobs with Gemini:", error);
      return [];
    }
  },

  chat: async (message: string, history: { role: string, parts: { text: string }[] }[] = []): Promise<string> => {
    try {
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are the TrustChain Assistant, a specialized AI for the SIH25200 TrustChain platform. 
          Your goal is to help users navigate certificate verification, resume building, and job searching.
          
          Key Platform Concepts:
          1. Verification: We use CNN (Convolutional Neural Networks) to analyze certificates for authenticity and then hash them on the blockchain for permanent, tamper-proof storage.
          2. Trust Score: An AI-calculated percentage (0-100%) reflecting the authenticity and relevance of a certificate. High scores (80%+) are considered "Verified".
          3. Blockchain Hashing: We use Keccak-256 hashing to create a unique digital fingerprint of every certificate. This hash is stored on the TrustChain, making it impossible to forge.
          4. Resume Builder: A tool that pulls verified credentials and skills to create a professional, blockchain-backed resume.
          5. Job Finder: An AI-powered search tool that finds live job openings matching your verified skills.

          Tone & Style:
          - Professional, helpful, and concise.
          - Use Markdown formatting for better readability:
            - Use **bold** for key terms and labels.
            - Use bullet points (*) for lists and steps.
            - Use proper spacing between paragraphs.
          - If a user asks a common question, provide a clear, structured answer.
          - If you don't know something specific about the user's account, explain how they can find it in their dashboard.`,
        },
        history: history
      });

      const response = await chat.sendMessage({ message });
      return response.text || "I'm sorry, I couldn't process that request.";
    } catch (error) {
      console.error("Chat error:", error);
      return "I'm having trouble connecting to my brain right now. Please try again later!";
    }
  },

  extractKeywords: async (description: string): Promise<string[]> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract the most relevant professional skills and job-related keywords from the following certificate description: "${description}". 
        Return ONLY a JSON array of strings. Max 5 keywords.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const text = response.text;
      if (!text) return [];
      return JSON.parse(text);
    } catch (error) {
      console.error("Error extracting keywords:", error);
      return [];
    }
  }
};
