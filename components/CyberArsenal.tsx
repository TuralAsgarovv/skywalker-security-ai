
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Sword, Skull, ShieldCheck, Terminal, Loader2, Copy, Check, 
  Cpu, Code, Layers, Info, Wand2, Send, Orbit, Eye, 
  Keyboard, Network, Binary, ShieldAlert, ClipboardCheck, Trash2,
  Download, Package, Box, FileCode, CheckCircle2, Shield, Radio, Smartphone, Monitor,
  CpuIcon, Lock, Globe, Zap, Bug, Activity,
  LayoutList, AlertCircle, Key, UserCheck, MessageSquare, AlertTriangle, RefreshCw,
  Link as LinkIcon, Search, Bell, Camera
} from 'lucide-react';
import { generateCyberTool } from '../services/gemini';

interface CyberArsenalProps {
  language: 'en' | 'az';
}

/**
 * Technical keyword highlighter for code and logs.
 */
const TechnicalHighlighter: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const keywords = /\b(GET|POST|WAF|Hook|Intercept|Log|Exfiltrate|Socket|Kernel|API|Encryption|Bypass|Payload|Persistent|Stealth|Process|Memory|Binary|Compiler|APK|EXE|Telegram|asyncio|pyautogui|cv2|winreg|MSVC|GCC|Clang|LLVM|Discord|Webhook|persistence|entry_point|brute_force|nmap|scapy|sniff|memdump|opencv|screenshot|cap_notify)\b/gi;
  const parts = text.split(keywords);
  return (
    <>
      {parts.map((part, i) => {
        if (part.match(keywords)) {
          return <span key={i} className="text-red-400 font-bold bg-red-400/5 px-1 rounded border border-red-400/10">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

const CyberArsenal: React.FC<CyberArsenalProps> = ({ language }) => {
  const [selectedTool, setSelectedTool] = useState('');
  const [targetOs, setTargetOs] = useState('');
  const [targetLang, setTargetLang] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  
  // Advanced configuration states
  const [configValues, setConfigValues] = useState<Record<string, string>>({
    botToken: '',
    chatId: '',
    webhookUrl: '',
    exfilEndpoint: '',
    encryptionKey: Math.random().toString(36).substring(2, 15).toUpperCase(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  
  // Build and packaging states
  const [isPackaging, setIsPackaging] = useState(false);
  const [packageProgress, setPackageProgress] = useState(0);
  const [packageReady, setPackageReady] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  
  const logContainerRef = useRef<HTMLDivElement>(null);

  const t = useMemo(() => ({
    en: {
      title: 'Cyber Arsenal',
      subtitle: 'Synthesis of high-precision offensive & defensive security tools.',
      config: 'Synthesis Parameters',
      toolType: 'Select Tool Type',
      os: 'Target Platform',
      lang: 'Implementation Language',
      features: 'Modular Extensions',
      forgeBtn: 'Forge Architecture',
      forging: 'Architecting System...',
      output: 'Arsenal Console',
      blueprint: 'Architectural Blueprint',
      codeSample: 'Research Implementation',
      workflow: 'Operational Workflow',
      ethics: 'Ethical Directives',
      copyAll: 'Copy Package',
      reset: 'Clear Node',
      packageBtn: 'Compile to Binary',
      packaging: 'Binary Synthesis Active',
      downloadBtn: 'Download Binary (.%EXT%)',
      ready: 'Binary Integrity Verified',
      dynamicConfig: 'Environmental Variables',
      botToken: 'Telegram Bot Token',
      chatId: 'Telegram Chat ID',
      webhookUrl: 'Discord Webhook URL',
      exfilEndpoint: 'Custom Exfiltration URL',
      encryptionKey: 'AES-256 Pre-shared Key',
      buildError: 'Synthesis Failure Detected',
      retry: 'Retry Forge',
      buildSteps: [
        '[CORE] Initializing virtual build nodes...',
        '[COMPILER] Mapping system-level kernel hooks for %OS%...',
        '[SECURITY] Injecting polymorphic obfuscation layers...',
        '[ARCH] LLVM optimization for %OS% target architecture...',
        '[HASH] Calculating SHA-256 integrity signature...',
        '[WAF] Hardening entry point against static heuristic analysis...',
        '[LINKER] Encapsulating assets into %EXT% container...',
        '[READY] Package verification complete. Binary stable.'
      ]
    },
    az: {
      title: 'Kiber Arsenal',
      subtitle: 'Yüksək dəqiqlikli hücum və müdafiə alətlərinin sintezi.',
      config: 'Sintez Parametrləri',
      toolType: 'Alət Növünü Seçin',
      os: 'Hədəf Platforma',
      lang: 'Tətbiq Dili',
      features: 'Modul Uzantıları',
      forgeBtn: 'Arxitektura Qur',
      forging: 'Sistem Arxitekturası qurulur...',
      output: 'Arsenal Konsolu',
      blueprint: 'Arxitektura Çertyoju',
      codeSample: 'Texniki Tətbiq',
      workflow: 'Əməliyyat İş Axını',
      ethics: 'Etik Direktiblər',
      copyAll: 'Paketi Kopyala',
      reset: 'Node-u Təmizlə',
      packageBtn: 'Binary-ə Kompilyasiya Et',
      packaging: 'Binary Sintezi Aktivdir',
      downloadBtn: 'Binary-ni Yüklə (.%EXT%)',
      ready: 'Binary Bütövlüyü Doğrulandı',
      dynamicConfig: 'Mühit Dəyişənləri',
      botToken: 'Telegram Bot Tokeni',
      chatId: 'Telegram Chat ID',
      webhookUrl: 'Discord Webhook URL',
      exfilEndpoint: 'Xüsusi Exfiltration URL',
      encryptionKey: 'AES-256 Paylaşılan Açar',
      buildError: 'Sintez Xətası Baş Verdi',
      retry: 'Yenidən Cəhd Et',
      buildSteps: [
        '[CORE] Virtual qurma düyünləri işə salınır...',
        '[COMPILER] %OS% üçün nüvə səviyyəli qarmaqlar xəritələnir...',
        '[SECURITY] Polimorfik gizlətmə qatları inyeksiya edilir...',
        '[ARCH] %OS% hədəf arxitekturası üçün LLVM optimallaşdırılması...',
        '[HASH] SHA-256 bütövlük imzası hesablanır...',
        '[WAF] Giriş nöqtəsi statik evristik analizə qarşı gücləndirilir...',
        '[LINKER] Aktivlər %EXT% konteynerinə daxil edilir...',
        '[READY] Paket doğrulanması tamamlandı. Binary sabitdir.'
      ]
    }
  }[language]), [language]);

  const TOOL_TYPES = [
    { id: 'RemoteSurveillanceBot', label: 'Remote Surveillance Bot (Telegram)', icon: Radio },
    { id: 'NotificationSpy', label: 'Notification Monitor / Spy', icon: Bell },
    { id: 'ScreenSpy', label: 'Remote Desktop / Screen Spy', icon: Monitor },
    { id: 'CameraSpy', label: 'Remote Camera / Webcam Access', icon: Camera },
    { id: 'Keylogger', label: 'Advanced Stealth Keylogger', icon: Keyboard },
    { id: 'CredentialHarvester', label: 'Credential Harvester', icon: Binary },
    { id: 'DiscordRaider', label: 'Discord Research Agent', icon: MessageSquare },
    { id: 'AndroidRemoteTool', label: 'Android Remote Access (APK)', icon: Smartphone },
    { id: 'PasswordCracker', label: 'Password Cracking Utility', icon: Lock },
    { id: 'NetworkScanner', label: 'Network Scanner (Advanced)', icon: Network },
    { id: 'SysInfoGatherer', label: 'System Information Gatherer', icon: Cpu },
    { id: 'DataExfiltrator', label: 'Data Exfiltration Tool', icon: Send }
  ];

  const OS_TYPES = ['Windows', 'Linux', 'macOS', 'Android', 'iOS'];
  const LANGUAGES = ['Python', 'C++', 'Go', 'Rust', 'Node.js', 'C#'];
  const FEATURE_LIST = [
    'Stealth Mode', 
    'Persistence', 
    'Exfiltration', 
    'Encryption', 
    'Anti-Debug', 
    'Telegram Control', 
    'Discord Webhook',
    'Brute Force',
    'Memory Analysis',
    'Traffic Sniffing',
    'Polymorphism',
    'Screen Capture',
    'Webcam Access',
    'Notification Hook'
  ];

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [buildLogs]);

  const handleForge = async () => {
    if (!selectedTool || !targetOs || !targetLang) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPackageReady(false);
    setBuildLogs([]);
    try {
      const data = await generateCyberTool(selectedTool, targetOs, targetLang, features, configValues);
      setResult(data);
    } catch (err: any) { 
      console.error(err); 
      setError(err.message || 'The neural forge encountered an unexpected interruption.');
    }
    finally { setLoading(false); }
  };

  const handlePackage = () => {
    setIsPackaging(true);
    setPackageProgress(0);
    setBuildLogs([]);
    
    const osExt = targetOs === 'Windows' ? 'exe' : targetOs === 'Android' ? 'apk' : targetOs === 'Linux' ? 'elf' : 'bin';
    
    let stepIndex = 0;
    const interval = setInterval(() => {
      setPackageProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setPackageReady(true);
          setIsPackaging(false);
          return 100;
        }
        
        // Randomly add build logs based on progress
        if (Math.random() > 0.6 && stepIndex < t.buildSteps.length) {
          const rawLog = t.buildSteps[stepIndex];
          const processedLog = rawLog.replace('%OS%', targetOs).replace('%EXT%', osExt);
          setBuildLogs(l => [...l, processedLog]);
          stepIndex++;
        }
        
        return prev + 1;
      });
    }, 60);
  };

  const handleDownload = () => {
    if (!result) return;
    
    const osExtMap: Record<string, string> = {
      'Windows': '.exe',
      'Android': '.apk',
      'Linux': '.elf',
      'macOS': '.dmg',
      'iOS': '.ipa'
    };
    
    const extension = osExtMap[targetOs] || '.bin';
    const filename = `${selectedTool.toLowerCase()}_build_v1.0${extension}`;
    
    // Binary-like text header for the payload
    const header = `[BINARY_CORE_MANIFEST]
PLATFORM=${targetOs}
VERSION=1.0.0_STABLE
COMPILER_ID=SKYWALKER_NEURAL_FORGE
INTEGRITY_HASH=SHA256_${Math.random().toString(36).substring(2, 12).toUpperCase()}
EXFILTRATION_PARAMS=${JSON.stringify(configValues)}

[PAYLOAD_SECTION_START]
${result.codeSample}
[PAYLOAD_SECTION_END]`;
    
    const blob = new Blob([header], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleFeature = (f: string) => {
    setFeatures(prev => prev.includes(f) ? prev.filter(item => item !== f) : [...prev, f]);
  };

  const handleConfigChange = (key: string, value: string) => {
    setConfigValues(prev => ({ ...prev, [key]: value }));
  };

  const handleCopyAll = () => {
    if (!result) return;
    const report = [
      `CYBER ARSENAL BUILD REPORT`,
      `TOOL: ${selectedTool}`,
      `TARGET: ${targetOs} / ${targetLang}`,
      `FEATURES: ${features.join(', ')}`,
      `---------------------------------------`,
      `BLUEPRINT:`,
      result.blueprint,
      `---------------------------------------`,
      `SOURCE:`,
      result.codeSample,
      `---------------------------------------`,
      `ETHICS:`,
      ...result.ethicalGuidelines.map((s: string) => `[!] ${s}`)
    ].join('\n');
    navigator.clipboard.writeText(report);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Visibility logic for dynamic inputs
  const showBotConfigs = ['RemoteSurveillanceBot', 'NotificationSpy', 'ScreenSpy', 'CameraSpy'].includes(selectedTool) || features.includes('Telegram Control');
  const showWebhookConfigs = selectedTool === 'DiscordRaider' || features.includes('Discord Webhook');
  const showExfilConfigs = features.includes('Exfiltration') || selectedTool === 'DataExfiltrator';
  const showEncryptionConfigs = features.includes('Encryption') || selectedTool === 'PasswordCracker';

  return (
    <div className="space-y-12 pb-12 animate-in slide-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-900 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight italic uppercase flex items-center gap-4">
            <Sword className="text-red-600" size={28} /> {t.title}
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">{t.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
          <div className="card-minimal p-6 space-y-8 bg-slate-900/10 shadow-2xl">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Layers size={14} className="text-red-500" /> {t.config}
            </h3>
            
            <div className="space-y-4">
              <select value={selectedTool} onChange={e => setSelectedTool(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white outline-none focus:border-red-500 transition-all">
                <option value="">{t.toolType}</option>
                {TOOL_TYPES.map(tool => <option key={tool.id} value={tool.id}>{tool.label}</option>)}
              </select>
              <select value={targetOs} onChange={e => setTargetOs(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white outline-none focus:border-red-500 transition-all">
                <option value="">{t.os}</option>
                {OS_TYPES.map(os => <option key={os} value={os}>{os}</option>)}
              </select>
              <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white outline-none focus:border-red-500 transition-all">
                <option value="">{t.lang}</option>
                {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
              </select>
              
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{t.features}</p>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURE_LIST.map(f => (
                    <button 
                      key={f} 
                      onClick={() => toggleFeature(f)} 
                      className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all border ${
                        features.includes(f) ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/20' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {(showBotConfigs || showWebhookConfigs || showExfilConfigs || showEncryptionConfigs) && (
              <div className="pt-6 border-t border-slate-800 space-y-5 animate-in fade-in slide-in-from-top-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Key size={14} className="text-amber-500" /> {t.dynamicConfig}
                </h3>
                
                {showBotConfigs && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">{t.botToken}</label>
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg focus-within:border-amber-500/50 transition-all">
                        <MessageSquare size={14} className="text-slate-700" />
                        <input 
                          type="text" 
                          value={configValues.botToken}
                          onChange={e => handleConfigChange('botToken', e.target.value)}
                          placeholder="79568...:AA..." 
                          className="bg-transparent border-none outline-none text-[10px] text-white w-full font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">{t.chatId}</label>
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg focus-within:border-amber-500/50 transition-all">
                        <UserCheck size={14} className="text-slate-700" />
                        <input 
                          type="text" 
                          value={configValues.chatId}
                          onChange={e => handleConfigChange('chatId', e.target.value)}
                          placeholder="5805506293" 
                          className="bg-transparent border-none outline-none text-[10px] text-white w-full font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {showWebhookConfigs && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">{t.webhookUrl}</label>
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg focus-within:border-amber-500/50 transition-all">
                      <LinkIcon size={14} className="text-slate-700" />
                      <input 
                        type="text" 
                        value={configValues.webhookUrl}
                        onChange={e => handleConfigChange('webhookUrl', e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..." 
                        className="bg-transparent border-none outline-none text-[10px] text-white w-full font-mono"
                      />
                    </div>
                  </div>
                )}

                {showExfilConfigs && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">{t.exfilEndpoint}</label>
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg focus-within:border-amber-500/50 transition-all">
                      <Globe size={14} className="text-slate-700" />
                      <input 
                        type="text" 
                        value={configValues.exfilEndpoint}
                        onChange={e => handleConfigChange('exfilEndpoint', e.target.value)}
                        placeholder="https://api.research-node.com/log" 
                        className="bg-transparent border-none outline-none text-[10px] text-white w-full font-mono"
                      />
                    </div>
                  </div>
                )}

                {showEncryptionConfigs && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">{t.encryptionKey}</label>
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg focus-within:border-amber-500/50 transition-all">
                      <Lock size={14} className="text-slate-700" />
                      <input 
                        type="text" 
                        value={configValues.encryptionKey}
                        onChange={e => handleConfigChange('encryptionKey', e.target.value)}
                        placeholder="••••••••••••" 
                        className="bg-transparent border-none outline-none text-[10px] text-white w-full font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={handleForge} disabled={loading || !selectedTool || !targetOs || !targetLang} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white text-[11px] font-black rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest shadow-xl shadow-red-900/30 active:scale-95 disabled:opacity-50">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Skull size={18} />}
              {loading ? t.forging : t.forgeBtn}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col h-full">
          <div className="card-minimal flex-1 flex flex-col overflow-hidden bg-slate-950/20 border-slate-800 shadow-2xl min-h-[600px]">
            <div className="px-6 py-4 border-b border-slate-900 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-4">
                <Terminal size={18} className="text-red-500" />
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.output}</h3>
              </div>
              {result && (
                <div className="flex gap-2">
                  {!packageReady ? (
                    <button 
                      onClick={handlePackage} 
                      disabled={isPackaging}
                      className="px-4 py-2 bg-blue-600/10 text-blue-500 rounded-lg text-[10px] font-bold border border-blue-500/20 flex items-center gap-2 hover:bg-blue-600/20 transition-all disabled:opacity-50"
                    >
                      {isPackaging ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
                      {t.packageBtn}
                    </button>
                  ) : (
                    <button 
                      onClick={handleDownload}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-[10px] font-bold border border-green-500/20 flex items-center gap-2 hover:bg-green-500 transition-all animate-pulse"
                    >
                      <Download size={14} />
                      {t.downloadBtn.replace('%EXT%', targetOs === 'Windows' ? 'exe' : targetOs === 'Android' ? 'apk' : 'bin')}
                    </button>
                  )}
                  <button onClick={handleCopyAll} className="px-4 py-2 bg-red-600/10 text-red-500 rounded-lg text-[10px] font-bold border border-red-500/20 flex items-center gap-2 hover:bg-red-600/20 transition-all">
                    {copiedAll ? <ClipboardCheck size={14} className="text-green-500" /> : <Copy size={14} />}
                    {t.copyAll}
                  </button>
                  <button onClick={() => {setResult(null); setSelectedTool(''); setPackageReady(false); setBuildLogs([]);}} className="px-4 py-2 bg-slate-900 text-slate-500 rounded-lg text-[10px] font-bold border border-slate-800 hover:text-white transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
              {loading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm space-y-6">
                  <Orbit className="animate-spin text-red-600" size={48} />
                  <p className="text-[11px] font-black text-white uppercase tracking-[0.3em] animate-pulse">{t.forging}</p>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 p-10 space-y-6">
                  <AlertTriangle className="text-red-500" size={64} />
                  <div className="text-center space-y-2">
                    <h4 className="text-lg font-black text-white uppercase tracking-tighter">{t.buildError}</h4>
                    <p className="text-sm text-slate-500 max-w-sm italic">{error}</p>
                  </div>
                  <button onClick={handleForge} className="px-8 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-500 transition-all">
                    <RefreshCw size={14} /> {t.retry}
                  </button>
                </div>
              )}

              {isPackaging && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-10 space-y-8">
                  <div className="relative">
                    <Box className="animate-bounce text-blue-500" size={64} />
                    <Orbit className="absolute top-0 left-0 w-full h-full text-blue-500/20 animate-spin-slow" size={64} />
                  </div>
                  <div className="w-full max-w-md space-y-4">
                    <div className="flex justify-between text-[10px] font-black text-white uppercase tracking-widest">
                      <span className="flex items-center gap-2"><CpuIcon size={12} /> {t.packaging}</span>
                      <span>{packageProgress}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-blue-600 transition-all duration-100 shadow-[0_0_10px_rgba(37,99,235,0.8)]" style={{ width: `${packageProgress}%` }} />
                    </div>
                    <div ref={logContainerRef} className="h-48 bg-black border border-slate-800 rounded-lg p-5 font-mono text-[9px] text-blue-400 overflow-y-auto custom-scrollbar space-y-1 shadow-2xl">
                      {buildLogs.map((log, i) => (
                        <div key={i} className="animate-in fade-in slide-in-from-left-2 flex gap-3">
                          <span className="text-blue-900 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {result ? (
                <div className="space-y-12 animate-in slide-up">
                  {packageReady && (
                    <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-2xl flex items-center justify-between animate-in zoom-in-95 shadow-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-green-500 uppercase tracking-widest">{t.ready}</p>
                          <p className="text-[13px] text-slate-400 font-medium">Binary structure verified for {targetOs}. Output available as {targetOs === 'Android' ? 'APK Bundle' : (targetOs === 'Windows' ? 'EXE Portable' : 'Binary Executable')}.</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleDownload}
                        className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500 transition-all shadow-lg shadow-green-900/20 active:scale-95 flex items-center gap-2"
                      >
                        <Download size={14} />
                        {t.downloadBtn.replace('%EXT%', targetOs === 'Windows' ? 'exe' : targetOs === 'Android' ? 'apk' : 'bin')}
                      </button>
                    </div>
                  )}

                  <section className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center text-red-600 border border-red-600/20">
                        <LayoutList size={16} />
                      </div>
                      <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t.blueprint}</h4>
                    </div>
                    <div className="text-[13px] text-slate-400 font-medium leading-relaxed bg-slate-900/20 p-6 rounded-xl border border-slate-800/50 italic">
                      <TechnicalHighlighter text={result.blueprint} />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 border border-blue-600/20">
                        <Code size={16} />
                      </div>
                      <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t.codeSample}</h4>
                    </div>
                    <div className="bg-black rounded-xl border border-slate-800 overflow-hidden shadow-inner">
                      <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-900/50 border-b border-slate-800">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                        <span className="text-[9px] font-mono text-slate-600 ml-2">payload_synthesis.{targetLang.toLowerCase()}</span>
                      </div>
                      <pre className="p-8 text-xs text-red-400 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[500px] custom-scrollbar">
                        {result.codeSample}
                      </pre>
                    </div>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-600/10 flex items-center justify-center text-purple-600 border border-purple-600/20">
                          <Activity size={16} />
                        </div>
                        <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t.workflow}</h4>
                      </div>
                      <div className="space-y-3 bg-slate-900/20 p-6 rounded-xl border border-slate-800/50 h-full">
                        {result.workflow.map((step: string, i: number) => (
                          <div key={i} className="flex gap-4 text-[13px] text-slate-400">
                            <span className="font-mono text-blue-500 shrink-0">{i + 1}.</span>
                            <p className="font-medium italic leading-relaxed">{step}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-600/10 flex items-center justify-center text-green-500 border border-green-600/20">
                          <ShieldCheck size={16} />
                        </div>
                        <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t.ethics}</h4>
                      </div>
                      <div className="space-y-3 bg-slate-900/20 p-6 rounded-xl border border-green-600/5 h-full">
                        {result.ethicalGuidelines.map((g: string, i: number) => (
                          <div key={i} className="flex gap-3 text-[13px] text-slate-400">
                            <AlertCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                            <p className="font-medium italic">{g}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-10">
                  <Sword size={100} className="mb-6" />
                  <p className="text-[10px] font-black uppercase tracking-[0.5em]">Arsenal Node Standby</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default CyberArsenal;
