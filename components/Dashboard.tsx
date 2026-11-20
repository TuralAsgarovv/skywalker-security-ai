import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import { 
  ShieldCheck, Activity, Globe, Info, 
  Search, Loader2, ShieldAlert, Cpu, CheckCircle2, ChevronRight,
  Shield, X, ExternalLink, Orbit, Zap, Target, ChevronDown, Filter, Settings2, Clock, AlertTriangle,
  History, Radio, AlertCircle, Terminal, BrainCircuit, SearchCode, Plus, Play, Pause, Trash2, ListOrdered
} from 'lucide-react';
import { analyzeDomain, getLatestThreatIntel, analyzeThreatImpact, ThreatReport } from '../services/gemini';
import { GroundingSource } from '../types';

interface DashboardProps {
  language: 'en' | 'az';
  onForgeExploit?: (data: {vulnClass: string, techStack: string, context: string}) => void;
}

interface QueueItem {
  id: string;
  url: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
}

const Dashboard: React.FC<DashboardProps> = ({ language, onForgeExploit }) => {
  const [url, setUrl] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>(['XSS', 'SQLi', 'Headers']);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');
  const [threatReports, setThreatReports] = useState<ThreatReport[]>([]);
  const [isLoadingThreats, setIsLoadingThreats] = useState(true);
  const [activeThreatAnalysis, setActiveThreatAnalysis] = useState<{report: ThreatReport, analysis: string} | null>(null);
  const [isAnalyzingThreat, setIsAnalyzingThreat] = useState(false);
  const [scanHistory, setScanHistory] = useState<any[]>([]);

  // Queue State
  const [scanQueue, setScanQueue] = useState<QueueItem[]>([]);
  const [queueStatus, setQueueStatus] = useState<'idle' | 'running' | 'paused'>('idle');

  const t = useMemo(() => ({
    en: {
      title: 'Security Audit',
      intelFeed: 'Global Threat Intel',
      live: 'LIVE',
      syncing: 'Synchronizing neural threat nodes...',
      placeholder: 'Enter domain or IPv4 address...',
      startBtn: 'Audit Domain',
      scanFailed: 'Audit could not run',
      addToQueue: 'Add to Queue',
      queueTitle: 'Audit Pipeline',
      startQueue: 'Start Pipeline',
      pauseQueue: 'Pause Pipeline',
      clearQueue: 'Clear Pipeline',
      modules: 'Modules',
      analyzing: 'Auditing:',
      posture: 'Security Posture',
      recon: 'Reconnaissance Assets',
      risks: 'Identified Vulnerabilities',
      intel: 'Active Intelligence',
      history: 'Recent Audits',
      execSummary: 'Executive Analysis',
      techImpact: 'Strategic Impact',
      forge: 'Forge Exploit',
      reasoning: 'Neural Reasoning Active',
      grounding: 'OSINT Grounding Active',
      status: {
        pending: 'Pending',
        scanning: 'Scanning',
        completed: 'Completed',
        failed: 'Failed'
      },
      tasks: [
        'Initializing neural handshake...',
        'Resolving target DNS topology...',
        'Mapping public attack surface...',
        'Auditing HTTP security policies...',
        'Probing for XSS injection vectors...',
        'Analyzing SQL injection vulnerabilities...',
        'Fingerprinting technology stack...',
        'Finalizing risk intelligence report...'
      ]
    },
    az: {
      title: 'Təhlükəsizlik Auditi',
      intelFeed: 'Qlobal Təhdid Kəşfiyyatı',
      live: 'CANLI',
      syncing: 'Neyron təhdid düyünləri sinxronlaşdırılır...',
      placeholder: 'Domen və ya IPv4 daxil edin...',
      startBtn: 'Auditi Başlat',
      scanFailed: 'Audit baş tutmadı',
      addToQueue: 'Növbəyə Əlavə Et',
      queueTitle: 'Audit Boru Kəməri',
      startQueue: 'Boru Kəmərini Başlat',
      pauseQueue: 'Boru Kəmərini Dayandır',
      clearQueue: 'Boru Kəmərini Təmizlə',
      modules: 'Modullar',
      analyzing: 'Yoxlanılır:',
      posture: 'Təhlükəsizlik Vəziyyəti',
      recon: 'Kəşfiyyat Aktivləri',
      risks: 'Müəyyən Edilmiş Zəifliklər',
      intel: 'Aktiv Kəşfiyyat',
      history: 'Son Auditlər',
      execSummary: 'İcraçı Analiz',
      techImpact: 'Strateji Təsir',
      forge: 'Payload Hazırla',
      reasoning: 'Neyron Analiz Aktivdir',
      grounding: 'OSINT Axtarışı Aktivdir',
      status: {
        pending: 'Gözləyir',
        scanning: 'Yoxlanılır',
        completed: 'Tamamlandı',
        failed: 'Uğursuz'
      },
      tasks: [
        'Neyron əlaqə yaradılır...',
        'Hədəf DNS topologiyası müəyyən edilir...',
        'İctimai hücum səthi xəritələnir...',
        'HTTP təhlükəsizlik siyasətləri yoxlanılır...',
        'XSS inyeksiya vektorları araşdırılır...',
        'SQL inyeksiya zəiflikləri analiz edilir...',
        'Texnologiya yığını identifikasiya olunur...',
        'Risk kəşfiyyatı hesabatı tamamlanır...'
      ]
    }
  }[language]), [language]);

  useEffect(() => {
    const saved = localStorage.getItem('skywalker_scan_history');
    if (saved) setScanHistory(JSON.parse(saved));
    
    const fetchThreats = async () => {
      try {
        const { threats } = await getLatestThreatIntel();
        setThreatReports(threats);
      } catch (e) { console.error(e); }
      finally { setIsLoadingThreats(false); }
    };
    fetchThreats();
  }, []);

  const handleStartScan = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    setIsScanning(true);
    setScanResult(null);
    setScanError('');
    setScanProgress(5);
    setCurrentTask(t.tasks[0]);
    
    let step = 0;
    const interval = setInterval(() => {
      if (step < t.tasks.length - 1) {
        step++;
        setCurrentTask(t.tasks[step]);
        setScanProgress(prev => Math.min(95, prev + (100 / t.tasks.length)));
      }
    }, 2000);

    try {
      const result = await analyzeDomain(targetUrl, selectedModules);
      clearInterval(interval);
      setScanProgress(100);
      setCurrentTask(t.tasks[t.tasks.length - 1]);
      setScanResult(result);
      
      const newItem = { id: Date.now(), url: targetUrl, score: result.score, date: new Date().toLocaleDateString() };
      const updated = [newItem, ...scanHistory].slice(0, 5);
      setScanHistory(updated);
      localStorage.setItem('skywalker_scan_history', JSON.stringify(updated));
      return result;
    } catch (err) { 
      console.error(err); 
      setScanError(err instanceof Error ? err.message : t.scanFailed);
      clearInterval(interval);
      setScanProgress(0);
      throw err;
    }
    finally { setIsScanning(false); }
  };

  const handleIndividualScan = (e?: React.FormEvent) => {
    e?.preventDefault();
    void handleStartScan(url).catch(() => undefined);
  };

  const addToQueue = () => {
    if (!url.trim()) return;
    const newItem: QueueItem = {
      id: Math.random().toString(36).substr(2, 9),
      url: url,
      status: 'pending'
    };
    setScanQueue(prev => [...prev, newItem]);
    setUrl('');
  };

  const clearQueue = () => {
    setScanQueue([]);
    setQueueStatus('idle');
  };

  const toggleQueue = () => {
    if (queueStatus === 'running') {
      setQueueStatus('paused');
    } else {
      setQueueStatus('running');
    }
  };

  // Process Queue Logic
  useEffect(() => {
    if (queueStatus === 'running' && !isScanning) {
      const nextItemIndex = scanQueue.findIndex(item => item.status === 'pending');
      if (nextItemIndex !== -1) {
        const nextItem = scanQueue[nextItemIndex];
        
        // Mark as scanning
        setScanQueue(prev => prev.map((item, idx) => 
          idx === nextItemIndex ? { ...item, status: 'scanning' } : item
        ));

        // Start scan
        handleStartScan(nextItem.url)
          .then(() => {
            setScanQueue(prev => prev.map((item, idx) => 
              idx === nextItemIndex ? { ...item, status: 'completed' } : item
            ));
          })
          .catch(() => {
            setScanQueue(prev => prev.map((item, idx) => 
              idx === nextItemIndex ? { ...item, status: 'failed' } : item
            ));
          });
      } else if (scanQueue.length > 0 && scanQueue.every(item => item.status !== 'pending' && item.status !== 'scanning')) {
        setQueueStatus('idle');
      }
    }
  }, [queueStatus, isScanning, scanQueue]);

  const handleThreatClick = async (report: ThreatReport) => {
    setIsAnalyzingThreat(true);
    setActiveThreatAnalysis({ report, analysis: '' });
    try {
      const analysis = await analyzeThreatImpact(report);
      setActiveThreatAnalysis({ report, analysis });
    } catch (e) { console.error(e); }
    finally { setIsAnalyzingThreat(false); }
  };

  const handleForge = (risk: any) => {
    if (onForgeExploit) {
      onForgeExploit({
        vulnClass: risk.name,
        techStack: scanResult?.technologies?.[0] || 'Web Application',
        context: `Target: ${url}. Risk: ${risk.name}. Detected severity: ${risk.severity}. Strategic discovery on attack surface.`
      });
    }
  };

  const getQueueStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={14} className="text-slate-600" />;
      case 'scanning': return <Orbit size={14} className="text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle2 size={14} className="text-green-500" />;
      case 'failed': return <AlertCircle size={14} className="text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Intel Feed Ticker */}
      <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-12">
        <div className="flex items-center gap-3 px-6 h-full bg-slate-900 border-r border-slate-800 shrink-0 z-10 shadow-[8px_0_15px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{t.intelFeed}</span>
          </div>
          <span className="text-[9px] font-bold bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded uppercase">{t.live}</span>
        </div>
        <div className="flex-1 relative overflow-hidden h-full flex items-center">
          <div className="animate-marquee whitespace-nowrap flex items-center">
            {isLoadingThreats ? (
              <span className="text-[11px] text-slate-500 italic ml-6 font-medium">{t.syncing}</span>
            ) : (
              threatReports.map((r, i) => (
                <button 
                  key={i} 
                  className="flex items-center gap-3 text-[11px] text-slate-400 mr-16 hover:text-white transition-colors group" 
                  onClick={() => handleThreatClick(r)}
                >
                  <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[9px] ${
                    r.impact === 'Critical' ? 'bg-red-500/10 text-red-500' : 
                    r.impact === 'High' ? 'bg-orange-500/10 text-orange-500' : 
                    'bg-blue-500/10 text-blue-500'
                  }`}>
                    {r.impact}
                  </span>
                  <span className="font-semibold group-hover:underline underline-offset-4 decoration-slate-600">{r.title}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-700 mx-2" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tighter uppercase italic">{t.title}</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium tracking-tight">Autonomous risk discovery & system posture analysis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="card-minimal p-3 bg-slate-900/40">
            <form onSubmit={handleIndividualScan} className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 flex items-center gap-4 px-5 py-4 bg-slate-950 rounded-xl border border-slate-800 focus-within:border-blue-500/40 transition-all shadow-inner">
                <Globe size={18} className="text-slate-600" />
                <input 
                  value={url} 
                  onChange={e => setUrl(e.target.value)} 
                  placeholder={t.placeholder} 
                  className="bg-transparent border-none focus:outline-none w-full text-[14px] font-semibold text-white placeholder:text-slate-700"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={addToQueue}
                  disabled={!url.trim()}
                  className="p-4 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all disabled:opacity-30"
                  title={t.addToQueue}
                >
                  <Plus size={20} />
                </button>
                <button 
                  disabled={isScanning || !url.trim()}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest shadow-lg shadow-blue-900/20 active:scale-95"
                >
                  {isScanning && !queueStatus ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                  {t.startBtn}
                </button>
              </div>
            </form>
          </div>
          {scanError && (
            <p role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              {t.scanFailed}: {scanError}
            </p>
          )}

          {/* Queue Section */}
          {scanQueue.length > 0 && (
            <div className="card-minimal p-8 space-y-6 animate-in fade-in slide-in-from-top-4 border-slate-800 shadow-2xl bg-slate-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ListOrdered size={18} className="text-blue-500" />
                  <h4 className="text-[11px] font-black text-white uppercase tracking-widest">{t.queueTitle}</h4>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={toggleQueue}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${
                      queueStatus === 'running' 
                      ? 'bg-amber-600/10 text-amber-500 border border-amber-500/20' 
                      : 'bg-green-600/10 text-green-500 border border-green-500/20'
                    }`}
                  >
                    {queueStatus === 'running' ? <><Pause size={14} /> {t.pauseQueue}</> : <><Play size={14} /> {t.startQueue}</>}
                  </button>
                  <button 
                    onClick={clearQueue}
                    className="px-4 py-2 bg-slate-950/50 border border-slate-800 text-slate-500 hover:text-red-500 hover:border-red-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
                  >
                    <Trash2 size={14} /> {t.clearQueue}
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {scanQueue.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                      <p className="text-[12px] font-mono text-slate-400 truncate">{item.url}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${
                        item.status === 'completed' ? 'text-green-500' : 
                        item.status === 'scanning' ? 'text-blue-500 animate-pulse' : 
                        item.status === 'failed' ? 'text-red-500' : 'text-slate-600'
                      }`}>
                        {t.status[item.status]}
                      </span>
                      {getQueueStatusIcon(item.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isScanning && (
            <div className="card-minimal p-8 space-y-6 animate-in fade-in slide-in-from-top-4 border-blue-500/20 shadow-2xl shadow-blue-900/10">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Orbit size={20} className="text-blue-500 animate-spin" />
                    <span className="text-[12px] text-white font-black uppercase tracking-widest">{t.analyzing} {url || (scanQueue.find(i => i.status === 'scanning')?.url)}</span>
                  </div>
                  <span className="text-2xl font-mono font-bold text-blue-500">{Math.round(scanProgress)}%</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-950/50 rounded-lg border border-slate-800/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] animate-in fade-in slide-in-from-left-2 duration-500" key={currentTask}>
                      {currentTask}
                    </span>
                  </div>
                  
                  <div className="flex gap-4 px-4">
                    <div className="flex items-center gap-2 text-purple-400 animate-pulse">
                      <BrainCircuit size={14} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{t.reasoning}</span>
                    </div>
                    <div className="flex items-center gap-2 text-cyan-400 animate-pulse delay-75">
                      <SearchCode size={14} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{t.grounding}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-blue-700 to-blue-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)] relative overflow-hidden" 
                  style={{ width: `${scanProgress}%` }}
                >
                   <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] animate-marquee w-[200%]" />
                </div>
              </div>
            </div>
          )}

          {scanResult && !isScanning && (
            <div className="space-y-8 animate-in slide-up duration-500">
              <div className="card-minimal p-10 flex flex-col md:flex-row items-center gap-12 bg-slate-900/20">
                 <div className="w-64 h-64 shrink-0 relative bg-slate-950/40 rounded-full border border-slate-800 p-4 shadow-2xl">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={scanResult.categoryScores}>
                        <PolarGrid stroke="#1e293b" />
                        <PolarAngleAxis dataKey="category" tick={{ fill: '#475569', fontSize: 10, fontWeight: '800' }} />
                        <Radar dataKey="score" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-5 uppercase tracking-tight italic">{t.posture}</h3>
                    <p className="text-[15px] text-slate-400 leading-relaxed mb-8 font-medium">
                       {scanResult.summary}
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                       {scanResult.technologies.slice(0, 6).map((tech: string, i: number) => (
                         <span key={i} className="px-3.5 py-1.5 bg-slate-950 text-[10px] font-bold text-slate-500 border border-slate-800 rounded-lg uppercase tracking-tight">{tech}</span>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="card-minimal p-8 space-y-8">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-3"><Target size={16} className="text-blue-500" /> {t.recon}</h4>
                  <div className="space-y-4">
                    {scanResult.reconnaissance.slice(0, 5).map((item: any, i: number) => (
                      <div key={i} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                        <div className="flex justify-between text-[10px] mb-2">
                          <span className="text-slate-500 font-bold uppercase tracking-widest">{item.type}</span>
                          <span className={`font-black uppercase tracking-tighter px-2 py-0.5 rounded ${item.status.includes('secure') ? 'text-green-500 bg-green-500/10' : 'text-amber-500 bg-amber-500/10'}`}>{item.status}</span>
                        </div>
                        <p className="text-[12px] text-slate-300 font-mono truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card-minimal p-8 space-y-8">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-3"><ShieldAlert size={16} className="text-red-500" /> {t.risks}</h4>
                  <div className="space-y-3">
                    {scanResult.topRisks.slice(0, 5).map((r: any, i: number) => (
                      <div key={i} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between group hover:border-red-500/20 transition-all">
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="text-[13px] font-bold text-white truncate uppercase tracking-tight">{r.name}</p>
                          <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">{r.category}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${
                            r.severity === 'Critical' ? 'text-red-500 bg-red-500/10 border-red-500/20' : 
                            r.severity === 'High' ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' : 
                            'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
                          }`}>
                            {r.severity}
                          </span>
                          <button 
                            onClick={() => handleForge(r)}
                            title={t.forge}
                            className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-500 hover:text-white hover:bg-red-600/20 hover:border-red-500/50 transition-all"
                          >
                            <Terminal size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="card-minimal flex flex-col h-[450px] bg-slate-900/10">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-3">
                <Activity size={16} className="text-blue-500" /> {t.intel}
              </h4>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
              {isLoadingThreats ? Array.from({length: 4}).map((_, i) => <div key={i} className="h-24 bg-slate-900 animate-pulse rounded-xl border border-slate-800" />) : threatReports.map((r, i) => (
                <button 
                  key={i} 
                  onClick={() => handleThreatClick(r)} 
                  className="w-full text-left p-4 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-blue-500/40 hover:bg-slate-900 transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[12px] font-bold text-white line-clamp-1 uppercase tracking-tight group-hover:text-blue-400 transition-colors">{r.title}</p>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                      r.impact === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-slate-900 text-slate-600 border-slate-800'
                    }`}>
                      {r.impact}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-medium">{r.summary}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="card-minimal flex flex-col h-[280px] bg-slate-900/10">
            <div className="p-6 border-b border-slate-800">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-3">
                <History size={16} className="text-slate-600" /> {t.history}
              </h4>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-2.5 custom-scrollbar">
              {scanHistory.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                  <div className="overflow-hidden pr-3">
                    <p className="text-[12px] text-white font-bold truncate tracking-tight">{item.url}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={10} className="text-slate-700" />
                      <p className="text-[10px] text-slate-600 font-mono uppercase">{item.date}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs font-mono font-bold text-blue-500">{item.score}%</span>
                    <span className="text-[8px] font-bold text-slate-700 uppercase tracking-tighter mt-0.5">SCORE</span>
                  </div>
                </div>
              ))}
              {scanHistory.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-8">
                  <History size={32} className="mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No logs found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {activeThreatAnalysis && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="card-minimal w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl bg-slate-950 border-slate-800">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <div className="flex items-center gap-6">
                <div className={`p-4 rounded-2xl ${activeThreatAnalysis.report.impact === 'Critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                  <ShieldAlert size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${activeThreatAnalysis.report.impact === 'Critical' ? 'text-red-500' : 'text-blue-500'}`}>{activeThreatAnalysis.report.impact} IMPACT</span>
                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{activeThreatAnalysis.report.date}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tighter uppercase italic">{activeThreatAnalysis.report.title}</h3>
                </div>
              </div>
              <button onClick={() => setActiveThreatAnalysis(null)} className="p-3 text-slate-500 hover:text-white transition-all bg-slate-900 border border-slate-800 rounded-xl"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
              <section className="space-y-6">
                <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] mb-4">{t.execSummary}</h4>
                <p className="text-[16px] text-slate-300 leading-relaxed font-bold italic bg-blue-600/5 p-8 rounded-2xl border border-blue-500/10 shadow-inner">{activeThreatAnalysis.report.summary}</p>
              </section>
              <section className="space-y-6">
                <h4 className="text-[11px] font-black text-purple-500 uppercase tracking-[0.4em] mb-4">{t.techImpact}</h4>
                {isAnalyzingThreat ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-4">
                    <Loader2 size={40} className="animate-spin text-purple-600" />
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Synthesizing impact vector...</p>
                  </div>
                ) : (
                  <div className="text-[15px] text-slate-400 leading-relaxed font-medium whitespace-pre-wrap bg-slate-900/30 p-8 rounded-2xl border border-slate-800">{activeThreatAnalysis.analysis}</div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;