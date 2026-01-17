
export type ModelType = 'Auto' | 'Beckmann' | 'Rayleigh-Rice' | 'Harvey-Shack';

export interface SurfaceParameters {
  material: string;
  ra: number; // Mean roughness in micrometers
  wavelength: number; // in micrometers
  incidentAngle: number; // in degrees
  modelType: ModelType;
  reflectivity: number; // 0 to 1
  slopeFactor: number; // Microfacet distribution width factor
}

export interface ScatteringData {
  angle: number;
  intensity: number;
}

export interface AIAnalysisResult {
  modelName: string;
  description: string;
  mathematicalDistribution: string;
  physicalRegime: 'Specular' | 'Diffractive' | 'Diffuse';
  details: string;
}
