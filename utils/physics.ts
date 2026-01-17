
/**
 * Generates a synthetic 1D surface profile based on Ra.
 */
export const generateSurfaceProfile = (ra: number, length: number = 200) => {
  const rq = ra * 1.25;
  const points = [];
  let prev = 0;
  const alpha = 0.15; 
  
  for (let i = 0; i < length; i++) {
    const noise = (Math.random() - 0.5) * 4 * rq;
    const val = prev * (1 - alpha) + noise * alpha;
    points.push({ x: i, y: val });
    prev = val;
  }
  return points;
};

/**
 * Generates a synthetic 2D surface grid based on Ra for 3D visualization.
 */
export const generateSurfaceProfile3D = (ra: number, size: number = 64) => {
  const rq = ra * 1.25;
  const grid: number[][] = [];
  
  for (let i = 0; i < size; i++) {
    grid[i] = [];
    for (let j = 0; j < size; j++) {
      let height = (Math.random() - 0.5) * 2 * rq;
      grid[i][j] = height;
    }
  }

  const smoothed: number[][] = [];
  for (let i = 0; i < size; i++) {
    smoothed[i] = [];
    for (let j = 0; j < size; j++) {
      let sum = 0;
      let count = 0;
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const ni = i + di;
          const nj = j + dj;
          if (ni >= 0 && ni < size && nj >= 0 && nj < size) {
            sum += grid[ni][nj];
            count++;
          }
        }
      }
      smoothed[i][j] = sum / count;
    }
  }

  return smoothed;
};

export const calculateScattering = (
  ra: number, 
  lambda: number, 
  thetaInc: number, 
  modelType: string = 'Auto', 
  step: number = 1,
  reflectivity: number = 1.0,
  slopeFactor: number = 1.0
) => {
  const sigma = ra * 1.25; 
  const thetaRad = (thetaInc * Math.PI) / 180;
  const safeLambda = Math.max(0.0001, lambda);
  const g = Math.pow((4 * Math.PI * sigma * Math.cos(thetaRad)) / safeLambda, 2);
  
  const data: { angle: number; intensity: number }[] = [];
  const specularAngle = thetaInc;
  
  let activeModel = modelType;
  if (activeModel === 'Auto') {
    if (g < 0.01) activeModel = 'Rayleigh-Rice';
    else if (g > 15) activeModel = 'Beckmann';
    else activeModel = 'Harvey-Shack';
  }

  for (let a = -90; a <= 90; a += step) {
    const aRad = (a * Math.PI) / 180;
    const diff = Math.abs(a - specularAngle);
    let intensity = 0;

    if (activeModel === 'Rayleigh-Rice') {
      const peakWidth = Math.max(step * 2, 0.2 * (lambda / Math.max(0.00001, ra * 1000)));
      const specular = Math.exp(-g) * Math.exp(-Math.pow(diff / peakWidth, 2));
      const diffuse = (1 - Math.exp(-g)) * Math.pow(Math.cos(aRad), 4);
      intensity = specular + diffuse * 0.05;
    } else if (activeModel === 'Beckmann') {
      // m is the RMS slope. We modulate it with slopeFactor.
      const m = Math.max(0.005, (ra / 5) * slopeFactor); 
      const cosA = Math.cos(aRad);
      if (cosA > 0) {
        const exponent = -Math.pow(Math.tan(aRad - thetaRad), 2) / (2 * m * m);
        intensity = (1 / (Math.PI * m * m * Math.pow(cosA, 4))) * Math.exp(exponent);
      }
    } else {
      const spec = Math.exp(-g) * Math.exp(-Math.pow(diff / (1.5 * slopeFactor), 2));
      const diffu = (1 - Math.exp(-g)) * Math.pow(Math.cos(aRad), 1.5);
      intensity = spec + diffu * 0.3;
    }
    
    data.push({ angle: Number(a.toFixed(4)), intensity: Math.max(0, intensity) });
  }
  
  const rawMaxIntensity = data.reduce((max, item) => (item.intensity > max ? item.intensity : max), 0);
  
  return data.map(d => ({ 
    ...d, 
    intensity: (d.intensity / (rawMaxIntensity || 1)) * reflectivity 
  }));
};

export const calculateEnergyConcentration = (data: { angle: number; intensity: number }[], step: number) => {
  const total = data.reduce((acc, d) => acc + d.intensity, 0);
  if (total === 0) return { e50: 0, e90: 0, e99: 0 };

  const sorted = [...data].sort((a, b) => b.intensity - a.intensity);
  
  let currentSum = 0;
  let e50Count = 0, e90Count = 0, e99Count = 0;
  
  for (let i = 0; i < sorted.length; i++) {
    currentSum += sorted[i].intensity;
    const ratio = currentSum / total;
    if (!e50Count && ratio >= 0.50) e50Count = i + 1;
    if (!e90Count && ratio >= 0.90) e90Count = i + 1;
    if (!e99Count && ratio >= 0.99) e99Count = i + 1;
    if (e99Count) break;
  }
  
  return { 
    e50: Number((e50Count * step).toFixed(4)), 
    e90: Number((e90Count * step).toFixed(4)), 
    e99: Number((e99Count * step).toFixed(4)) 
  };
};
