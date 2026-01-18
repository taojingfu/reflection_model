
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { SurfaceParameters, AIAnalysisResult, ModelType } from './types';
import { generateSurfaceProfile, generateSurfaceProfile3D, calculateScattering, calculateEnergyConcentration } from './utils/physics';
import { analyzeSurfaceModel } from './services/geminiService';
import Surface3D from './components/Surface3D';

const App: React.FC = () => {
  const SIMULATION_STEP = 0.001;

  const [params, setParams] = useState<SurfaceParameters>({
    material: 'Aluminum Alloy',
    ra: 0.8,
    wavelength: 0.5,
    incidentAngle: 0,
    modelType: 'Auto',
    reflectivity: 0.9,
    slopeFactor: 1.0
  });

  const raMinUm = 0.000001; 
  const raMaxUm = 3.2;
  const raLogMin = Math.log10(raMinUm);
  const raLogMax = Math.log10(raMaxUm);
  const wlMinUm = 0.01;
  const wlMaxUm = 2.0;

  const [profile, setProfile] = useState<{ x: number; y: number }[]>([]);
  const [profile3D, setProfile3D] = useState<number[][]>([]);
  const [fullScattering, setFullScattering] = useState<{ angle: number; intensity: number }[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const updateVisualization = useCallback(() => {
    setProfile(generateSurfaceProfile(params.ra));
    setProfile3D(generateSurfaceProfile3D(params.ra, 50));
    const scat = calculateScattering(
      params.ra, 
      params.wavelength, 
      params.incidentAngle, 
      params.modelType, 
      SIMULATION_STEP,
      params.reflectivity,
      params.slopeFactor
    );
    setFullScattering(scat);
  }, [params.ra, params.wavelength, params.incidentAngle, params.modelType, params.reflectivity, params.slopeFactor]);

  useEffect(() => {
    updateVisualization();
  }, [updateVisualization]);

  const handleAIAnalysis = async () => {
    setLoading(true);
    try {
      const result = await analyzeSurfaceModel(params);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const gValue = useMemo(() => {
    const sigma = params.ra * 1.25;
    return Math.pow((4 * Math.PI * sigma * Math.cos(params.incidentAngle * Math.PI / 180)) / Math.max(0.0001, params.wavelength), 2);
  }, [params.ra, params.wavelength, params.incidentAngle]);

  const energyStats = useMemo(() => {
    return calculateEnergyConcentration(fullScattering, SIMULATION_STEP);
  }, [fullScattering]);

  const chartData = useMemo(() => {
    const sampleFactor = Math.max(1, Math.floor(fullScattering.length / 600));
    return fullScattering.filter((_, i) => i % sampleFactor === 0);
  }, [fullScattering]);

  const exportBRDF = () => {
    const header = [
      "# AluRough BRDF Data Export",
      `# Material: ${params.material}`,
      `# Ra: ${params.ra.toFixed(6)} um`,
      `# Wavelength: ${params.wavelength.toFixed(3)} um`,
      `# Model: ${params.modelType}`,
      `# Reflectivity: ${params.reflectivity}`,
      `# Slope Factor: ${params.slopeFactor}`,
      `# Phase Factor (g): ${gValue.toExponential(4)}`,
      `# Resolution: ${SIMULATION_STEP} deg`,
      "Angle(deg),RelativeIntensity"
    ].join("\n");

    const rows = fullScattering.map(d => `${d.angle.toFixed(3)},${d.intensity.toFixed(8)}`);
    const csvContent = header + "\n" + rows.join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BRDF_Ra${params.ra.toFixed(2)}_Wl${params.wavelength.toFixed(2)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valNm = parseFloat(e.target.value);
    if (!isNaN(valNm)) {
      const valUm = valNm / 1000;
      setParams(prev => ({ ...prev, ra: Math.min(Math.max(valUm, raMinUm), raMaxUm) }));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <header className="border-b border-white/5 p-6 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-indigo-300 to-emerald-300">
              ALURough <span className="text-slate-500 font-light text-lg">X-Precision</span>
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">BRDF 动力学仿真平台</p>
            </div>
          </div>
          <button 
            onClick={handleAIAnalysis}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-full transition-all shadow-2xl shadow-indigo-500/20 font-black text-xs uppercase tracking-widest flex items-center gap-2 group"
          >
            {loading ? <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> : 'AI 物理深度分析'}
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-slate-900/40 border border-white/5 p-7 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
            <h2 className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-8 border-b border-white/5 pb-4">核心参数控制</h2>
            
            <div className="space-y-8">
               <div>
                <label className="block text-[10px] font-black text-slate-500 mb-4 uppercase tracking-tighter">散射物理模型</label>
                <select 
                  value={params.modelType}
                  onChange={(e) => setParams({...params, modelType: e.target.value as ModelType})}
                  className="w-full bg-slate-950/80 border border-white/5 rounded-2xl p-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="Auto">自动选择 (推荐)</option>
                  <option value="Beckmann">Beckmann (粗糙面)</option>
                  <option value="Rayleigh-Rice">Rayleigh-Rice (光滑面)</option>
                  <option value="Harvey-Shack">Harvey-Shack (广义)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">表面粗糙度 Ra</label>
                  <div className="flex items-center gap-2 bg-slate-950/50 px-3 py-1.5 rounded-xl border border-white/5 font-mono text-xs text-indigo-400">
                    {parseFloat((params.ra * 1000).toFixed(3))} nm
                  </div>
                </div>
                <input 
                  type="range" min={raLogMin} max={raLogMax} step={0.01}
                  value={Math.log10(params.ra)}
                  onChange={(e) => setParams({...params, ra: Math.pow(10, parseFloat(e.target.value))})}
                  className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-400"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">材料反射率 (R)</label>
                  <span className="text-xs font-mono text-emerald-400">{(params.reflectivity * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min={0} max={1} step={0.01}
                  value={params.reflectivity}
                  onChange={(e) => setParams({...params, reflectivity: parseFloat(e.target.value)})}
                  className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-400"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">微表面斜率因子 (Slope)</label>
                  <span className="text-xs font-mono text-orange-400">{params.slopeFactor.toFixed(2)}x</span>
                </div>
                <input 
                  type="range" min={0.1} max={3.0} step={0.1}
                  value={params.slopeFactor}
                  onChange={(e) => setParams({...params, slopeFactor: parseFloat(e.target.value)})}
                  className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-orange-400"
                />
                <p className="mt-2 text-[8px] text-slate-600 italic">调整微表面分布的宽度 (Beckmann m 参数)</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">波长 λ</label>
                  <span className="text-xs font-mono text-blue-400">{(params.wavelength * 1000).toFixed(0)} nm</span>
                </div>
                <input 
                  type="range" min={wlMinUm} max={wlMaxUm} step={0.01}
                  value={params.wavelength}
                  onChange={(e) => setParams({...params, wavelength: parseFloat(e.target.value)})}
                  className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-400"
                />
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">能量分布统计</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: '50% 能量', val: energyStats.e50, color: 'text-indigo-400' },
                    { label: '90% 能量', val: energyStats.e90, color: 'text-emerald-400' },
                    { label: '99% 能量', val: energyStats.e99, color: 'text-orange-400' }
                  ].map(stat => (
                    <div key={stat.label} className="flex justify-between items-center bg-slate-950/50 p-3 rounded-2xl border border-white/5 shadow-inner">
                      <span className="text-[8px] font-black text-slate-600 uppercase">{stat.label}</span>
                      <span className={`text-xs font-mono font-bold ${stat.color}`}>{stat.val.toFixed(3)}°</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-9 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900/40 p-1 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden h-[450px]">
               <div className="absolute top-6 left-8 z-10 pointer-events-none">
                 <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">3D 材质表面可视化</h2>
                 <p className="text-[8px] text-slate-600 font-bold uppercase tracking-wider">实时渲染交互</p>
               </div>
               <Surface3D heightMap={profile3D} ra={params.ra} reflectivity={params.reflectivity} />
            </div>

            <div className="bg-slate-900/40 p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden h-[450px]">
               <div className="flex justify-between items-start mb-8">
                 <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                   BRDF 散射强度分布图
                   <span className="block text-slate-700 font-mono text-[9px] mt-1">0.001° RES (180,001 POINTS)</span>
                 </h2>
                 <button 
                  onClick={exportBRDF}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                 >
                   <span>⬇</span> 导出 BRDF 文件
                 </button>
               </div>
               <div className="h-[310px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="angle" tick={{fill: '#475569', fontSize: 10}} stroke="#1e293b" />
                    <YAxis tick={{fill: '#475569', fontSize: 10}} stroke="#1e293b" domain={[0, 1]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '15px', fontSize: '10px', color: '#fff' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      labelFormatter={(label) => `角度: ${label}°`}
                    />
                    <Line type="monotone" dataKey="intensity" stroke="#10b981" strokeWidth={3} dot={false} animationDuration={400} />
                  </LineChart>
                </ResponsiveContainer>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-slate-900/40 p-8 rounded-[3rem] border border-white/5 shadow-2xl h-[300px]">
               <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">轮廓截面动态反馈</h2>
               <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={profile}>
                    <defs>
                      <linearGradient id="surfGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="y" stroke="#818cf8" strokeWidth={2} fill="url(#surfGrad)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
               </div>
               <p className="mt-4 text-[8px] text-slate-600 font-bold uppercase tracking-widest text-center">横截面随机过程仿真</p>
            </div>

            <div className="lg:col-span-2 bg-slate-900/40 p-10 rounded-[3rem] border border-white/5 shadow-2xl h-[300px] overflow-y-auto custom-scrollbar">
               <h2 className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-600 mb-6 border-b border-white/5 pb-4 flex items-center gap-3">
                 <span className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 text-sm">⚛</span> 
                 AI 物理模型与材质分析
               </h2>
               {analysis ? (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div>
                     <h3 className="text-sm font-black text-white tracking-tight mb-2">{analysis.modelName}</h3>
                     <p className="text-xs text-slate-400 leading-relaxed font-medium">
                       {analysis.details}
                     </p>
                   </div>
                   <div className="flex flex-wrap gap-3">
                     <div className="px-3 py-1.5 bg-slate-950/50 border border-indigo-500/20 rounded-xl text-[9px] font-black text-indigo-400 uppercase tracking-tighter shadow-sm">
                       g-parameter: {gValue.toExponential(3)}
                     </div>
                     <div className="px-3 py-1.5 bg-slate-950/50 border border-emerald-500/20 rounded-xl text-[9px] font-black text-emerald-400 uppercase tracking-tighter shadow-sm">
                       Regime: {analysis.physicalRegime}
                     </div>
                     <div className="px-3 py-1.5 bg-slate-950/50 border border-orange-500/20 rounded-xl text-[9px] font-black text-orange-400 uppercase tracking-tighter shadow-sm">
                       Refl: {(params.reflectivity*100).toFixed(0)}%
                     </div>
                   </div>
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                   <div className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center opacity-50 animate-pulse">
                     <span className="text-lg">📡</span>
                   </div>
                   <p className="text-[10px] italic font-medium">调整参数并运行 AI 分析以获得完整的物理推导</p>
                 </div>
               )}
            </div>
          </div>
        </section>
      </main>

      <footer className="p-8 text-center border-t border-white/5 mt-12 bg-slate-900/20 backdrop-blur-xl">
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-[9px] font-black text-slate-700 uppercase tracking-widest opacity-60">
          <span>Simulation Precision: 0.001° Arc-Step</span>
          <span>Mesh Density: 2,500 vertices</span>
          <span>Material: Aluminum Matrix Calibration</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
