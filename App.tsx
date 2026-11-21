
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  FileSearch, 
  Bug, 
  MessageSquareCode, 
  Zap, 
  Settings as SettingsIcon,
  Bell,
  Activity,
  Database,
  Terminal,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  AlertCircle,
  Info,
  Sword,
  SearchCode,
  Crosshair,
  KeyRound
} from 'lucide-react';
import { View } from './types';
import {
  getAIProviderStatus,
  getSavedAIProvider,
  saveAIProviderKey,
  clearAIProviderKey,
  isAnyProviderConfigured,
  AI_KEY_REQUIRED_EVENT,
  type AIProvider,
  type AIProviderStatus
} from './services/gemini';
import Dashboard from './components/Dashboard';
import HeaderAudit from './components/HeaderAudit';
import OwaspAdvisor from './components/OwaspAdvisor';
import AIChat from './components/AIChat';
import VulnExplainer from './components/VulnExplainer';
import Settings from './components/Settings';
import CVEHub from './components/CVEHub';
import Disclaimer from './components/Disclaimer';
import ExploitArchitect from './components/ExploitArchitect';
import CyberArsenal from './components/CyberArsenal';
import IntelExplorer from './components/IntelExplorer';
import BountyHunter from './components/BountyHunter';
import ApiKeyModal from './components/ApiKeyModal';

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'info' | 'warning' | 'critical';
  unread: boolean;
}

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  const [systemLoad, setSystemLoad] = useState(0.35);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [architectPrefill, setArchitectPrefill] = useState<{vulnClass: string, techStack: string, context: string} | null>(null);
  const [aiProvider, setAIProvider] = useState<AIProvider>(() => getSavedAIProvider());
  const [providerStatus, setProviderStatus] = useState<AIProviderStatus>({ gemini: false, deepseek: false });
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', title: 'System Synchronized', description: 'Threat intelligence nodes updated successfully.', time: '2m ago', type: 'info', unread: true },
    { id: '2', title: 'New CVE-2025-1021', description: 'Critical vulnerability detected in Nginx cores.', time: '15m ago', type: 'critical', unread: true },
    { id: '3', title: 'Audit Completed', description: 'Header audit for site.com finished with score 82.', time: '1h ago', type: 'warning', unread: false },
  ]);

  const [isAccepted, setIsAccepted] = useState(() => {
    return localStorage.getItem('skywalker_disclaimer_accepted') === 'true';
  });
  const [language, setLanguage] = useState<'en' | 'az'>(() => {
    return (localStorage.getItem('skywalker_lang') as 'en' | 'az') || 'en';
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemLoad(prev => Math.max(0.1, Math.min(0.6, prev + (Math.random() - 0.5) * 0.02)));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    getAIProviderStatus()
      .then(status => {
        if (!active) return;
        setProviderStatus(status);

        const stored = localStorage.getItem('skywalker_ai_provider');
        const savedProvider: AIProvider = stored === 'deepseek' ? 'deepseek' : 'gemini';
        // Keep the saved choice only if it is configured; otherwise fall back to
        // whichever provider actually has a key so requests never silently fail.
        const resolvedProvider: AIProvider = status[savedProvider]
          ? savedProvider
          : status.gemini
            ? 'gemini'
            : status.deepseek
              ? 'deepseek'
              : savedProvider;

        setAIProvider(resolvedProvider);
        if (resolvedProvider !== stored) {
          localStorage.setItem('skywalker_ai_provider', resolvedProvider);
        }

        // First visit without any key: offer the key dialog immediately so the AI
        // modules are usable without hunting through Settings.
        let dismissed = false;
        try {
          dismissed = sessionStorage.getItem('skywalker_key_prompt_dismissed') === 'true';
        } catch {
          // Private mode can block sessionStorage; then simply ask every visit.
        }
        if (!status.gemini && !status.deepseek && !dismissed) {
          setIsKeyModalOpen(true);
        }
      })
      .catch(error => console.error('Could not load AI provider status:', error));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Any feature that hits a missing/invalid key asks for the dialog instead of
  // leaving the visitor with an error they cannot resolve.
  useEffect(() => {
    const handleKeyRequired = () => setIsKeyModalOpen(true);
    window.addEventListener(AI_KEY_REQUIRED_EVENT, handleKeyRequired);
    return () => window.removeEventListener(AI_KEY_REQUIRED_EVENT, handleKeyRequired);
  }, []);

  const handleCloseKeyModal = () => {
    setIsKeyModalOpen(false);
    // Do not nag during this tab session, but ask again on the next visit.
    try {
      sessionStorage.setItem('skywalker_key_prompt_dismissed', 'true');
    } catch {
      // Storage may be blocked; closing the dialog is what matters.
    }
  };

  const handleSetLanguage = (lang: 'en' | 'az') => {
    setLanguage(lang);
    localStorage.setItem('skywalker_lang', lang);
  };

  const handleSetAIProvider = (provider: AIProvider) => {
    setAIProvider(provider);
    localStorage.setItem('skywalker_ai_provider', provider);
  };

  const handleUpdateProviderKey = async (provider: AIProvider, key?: string) => {
    const status = key
      ? await saveAIProviderKey(provider, key)
      : await clearAIProviderKey(provider);
    setProviderStatus(status);

    if (key && status[provider]) {
      // Saving a key makes that provider active immediately.
      setAIProvider(provider);
      localStorage.setItem('skywalker_ai_provider', provider);
    } else if (!status[aiProvider]) {
      // The active provider lost its key; fall back to the other one if possible.
      const alternative: AIProvider = aiProvider === 'gemini' ? 'deepseek' : 'gemini';
      if (status[alternative]) {
        setAIProvider(alternative);
        localStorage.setItem('skywalker_ai_provider', alternative);
      }
    }
  };

  const handleAcceptTerms = () => {
    setIsAccepted(true);
    localStorage.setItem('skywalker_disclaimer_accepted', 'true');
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleForgeFromDashboard = (data: {vulnClass: string, techStack: string, context: string}) => {
    setArchitectPrefill(data);
    setActiveView(View.EXPLOIT_ARCHITECT);
  };

  const translations = useMemo(() => ({
    en: {
      dashboard: 'Dashboard',
      headerAudit: 'Header Audit',
      compliance: 'OWASP Guide',
      vulnDb: 'Vulnerability Wiki',
      cveHub: 'CVE Feed',
      intelExplorer: 'Intel Explorer',
      exploitArchitect: 'Architect',
      cyberArsenal: 'Cyber Arsenal',
      aiChat: 'AI Assistant',
      settings: 'Settings',
      bountyHunter: 'Bounty Hunter',
      systemStatus: 'System:',
      operational: 'Online',
      setupRequired: 'Setup Required',
      apiKeyNotice: 'AI features are locked until a key is added. Paste your own key — it stays in this browser and is sent only with your AI requests.',
      addKey: 'Add AI key',
      aiKeyButton: 'AI key',
      keyReady: 'AI key ready',
      cpu: 'Core Load',
      notifications: 'Notifications',
      markRead: 'Mark all read',
      noNotifications: 'No new alerts',
    },
    az: {
      dashboard: 'Panel',
      headerAudit: 'Başlıq Analizi',
      compliance: 'OWASP Bələdçisi',
      vulnDb: 'Zəiflik Vikisi',
      cveHub: 'CVE Axını',
      intelExplorer: 'Kəşfiyyat Analizi',
      exploitArchitect: 'Arxitekt',
      cyberArsenal: 'Kiber Arsenal',
      aiChat: 'Sİ Köməkçisi',
      settings: 'Parametrlər',
      bountyHunter: 'Bug Bounty',
      systemStatus: 'Sistem:',
      operational: 'Aktiv',
      setupRequired: 'Quraşdırma tələb olunur',
      apiKeyNotice: 'Sİ funksiyaları açar əlavə olunana qədər kilidlidir. Öz açarınızı yapışdırın — yalnız bu brauzerdə saxlanılır və Sİ sorğularınızla göndərilir.',
      addKey: 'Sİ açarı əlavə et',
      aiKeyButton: 'Sİ açarı',
      keyReady: 'Sİ açarı hazırdır',
      cpu: 'Nüvə Yükü',
      notifications: 'Bildirişlər',
      markRead: 'Hamısını oxunmuş kimi qeyd et',
      noNotifications: 'Yeni xəbərdarlıq yoxdur',
    }
  }[language]), [language]);

  const navItems = useMemo(() => [
    { id: View.DASHBOARD, label: translations.dashboard, icon: LayoutDashboard },
    { id: View.BOUNTY_HUNTER, label: translations.bountyHunter, icon: Crosshair },
    { id: View.HEADER_AUDIT, label: translations.headerAudit, icon: FileSearch },
    { id: View.CVE_HUB, label: translations.cveHub, icon: Database },
    { id: View.INTEL_EXPLORER, label: translations.intelExplorer, icon: SearchCode },
    { id: View.EXPLOIT_ARCHITECT, label: translations.exploitArchitect, icon: Terminal },
    { id: View.CYBER_ARSENAL, label: translations.cyberArsenal, icon: Sword },
    { id: View.OWASP_ADVISOR, label: translations.compliance, icon: Shield },
    { id: View.VULN_EXPLAINER, label: translations.vulnDb, icon: Bug },
    { id: View.AI_CHAT, label: translations.aiChat, icon: MessageSquareCode },
  ], [translations]);

  const unreadCount = notifications.filter(n => n.unread).length;
  const aiProviderConfigured = providerStatus[aiProvider];
  const anyKeyConfigured = isAnyProviderConfigured(providerStatus);

  if (!isAccepted) {
    return <Disclaimer language={language} setLanguage={handleSetLanguage} onAccept={handleAcceptTerms} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 font-medium">
      {/* Sidebar - Modern & Minimal */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} border-r border-slate-900 bg-slate-950 transition-all duration-300 ease-in-out flex flex-col z-50`}
      >
        <div className="h-20 flex items-center px-6">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Shield size={18} className="text-white" />
          </div>
          {isSidebarOpen && (
            <span className="ml-3 font-bold text-white tracking-tight text-sm uppercase">SKYWALKER</span>
          )}
        </div>

        <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group ${
                activeView === item.id 
                  ? 'bg-blue-600/10 text-blue-400' 
                  : 'text-slate-500 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <item.icon size={18} className={activeView === item.id ? 'text-blue-500' : 'text-slate-600'} />
              {isSidebarOpen && <span className="text-[13px] font-semibold">{item.label}</span>}
              {!isSidebarOpen && activeView === item.id && <div className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-900">
           <div className={`p-3 rounded-xl bg-slate-900/30 transition-all ${!isSidebarOpen && 'items-center flex flex-col'}`}>
              <div className="flex justify-between items-center mb-2 w-full">
                {isSidebarOpen && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{translations.cpu}</span>}
                <span className="text-[10px] font-mono text-blue-500">{(systemLoad * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden w-full">
                <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${systemLoad * 100}%` }} />
              </div>
           </div>
           <button 
             onClick={() => setIsSidebarOpen(!isSidebarOpen)}
             className="w-full mt-4 flex items-center justify-center py-2 text-slate-600 hover:text-slate-400 transition-colors"
           >
             {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
           </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <header className="h-20 border-b border-slate-900 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md relative z-40">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${aiProviderConfigured ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{translations.systemStatus}</span>
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${aiProviderConfigured ? 'text-green-500' : 'text-amber-500'}`}>
                {aiProviderConfigured ? translations.operational : translations.setupRequired}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Notification Popover */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`p-2.5 rounded-xl transition-all relative ${isNotificationsOpen ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-900'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-slate-950" />
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest">{translations.notifications}</h4>
                    <button onClick={markAllRead} className="text-[10px] text-blue-500 font-bold hover:underline">{translations.markRead}</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-4 border-b border-slate-800/50 hover:bg-slate-950 transition-colors relative ${n.unread ? 'bg-blue-600/5' : ''}`}>
                          {n.unread && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />}
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 p-1.5 rounded-lg ${
                              n.type === 'critical' ? 'bg-red-500/10 text-red-500' : 
                              n.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 
                              'bg-blue-500/10 text-blue-500'
                            }`}>
                              {n.type === 'critical' ? <AlertCircle size={14} /> : n.type === 'warning' ? <AlertCircle size={14} /> : <Info size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-white truncate">{n.title}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{n.description}</p>
                              <div className="flex items-center gap-1.5 mt-2 text-[9px] text-slate-600 font-mono">
                                <Clock size={10} />
                                {n.time}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-600">
                        <Bell size={32} className="mx-auto mb-3 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">{translations.noNotifications}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsKeyModalOpen(true)}
              title={anyKeyConfigured ? translations.keyReady : translations.aiKeyButton}
              aria-label={translations.aiKeyButton}
              className={`relative p-2.5 rounded-xl transition-all ${
                anyKeyConfigured ? 'text-slate-500 hover:text-white hover:bg-slate-900' : 'text-amber-400 hover:text-amber-300 hover:bg-slate-900'
              }`}
            >
              <KeyRound size={20} />
              <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${anyKeyConfigured ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
            </button>

            <button 
              onClick={() => setActiveView(activeView === View.SETTINGS ? View.DASHBOARD : View.SETTINGS)}
              className={`p-2.5 rounded-xl transition-all ${
                activeView === View.SETTINGS ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-white hover:bg-slate-900'
              }`}
            >
              <SettingsIcon size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12 scroll-smooth bg-slate-950">
          {!aiProviderConfigured && (
            <div role="alert" className="max-w-6xl mx-auto mb-6 rounded-xl border border-amber-700/50 bg-amber-950/30 px-5 py-4 text-sm text-amber-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <span>{translations.apiKeyNotice}</span>
              <button
                onClick={() => setIsKeyModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold uppercase tracking-widest transition-colors shrink-0"
              >
                <KeyRound size={14} />
                {translations.addKey}
              </button>
            </div>
          )}
          <div className="max-w-6xl mx-auto pb-12 relative min-h-full">
            <div className={activeView === View.DASHBOARD ? 'block' : 'hidden'}>
              <Dashboard language={language} onForgeExploit={handleForgeFromDashboard} />
            </div>
            <div className={activeView === View.BOUNTY_HUNTER ? 'block' : 'hidden'}>
              <BountyHunter language={language} />
            </div>
            <div className={activeView === View.HEADER_AUDIT ? 'block' : 'hidden'}>
              <HeaderAudit language={language} />
            </div>
            <div className={activeView === View.CVE_HUB ? 'block' : 'hidden'}>
              <CVEHub language={language} />
            </div>
            <div className={activeView === View.INTEL_EXPLORER ? 'block' : 'hidden'}>
              <IntelExplorer language={language} />
            </div>
            <div className={activeView === View.EXPLOIT_ARCHITECT ? 'block' : 'hidden'}>
              <ExploitArchitect language={language} prefill={architectPrefill} clearPrefill={() => setArchitectPrefill(null)} />
            </div>
            <div className={activeView === View.CYBER_ARSENAL ? 'block' : 'hidden'}>
              <CyberArsenal language={language} />
            </div>
            <div className={activeView === View.OWASP_ADVISOR ? 'block' : 'hidden'}>
              <OwaspAdvisor language={language} />
            </div>
            <div className={activeView === View.VULN_EXPLAINER ? 'block' : 'hidden'}>
              <VulnExplainer language={language} />
            </div>
            <div className={activeView === View.AI_CHAT ? 'block' : 'hidden'}>
              <AIChat language={language} />
            </div>
            <div className={activeView === View.SETTINGS ? 'block' : 'hidden'}>
              <Settings
                language={language}
                setLanguage={handleSetLanguage}
                aiProvider={aiProvider}
                providerStatus={providerStatus}
                setAIProvider={handleSetAIProvider}
                updateProviderKey={handleUpdateProviderKey}
                onClearHistory={() => setActiveView(View.DASHBOARD)}
                onBack={() => setActiveView(View.DASHBOARD)}
              />
            </div>
          </div>
        </div>
      </main>

      <ApiKeyModal
        open={isKeyModalOpen}
        language={language}
        providerStatus={providerStatus}
        initialProvider={aiProvider}
        onClose={handleCloseKeyModal}
        onUpdateKey={handleUpdateProviderKey}
      />
    </div>
  );
};

export default App;
