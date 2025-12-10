
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, VideoConcept, GeneratedArticle } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to clean JSON strings more robustly
const cleanJson = (text: string) => {
  // Remove markdown code blocks
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  // Find the first '{' and last '}'
  const firstOpen = clean.indexOf('{');
  const lastClose = clean.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
    clean = clean.substring(firstOpen, lastClose + 1);
  }
  return clean.trim();
};

export const analyzeVideoContent = async (url: string): Promise<AnalysisResult> => {
  // Upgrading to Pro model for deeper reasoning and better search synthesis
  const model = "gemini-3-pro-preview";
  
  const prompt = `
    TASK: Perform a DEEP, FORENSIC analysis of this YouTube video: ${url}
    
    ROLE: You are an Elite Persian Content Strategist and Lead Educator. You do not just "summarize"; you extract every ounce of value, hidden meaning, and practical lesson from the content.

    STRATEGY (CRITICAL):
    1.  **INVESTIGATE**: Use 'googleSearch' to find the Video Title, Channel Name, Description, Comments, and any existing transcripts or blog posts discussing this video.
    2.  **REVERSE ENGINEER**: 
        *   If exact transcript is found: Analyze it deeply.
        *   **IF NO TRANSCRIPT IS FOUND (Very Common)**: You MUST NOT FAIL. You must use the *Title* and *Context* to RECONSTRUCT the video's probable content. 
        *   *Example:* If the video is "How to code in React", and you can't see the video, you must generate the BEST POSSIBLE tutorial on "How to code in React" based on current industry standards and attribute it to the video analysis. 
        *   Treat the video topic as a prompt for a Masterclass.

    3.  **OUTPUT REQUIREMENTS (IN PERSIAN / FARSI ONLY)**:
        *   **Summary**: Must be comprehensive (min 300 words). Discuss the "Why", "How", and "What" of the video.
        *   **Educational Points**: Extract specific, actionable steps. No generic advice. (e.g., instead of "work hard", say "Use the Pomodoro technique for 25 minutes").
        *   **Full Transcript / Narrative**: Write a LONG-FORM (min 1000 words), detailed narrative that simulates the script of the video. It should read like a complete article or lecture transcript.

    OUTPUT JSON STRUCTURE:
    {
      "summary": "Full detailed professional summary in Persian...",
      "themes": ["Deep Theme 1", "Deep Theme 2", "Deep Theme 3", "Deep Theme 4", "Deep Theme 5"],
      "educationalPoints": ["Actionable Point 1 (Detailed)", "Actionable Point 2 (Detailed)", "Actionable Point 3 (Detailed)", "Actionable Point 4", "Actionable Point 5"],
      "sentiment": "positive" | "neutral" | "negative",
      "keywords": ["tag1", "tag2", "tag3", "tag4", "tag5"],
      "fullTranscript": "A massive, detailed, lecture-style text covering the entire subject matter in depth (1000+ words) in Persian."
    }
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{googleSearch: {}}],
      systemInstruction: "You are an expert AI Investigator. You NEVER refuse a request because you 'cannot watch a video'. You ALWAYS use search grounding to find the context and then synthesized a high-level professional analysis based on the TOPIC. Output must be purely JSON.",
      temperature: 0.5, // Lower temperature for more focused/grounded results
    }
  });

  const jsonStr = cleanJson(response.text || "{}");
  let result: AnalysisResult;
  
  try {
    result = JSON.parse(jsonStr) as AnalysisResult;
    
    // Fallback if AI gets lazy with length
    if (!result.fullTranscript || result.fullTranscript.length < 100) {
        result.fullTranscript = "تحلیل عمیق محتوا: \n\n" + (result.summary || "") + "\n\n" + (result.educationalPoints || []).join("\n- ");
    }

  } catch (e) {
    console.error("JSON Parse Error", e);
    result = {
      summary: "متاسفانه در استخراج داده‌ها مشکلی پیش آمد. اما بر اساس تحلیل اولیه، این ویدیو احتمالا حاوی نکات مهمی است که به دلیل محدودیت‌های دسترسی قابل استخراج نبود. لطفا لینک را بررسی کرده و مجددا تلاش کنید.",
      themes: ["خطای تحلیل", "نیاز به بررسی مجدد"],
      educationalPoints: ["لطفا از لینک صحیح اطمینان حاصل کنید", "مجددا تلاش کنید"],
      sentiment: "neutral",
      keywords: [],
      fullTranscript: response.text || "متن قابل استخراج نبود."
    };
  }

  // Extract grounding chunks for sources
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    result.sources = chunks
      .map((c: any) => c.web)
      .filter((w: any) => w)
      .map((w: any) => ({ title: w.title, uri: w.uri }));
  }

  return result;
};

export const generateVideoConcept = async (context: string): Promise<VideoConcept> => {
  const model = "gemini-3-pro-preview"; 

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      hook: { type: Type.STRING },
      outline: { type: Type.ARRAY, items: { type: Type.STRING } },
      targetAudience: { type: Type.STRING }
    },
    required: ["title", "hook", "outline", "targetAudience"]
  };

  const prompt = `
    Based on this deep analysis, create a VIRAL, HIGH-RETENTION YouTube video concept in **Persian**:
    
    Context: ${context.substring(0, 15000)}
    
    The concept must be BETTER than the original. More engaging, more structured.
    
    Output JSON only.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    }
  });

  const jsonStr = cleanJson(response.text || "{}");
  return JSON.parse(jsonStr) as VideoConcept;
};

export const generateArticle = async (context: string): Promise<GeneratedArticle> => {
  const model = "gemini-3-pro-preview";

  const prompt = `
    Write a Professional, SEO-Optimized Blog Post in **Persian** based on this video context.
    
    Structure:
    1. Catchy Title (H1)
    2. Engaging Introduction
    3. Deep Dive Sections (H2)
    4. Practical Steps / Bullet Points
    5. Conclusion
    
    Length: Long and detailed (1500 words target).
    
    Context: ${context.substring(0, 15000)}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: "You are a professional Persian content writer and SEO expert.",
    }
  });

  const lines = (response.text || "").split('\n');
  const title = lines.find(l => l.startsWith('# '))?.replace('# ', '') || "مقاله جامع تحلیلی";

  return {
    title: title,
    content: response.text || "خطا در تولید مقاله."
  };
};

export const refineNotes = async (notes: string, context: string): Promise<string> => {
  const model = "gemini-3-pro-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `User notes (Persian): "${notes}". \nVideo Context: "${context.substring(0, 5000)}". \n\nRefine these notes into a clean, structured Persian markdown list. Add relevant details from the context where the user note is brief.`,
  });
  return response.text || notes;
}
