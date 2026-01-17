
import { GoogleGenAI, Type } from "@google/genai";
import { SurfaceParameters, AIAnalysisResult } from "../types";

export const analyzeSurfaceModel = async (params: SurfaceParameters): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const raInNm = params.ra * 1000;
  const lambdaInNm = params.wavelength * 1000;

  const prompt = `Analyze the surface roughness scattering for an Aluminum alloy.
  Parameters:
  - Roughness (Ra): ${raInNm.toFixed(4)} nm (${params.ra.toFixed(7)} μm)
  - Wavelength (λ): ${lambdaInNm.toFixed(2)} nm
  - Angle of incidence: ${params.incidentAngle}°
  - Selected Model Type: ${params.modelType}

  The Ra ranges from ultra-precision (0.001nm) to industrial (3.2μm). The wavelength is in the UV-VIS-NIR range (0-2000nm).
  Identify the interaction regime (e.g., Smooth/Specular vs Rough/Diffuse). 
  Reference specific theories like Rayleigh-Rice (perturbation) for small Ra/λ and Beckmann-Spizzichino for large Ra/λ.
  Explain how Aluminum's reflectivity and this specific roughness profile will distribute the scattered energy.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          modelName: { type: Type.STRING },
          description: { type: Type.STRING },
          mathematicalDistribution: { type: Type.STRING },
          physicalRegime: { type: Type.STRING },
          details: { type: Type.STRING }
        },
        required: ["modelName", "description", "mathematicalDistribution", "physicalRegime", "details"]
      }
    }
  });

  try {
    return JSON.parse(response.text) as AIAnalysisResult;
  } catch (e) {
    throw new Error("Failed to parse AI response");
  }
};
