
import React, { useState, useMemo } from 'react';
import { 
  SearchCode, FileText, Loader2, Send, ExternalLink, 
  Link as LinkIcon, Orbit, ShieldAlert, Terminal, 
  ChevronRight, Sparkles, X, Trash2, Newspaper
} from 'lucide-react';
import { analyzeIntel } from '../services/gemini';
import { GroundingSource } from '../types';

interface IntelExplorerProps {
  language: 'en' | 'az';
}

const IntelExplorer: React.FC<IntelExplorerProps> = ({ language }) => {
  const [mode, setMode] = useState<'CVE' | 'ARTICLE'>('CVE');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [sources, setSources] = useState<GroundingSource[]>([]);

  const t = useMemo(() => ({
    en: {
      title: 'Intel Explorer',
      subtitle: 'Deep analysis of specific CVEs and cybersecurity articles.',
      modeCVE: 'CVE Analyzer',
      modeArticle: 'Article Analyzer',
      cvePlaceholder: 'Enter CVE ID (e.g., CVE-2024-1234)...',
      articlePlaceholder: 'Paste article text or advisory details here...',
      analyzeBtn: 'Execute Analysis',
      analyzing: 'Querying Global Intelligence Nodes...',
      outputTitle: 'Technical Breakdown',
      sourcesTitle: 'Grounding Sources',
      clear: 'Clear Workspace',
      empty: 'Researcher Terminal Standby',
      emptyDesc: 'Select a mode and provide a target to begin deep technical analysis.'
    },
    az: {
      title: 'Kəşfiyyat Analizi',
      subtitle: 'Xüsusi CVE-lər və kiber təhlükəsizlik məqalələrinin dərindən analizi.',
      modeCVE: 'CVE Analizatoru',
      modeArticle: 'Məqalə Analizatoru',
      cvePlaceholder: 'CVE ID daxil edin (məs: CVE-2024-1234)...',
      articlePlaceholder: 'Məqalə mətnini və ya bildiriş təfərrüatlarını buraya yapışdırın...',
      analyzeBtn: 'Analizi İcra Et',
      analyzing: 'Qlobal Kəşfiyyat Düyünləri Sorğulanır...',
      outputTitle: 'Texniki Təfərrüat',
      sourcesTitle: 'Məlumat Mənbələri',
      clear: 'İş Sahəsini Təmizlə',
      empty: 'Tədqiqatçı Terminalı Gözləmədədir',
      emptyDesc: 'Dərin texniki analizə başlamaq üçün rejim seçin və hədəf daxil edin.'
    }
  }[language]), [language]);

  const handleAnalyze = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setAnalysis(null);
    setSources([]);
    try {
      const result = await analyzeIntel(mode, content);
      setAnalysis(result.text);
      setSources(result.sources);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setAnalysis(null);
    setSources([]);
    setContent('');
  };

  return (
    <div className="space-y-10 animate-in slide-up pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-900 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight italic uppercase flex items-center gap-4">
            <SearchCode className="text-blue-500" size={28} /> {t.title}
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">{t.subtitle}</p>
        </div>
        {analysis && (
          <button 
            onClick={clear}
            className="px-6 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2"
          >
            <Trash2 size={14} /> {t.clear}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
          <div className="card-minimal p-6 space-y-8 bg-slate-900/10 shadow-2xl">
            <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button 
                onClick={() => setMode('CVE')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'CVE' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <ShieldAlert size={14} /> {t.modeCVE}
              </button>
              <button 
                onClick={() => setMode('ARTICLE')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'ARTICLE' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Newspaper size={14} /> {t.modeArticle}
              </button>
            </div>

            <div className="space-y-2">
               {mode === 'CVE' ? (
                 <input 
                   value={content}
                   onChange={e => setContent(e.target.value)}
                   placeholder={t.cvePlaceholder}
                   className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all shadow-inner font-mono uppercase"
                 />
               ) : (
                 <textarea 
                   value={content}
                   onChange={e => setContent(e.target.value)}
                   placeholder={t.articlePlaceholder}
                   className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all shadow-inner resize-none custom-scrollbar"
                 />
               )}
            </div>

            <button 
              onClick={handleAnalyze} 
              disabled={loading || !content.trim()} 
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {loading ? t.analyzing : t.analyzeBtn}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col h-full">
          <div className="card-minimal flex-1 flex flex-col overflow-hidden bg-slate-950/20 border-slate-800 shadow-2xl min-h-[600px]">
            <div className="px-6 py-4 border-b border-slate-900 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-4">
                <Terminal size={18} className="text-blue-500" />
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.outputTitle}</h3>
              </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
              {loading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm space-y-6">
                  <Orbit className="animate-spin text-blue-500" size={48} />
                  <p className="text-[11px] font-black text-white uppercase tracking-[0.3em] animate-pulse">{t.analyzing}</p>
                </div>
              )}

              {analysis ? (
                <div className="space-y-12 animate-in slide-up">
                  <div className="max-w-none">
                    <div className="text-slate-300 text-[15px] leading-relaxed whitespace-pre-wrap font-medium selection:bg-blue-600/40 first-letter:text-4xl first-letter:font-black first-letter:text-white first-letter:mr-1 first-letter:float-left">
                      {analysis}
                    </div>
                  </div>

                  {sources.length > 0 && (
                    <section className="pt-10 border-t border-slate-900 space-y-6">
                      <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] flex items-center gap-3">
                        <LinkIcon size={14} className="text-blue-500" /> {t.sourcesTitle}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sources.map((s, i) => (
                          <a 
                            key={i} 
                            href={s.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-blue-500/40 transition-all group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800 transition-colors group-hover:bg-blue-600 group-hover:text-white text-slate-600">
                               <ExternalLink size={14} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-[11px] font-black text-slate-300 truncate tracking-tight">{s.title}</p>
                              <p className="text-[9px] text-slate-600 font-mono truncate uppercase mt-1">{s.uri}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-10">
                  <Terminal size={100} className="mb-6" />
                  <h3 className="text-xl font-black uppercase tracking-[0.5em]">{t.empty}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 max-w-xs text-center">{t.emptyDesc}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntelExplorer;
