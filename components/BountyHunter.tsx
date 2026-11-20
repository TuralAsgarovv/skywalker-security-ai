
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Crosshair, Search, Globe, Link as LinkIcon, ExternalLink, 
  FileText, Copy, Check, Wand2, Loader2, Send, Terminal, 
  Target, ShieldAlert, Cpu, AlertCircle, FileCode, CheckCircle2,
  Orbit, ListChecks, Zap, FlaskConical, ClipboardCheck, Trash2, 
  ChevronRight, Bookmark, ArrowRight, Book, Activity, Radar, Database,
  Eye, Lock, ShieldCheck, Bug, Newspaper, Server, Smartphone, CpuIcon,
  Code, HardDrive, Github, Wifi
} from 'lucide-react';
import { synthesizeBountyReport, generateBountyPayload } from '../services/gemini';

interface BountyHunterProps {
  language: 'en' | 'az';
}

type TabType = 'RECON' | 'LAB' | 'REPORT' | 'CHECKLIST';

const BountyHunter: React.FC<BountyHunterProps> = ({ language }) => {
  const [activeTab, setActiveTab] = useState<TabType>('RECON');
  const [domain, setDomain] = useState('');
  
  // Lab State
  const [labVuln, setLabVuln] = useState('');
  const [labFilter, setLabFilter] = useState('');
  const [labResults, setLabResults] = useState<any[] | null>(null);
  const [isLabLoading, setIsLabLoading] = useState(false);

  // Report State
  const [reportVuln, setReportVuln] = useState('');
  const [reportSteps, setReportSteps] = useState('');
  const [reportEvidence, setReportEvidence] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportResult, setReportResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Checklist State
  const [checklist, setChecklist] = useState<{id: string, label: string, done: boolean}[]>([]);
  
  // UI Immersion States
  const [telemetry, setTelemetry] = useState({
    latency: '24ms',
    traffic: '1.2 GB/s',
    activeNodes: 12,
    threatLevel: 'Low'
  });

  const [intelFeed, setIntelFeed] = useState<string[]>([]);

  useEffect(() => {
    const feeds = [
      "NEW BOUNTY: $5,000 paid for SSRF in major fintech app",
      "DISCLOSURE: CVE-2025-9921 patched in core CMS modules",
      "INTEL: Exposed S3 buckets found on 12 subdomains of 'target.com'",
      "TREND: GraphQL introspection being used for massive IDOR discovery",
      "ADVISORY: New bypass for Cloudflare WAF detected in wild",
      "BREACH: Credential leak detected in .env file on public staging server",
      "SIGNAL: New IoT exploit kit circulating in dark-web forums"
    ];
    setIntelFeed(feeds);

    const timer = setInterval(() => {
      setTelemetry({
        latency: `${Math.floor(Math.random() * 15 + 15)}ms`,
        traffic: `${(Math.random() * 0.5 + 1.1).toFixed(1)} GB/s`,
        activeNodes: Math.floor(Math.random() * 3 + 10),
        threatLevel: Math.random() > 0.8 ? 'Elevated' : 'Stable'
      });
      
      setIntelFeed(prev => {
        const next = [...prev];
        const item = next.shift();
        if (item) next.push(item);
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const t = useMemo(() => ({
    en: {
      title: 'Bounty Command',
      subtitle: 'Tactical Reconnaissance & Exploit Synthesis Hub V2.8',
      tabs: {
        recon: 'Neural Recon',
        lab: 'Bypass Lab',
        report: 'H1 Architect',
        checklist: 'Objective Board'
      },
      recon: {
        title: 'Deep OSINT Engine',
        catCloud: 'Cloud Infrastructure',
        catApi: 'API & Endpoints',
        catMobile: 'Mobile & DeepLinks',
        catPrograms: 'Bug Bounty Search',
        catIot: 'IoT & Network',
        catGithub: 'GitHub Leaks'
      },
      lab: {
        title: 'Neural Payload Lab',
        btn: 'Iterate Bypasses',
        variants: 'Synthesized Vectors'
      }
    },
    az: {
      title: 'Bounty Əmri',
      subtitle: 'Taktiki Kəşfiyyat və Eksployt Sintez Mərkəzi V2.8',
      tabs: {
        recon: 'Neyron Kəşfiyyat',
        lab: 'Bypass Lab',
        report: 'H1 Memarlığı',
        checklist: 'Məqsəd Paneli'
      },
      recon: {
        title: 'Dərin OSINT Mühərriki',
        catCloud: 'Bulud İnfrastrukturu',
        catApi: 'API və Giriş Nöqtələri',
        catMobile: 'Mobil və DeepLink',
        catPrograms: 'Bounty Proqram Axtarışı',
        catIot: 'IoT və Şəbəkə',
        catGithub: 'GitHub Sızmaları'
      },
      lab: {
        title: 'Neyron Payload Laboratoriyası',
        btn: 'Bypass-ları Hazırla',
        variants: 'Sintez Edilmiş Vektorlar'
      }
    }
  }[language]), [language]);

  const CHECKLIST_ITEMS = useMemo(() => [
    { id: '1', label: 'Check for Information Disclosure in /robots.txt & /sitemap.xml' },
    { id: '2', label: 'Search for exposed .git, .env, .ds_store, and .svn directories' },
    { id: '3', label: 'Analyze JS files for hardcoded API keys and secret tokens' },
    { id: '4', label: 'Test IDOR on /api/v1/user/{id} and sensitive endpoints' },
    { id: '5', label: 'Verify SPF/DMARC/DKIM records for potential Email Spoofing' },
    { id: '6', label: 'Test for Insecure CORS (Access-Control-Allow-Origin: *)' },
    { id: '7', label: 'Check for Subdomain Takeovers on dead DNS/CNAME links' },
    { id: '8', label: 'Probe for Hidden Parameters using Arjun or custom wordlists' },
    { id: '9', label: 'Check for SSRF via file://, gopher://, and internal IP ranges' },
    { id: '10', label: 'Analyze JWT for "none" algorithm and secret brute-force' },
    { id: '11', label: 'Test for Password Reset Poisoning via Host Header manipulation' },
    { id: '12', label: 'Identify and test GraphQL Introspection for schema leak' },
    { id: '13', label: 'Audit /admin and /internal endpoints for lack of 2FA' },
    { id: '14', label: 'Check for dangling DNS records pointing to Shopify/GitHub/Heroku' }
  ], []);

  useEffect(() => {
    const saved = localStorage.getItem('skywalker_bounty_checklist_v2');
    if (saved) {
      setChecklist(JSON.parse(saved));
    } else {
      setChecklist(CHECKLIST_ITEMS.map(i => ({ ...i, done: false })));
    }
  }, [CHECKLIST_ITEMS]);

  const toggleCheck = (id: string) => {
    const updated = checklist.map(item => item.id === id ? { ...item, done: !item.done } : item);
    setChecklist(updated);
    localStorage.setItem('skywalker_bounty_checklist_v2', JSON.stringify(updated));
  };

  const DORK_GROUPS = [
    { cat: 'cloud', label: t.recon.catCloud, icon: Server, dorks: [
      { label: 'AWS S3 Buckets', q: 'site:s3.amazonaws.com "%DOMAIN%"' },
      { label: 'Azure Blobs', q: 'site:blob.core.windows.net "%DOMAIN%"' },
      { label: 'Firebase DB', q: 'site:firebaseio.com "%DOMAIN%"' },
      { label: 'Digital Ocean', q: 'site:digitaloceanspaces.com "%DOMAIN%"' }
    ]},
    { cat: 'api', label: t.recon.catApi, icon: Code, dorks: [
      { label: 'Swagger UI', q: 'site:%DOMAIN% intitle:swagger OR inurl:api-docs' },
      { label: 'GraphQL Editor', q: 'site:%DOMAIN% inurl:graphql OR inurl:graphiql' },
      { label: 'API Keys', q: 'site:%DOMAIN% ext:json OR ext:xml "api_key"' },
      { label: 'Postman Collections', q: 'site:postman.com "%DOMAIN%"' }
    ]},
    { cat: 'github', label: t.recon.catGithub, icon: Github, dorks: [
      { label: 'GitHub Secrets', q: 'site:github.com "%DOMAIN%" "sh" "password" "auth"' },
      { label: 'GitLab Leaks', q: 'site:gitlab.com "%DOMAIN%" "id_rsa" OR "PRIVATE KEY"' },
      { label: 'Gist Discovery', q: 'site:gist.github.com "%DOMAIN%"' }
    ]},
    { cat: 'iot', label: t.recon.catIot, icon: Wifi, dorks: [
      { label: 'Network Login', q: 'site:%DOMAIN% intitle:"login" "network"' },
      { label: 'IP Cameras', q: 'site:%DOMAIN% intitle:"webcamXP" OR intitle:"IP Camera"' },
      { label: 'Router Panels', q: 'site:%DOMAIN% intitle:"Router" "admin"' }
    ]}
  ];

  const handleLabSynth = async () => {
    if (!labVuln || !labFilter) return;
    setIsLabLoading(true);
    setLabResults(null);
    try {
      const data = await generateBountyPayload(labVuln, labFilter);
      setLabResults(data.variants);
    } catch (err) { console.error(err); }
    finally { setIsLabLoading(false); }
  };

  const handleGenerateReport = async () => {
    if (!reportVuln || !domain || !reportSteps) return;
    setIsGenerating(true);
    setReportResult(null);
    try {
      const result = await synthesizeBountyReport(reportVuln, domain, reportSteps, reportEvidence);
      setReportResult(result);
    } catch (err) { console.error(err); }
    finally { setIsGenerating(false); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openDork = (q: string) => {
    const d = domain || 'example.com';
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q.replace('%DOMAIN%', d))}`, '_blank');
  };

  return (
    <div className="space-y-12 animate-in slide-up pb-12 hud-grid min-h-screen">
      <div className="scanline"></div>

      {/* Header HUD */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-900/50 pb-10 relative">
        <div className="absolute -top-20 -left-20 opacity-[0.03] pointer-events-none">
          <Radar size={400} className="text-cyan-500 animate-spin-slow" />
        </div>
        
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-6 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
             <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase flex items-center gap-4">
               {t.title}
             </h1>
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] ml-5">{t.subtitle}</p>
        </div>

        <div className="flex p-1.5 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl w-fit relative z-10 shadow-2xl">
          {(Object.keys(t.tabs) as TabType[]).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2.5 ${
                activeTab === tab 
                  ? 'bg-cyan-600 text-white shadow-[0_0_25px_rgba(6,182,212,0.3)]' 
                  : 'text-slate-500 hover:text-slate-200'
              }`}
            >
              {tab === 'RECON' && <Globe size={14} />}
              {tab === 'LAB' && <FlaskConical size={14} />}
              {tab === 'REPORT' && <FileCode size={14} />}
              {tab === 'CHECKLIST' && <ListChecks size={14} />}
              {t.tabs[tab.toLowerCase() as keyof typeof t.tabs]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
        {/* Left Tactical Panel */}
        <div className="lg:col-span-3 space-y-6">
          <div className="card-minimal p-6 space-y-6 bg-slate-900/20 border-cyan-500/10 glow-cyan">
            <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
              <div className="flex items-center gap-3">
                <Target size={18} className="text-cyan-500" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Target Scope</h3>
              </div>
              <Activity size={16} className="text-cyan-500/40 animate-pulse" />
            </div>
            
            <div className="space-y-4">
              <input 
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="e.g. target.com"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-[13px] text-cyan-400 font-mono focus:border-cyan-500 transition-all outline-none"
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                 <div className="bg-slate-950/40 border border-slate-800/50 p-3 rounded-xl flex flex-col gap-1">
                    <span className="text-[8px] font-black text-slate-600 uppercase">Latency</span>
                    <span className="text-[10px] font-mono text-cyan-500 font-bold">{telemetry.latency}</span>
                 </div>
                 <div className="bg-slate-950/40 border border-slate-800/50 p-3 rounded-xl flex flex-col gap-1">
                    <span className="text-[8px] font-black text-slate-600 uppercase">Threat</span>
                    <span className={`text-[10px] font-mono font-bold ${telemetry.threatLevel === 'Elevated' ? 'text-red-500' : 'text-green-500'}`}>{telemetry.threatLevel}</span>
                 </div>
              </div>

              <div className="pt-4 border-t border-slate-800/50 space-y-4">
                <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500 tracking-widest">
                  <span>Objective Completion</span>
                  <span className="text-cyan-400">{Math.round((checklist.filter(c => c.done).length / (checklist.length || 1)) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000" 
                    style={{ width: `${(checklist.filter(c => c.done).length / (checklist.length || 1)) * 100}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card-minimal p-6 bg-slate-900/10 border-slate-800/50 overflow-hidden">
             <div className="flex items-center gap-3 text-cyan-500 mb-4 border-b border-slate-800/50 pb-2">
                <Newspaper size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Global Bounty Feed</span>
             </div>
             <div className="space-y-3">
               {intelFeed.map((msg, i) => (
                 <div key={i} className={`text-[10px] leading-relaxed transition-opacity duration-1000 ${i === 0 ? 'text-cyan-400 font-bold' : 'text-slate-600 opacity-60'}`}>
                   {i === 0 && <span className="mr-2">{'>>>'}</span>}
                   {msg}
                 </div>
               ))}
             </div>
          </div>
          
          <div className="card-minimal p-6 bg-slate-950/20 border-slate-800/50 flex flex-col gap-4">
             <div className="flex items-center gap-3 text-purple-500">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Sec-Researcher Intel</span>
             </div>
             <p className="text-[11px] text-slate-500 font-medium italic leading-relaxed">
                Check for <span className="text-purple-400">Broken Object Level Authorization (BOLA)</span>. It accounts for 40% of critical rewards in modern API-driven SaaS platforms.
             </p>
          </div>
        </div>

        {/* Dynamic Operation Center */}
        <div className="lg:col-span-9">
          {activeTab === 'RECON' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-4 mb-2">
                 <Terminal size={24} className="text-cyan-500" />
                 <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{t.recon.title}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {DORK_GROUPS.map((group) => (
                  <div key={group.cat} className="card-minimal p-8 space-y-6 bg-slate-900/10 border-slate-800/80 hover:border-cyan-500/30">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-cyan-500 pl-4 flex items-center gap-3">
                          <group.icon size={14} className="text-cyan-500" />
                          {group.label}
                       </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {group.dorks.map((d, i) => (
                        <button 
                          key={i} 
                          onClick={() => openDork(d.q)}
                          className="group flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800/50 rounded-2xl hover:border-cyan-500/50 hover:bg-slate-900 transition-all"
                        >
                          <span className="text-[11px] font-bold text-slate-500 group-hover:text-cyan-400">{d.label}</span>
                          <Search size={12} className="text-slate-800 group-hover:text-cyan-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'CHECKLIST' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between border-b border-slate-900/50 pb-4">
                <div className="flex items-center gap-4">
                   <ListChecks size={24} className="text-cyan-500" />
                   <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{t.tabs.checklist}</h2>
                </div>
                <button 
                  onClick={() => setChecklist(CHECKLIST_ITEMS.map(i => ({ ...i, done: false })))} 
                  className="px-5 py-2.5 bg-slate-900/40 border border-slate-800 text-slate-500 hover:text-red-500 hover:border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                {checklist.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={`flex items-start gap-4 p-5 rounded-2xl border transition-all text-left group/item ${
                      item.done 
                        ? 'bg-cyan-600/5 border-cyan-500/20' 
                        : 'bg-slate-900/40 border-slate-800 hover:border-cyan-500/30 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                      item.done 
                        ? 'bg-cyan-600 text-white' 
                        : 'bg-slate-950 border border-slate-800 text-slate-700'
                    }`}>
                      {item.done ? <Check size={14} /> : <div className="w-1 h-1 rounded-full bg-slate-800" />}
                    </div>
                    <span className={`text-[12px] font-bold tracking-tight transition-all leading-tight ${
                      item.done ? 'text-slate-500 line-through opacity-50' : 'text-slate-300'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'LAB' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-4 mb-2">
                 <FlaskConical size={24} className="text-cyan-500" />
                 <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{t.lab.title}</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="card-minimal p-10 space-y-8 bg-slate-900/10 border-cyan-500/10 glow-cyan">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Vuln Context</label>
                      <input 
                        value={labVuln}
                        onChange={e => setLabVuln(e.target.value)}
                        placeholder="e.g. Stored XSS in /profile"
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-[13px] text-white focus:border-cyan-500 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Observed Filters</label>
                      <textarea 
                        value={labFilter}
                        onChange={e => setLabFilter(e.target.value)}
                        placeholder="e.g. filters 'script' and 'on*' handlers"
                        className="w-full h-40 bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-[13px] text-white focus:border-cyan-500 transition-all outline-none resize-none"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleLabSynth}
                    disabled={isLabLoading || !labVuln || !labFilter}
                    className="w-full py-5 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-black rounded-2xl transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)] flex items-center justify-center gap-4 uppercase tracking-[0.2em] disabled:opacity-50"
                  >
                    {isLabLoading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                    {isLabLoading ? 'Neural Synthesis...' : t.lab.btn}
                  </button>
                </div>

                <div className="card-minimal flex flex-col bg-slate-950/40 border-slate-800/80 shadow-2xl overflow-hidden relative min-h-[500px]">
                   <div className="px-8 py-6 border-b border-slate-900 bg-slate-900/40 flex items-center justify-between">
                     <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{t.lab.variants}</h3>
                   </div>

                   <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                     {isLabLoading ? (
                       <div className="h-full flex flex-col items-center justify-center space-y-6">
                          <Orbit size={64} className="animate-spin text-cyan-500" />
                       </div>
                     ) : labResults ? (
                       <div className="space-y-6 animate-in slide-up">
                          {labResults.map((v, i) => (
                            <div key={i} className="space-y-4 p-6 bg-slate-900/50 border border-slate-800 rounded-2xl group hover:border-cyan-500/40 transition-all shadow-lg">
                               <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black px-3 py-1 rounded-lg border bg-cyan-500/10 text-cyan-500 border-cyan-500/20">{v.level}</span>
                                  <button onClick={() => handleCopy(v.payload)} className="p-2 text-slate-600 hover:text-cyan-500 transition-all hover:bg-slate-800 rounded-lg"><Copy size={14}/></button>
                               </div>
                               <code className="block text-[12px] text-cyan-400 font-mono break-all bg-black p-5 rounded-xl border border-slate-800/50">{v.payload}</code>
                               <p className="text-[11px] text-slate-500 font-medium italic">{v.explanation}</p>
                            </div>
                          ))}
                       </div>
                     ) : (
                       <div className="h-full flex flex-col items-center justify-center opacity-10">
                          <FlaskConical size={100} className="mb-6" />
                       </div>
                     )}
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'REPORT' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-4 mb-2">
                 <FileCode size={24} className="text-cyan-500" />
                 <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{t.report.title}</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="card-minimal p-10 space-y-8 bg-slate-900/10 border-slate-800">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Vulnerability Type</label>
                      <input 
                        value={reportVuln}
                        onChange={e => setReportVuln(e.target.value)}
                        placeholder="e.g. Critical SQLi on /search"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-[13px] text-white focus:border-cyan-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Reproduction Steps</label>
                      <textarea 
                        value={reportSteps}
                        onChange={e => setReportSteps(e.target.value)}
                        placeholder="Detailed reproduction logic..."
                        className="w-full h-40 bg-slate-950 border border-slate-800 rounded-xl p-4 text-[13px] text-white focus:border-cyan-500 outline-none resize-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Proof of Concept</label>
                      <input 
                        value={reportEvidence}
                        onChange={e => setReportEvidence(e.target.value)}
                        placeholder="Reference URL or PoC value..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-[13px] text-white focus:border-cyan-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleGenerateReport} 
                    disabled={isGenerating || !reportVuln || !domain}
                    className="w-full py-5 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-black rounded-2xl transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)] flex items-center justify-center gap-4 uppercase tracking-[0.2em] disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                    {isGenerating ? 'Structuring...' : t.report.btn}
                  </button>
                </div>

                <div className="card-minimal flex flex-col bg-slate-950/40 border-slate-800/80 shadow-2xl min-h-[600px] overflow-hidden">
                   <div className="px-8 py-6 border-b border-slate-900 bg-slate-900/40 flex items-center justify-between">
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">HackerOne Payload</h3>
                      {reportResult && (
                        <button 
                          onClick={() => handleCopy(reportResult.markdown)}
                          className="px-5 py-2 bg-cyan-600/10 text-cyan-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-cyan-500/20 flex items-center gap-2 hover:bg-cyan-600/20"
                        >
                          {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                          Copy
                        </button>
                      )}
                   </div>
                   <div className="flex-1 p-10 overflow-y-auto custom-scrollbar relative">
                      {isGenerating ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-6">
                           <Orbit size={64} className="animate-spin text-cyan-500" />
                        </div>
                      ) : reportResult ? (
                        <div className="space-y-10 animate-in slide-up">
                           <div className="grid grid-cols-2 gap-6">
                              <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 shadow-lg">
                                 <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Severity</p>
                                 <span className={`text-[13px] font-black uppercase tracking-tighter ${reportResult.severity.includes('Critical') ? 'text-red-500' : 'text-cyan-400'}`}>{reportResult.severity}</span>
                              </div>
                              <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 shadow-lg">
                                 <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">CVSS V3.1</p>
                                 <p className="text-[11px] font-mono font-bold text-slate-300">{reportResult.cvss}</p>
                              </div>
                           </div>
                           
                           <section className="space-y-4">
                              <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest border-l-2 border-cyan-500 pl-4">Impact Analysis</h4>
                              <p className="text-[14px] text-slate-400 font-bold italic bg-cyan-600/5 p-6 rounded-2xl border border-cyan-500/10 leading-relaxed shadow-inner">{reportResult.impactSummary}</p>
                           </section>
                           
                           <section className="space-y-4">
                              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-l-2 border-slate-800 pl-4">Full Markdown</h4>
                              <pre className="bg-black/80 p-8 rounded-2xl border border-slate-800/80 font-mono text-[12px] text-slate-400 whitespace-pre-wrap leading-relaxed shadow-2xl">{reportResult.markdown}</pre>
                           </section>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-10">
                           <FileCode size={120} />
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .animate-spin-slow { animation: spin 12s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default BountyHunter;
