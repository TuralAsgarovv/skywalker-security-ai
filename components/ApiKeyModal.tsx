import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyRound,
  X,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { testAIProviderKey, type AIProvider, type AIProviderStatus } from '../services/gemini';

interface ApiKeyModalProps {
  open: boolean;
  language: 'en' | 'az';
  providerStatus: AIProviderStatus;
  initialProvider?: AIProvider;
  onClose: () => void;
  onUpdateKey: (provider: AIProvider, key?: string) => Promise<void>;
}

interface ModalResult {
  type: 'success' | 'error';
  message: string;
}

const KEY_LINKS: Record<AIProvider, string> = {
  deepseek: 'https://platform.deepseek.com/api_keys',
  gemini: 'https://aistudio.google.com/app/apikey'
};

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  open,
  language,
  providerStatus,
  initialProvider,
  onClose,
  onUpdateKey
}) => {
  const t = useMemo(() => ({
    en: {
      title: 'Unlock the AI features',
      subtitle: 'Paste your own API key to activate every AI module on this site.',
      provider: 'Provider',
      deepseek: 'DeepSeek',
      gemini: 'Google AI Studio (Gemini)',
      deepseekHint: 'Recommended: cheap and fast for all modules. Create a key at platform.deepseek.com.',
      geminiHint: 'Works too — create a free key in Google AI Studio.',
      keyLabel: 'API key',
      placeholder: 'Paste the key here (sk-...)',
      save: 'Save and test key',
      saving: 'Testing key...',
      later: 'Maybe later',
      getKey: 'Get a key',
      configured: 'Key configured',
      remove: 'Remove saved key',
      removed: 'Key removed from this browser.',
      needKey: 'Paste an API key first.',
      works: 'Key works — AI features are unlocked in this browser.',
      errorTitle: 'That key did not work',
      privacy: 'The key is stored only in this browser (localStorage) and sent with each AI request. It is never saved in a database. If you clear site data or switch device, paste it again.',
      responsibility: 'Use a key from your own account. Requests go through this site\'s proxy straight to the provider and are billed to that key.',
      close: 'Close'
    },
    az: {
      title: 'Sİ funksiyalarını aktivləşdir',
      subtitle: 'Saytdakı bütün Sİ modullarını işə salmaq üçün öz API açarınızı yapışdırın.',
      provider: 'Provayder',
      deepseek: 'DeepSeek',
      gemini: 'Google AI Studio (Gemini)',
      deepseekHint: 'Tövsiyə olunur: bütün modullar üçün ucuz və sürətli. Açarı platform.deepseek.com-da yaradın.',
      geminiHint: 'Bu da işləyir — Google AI Studio-da pulsuz açar yaradın.',
      keyLabel: 'API açarı',
      placeholder: 'Açarı buraya yapışdırın (sk-...)',
      save: 'Yadda saxla və yoxla',
      saving: 'Açar yoxlanılır...',
      later: 'Sonra',
      getKey: 'Açar əldə et',
      configured: 'Açar qurulub',
      remove: 'Açarı sil',
      removed: 'Açar bu brauzerdən silindi.',
      needKey: 'Əvvəlcə API açarını yapışdırın.',
      works: 'Açar işləyir — Sİ funksiyaları bu brauzerdə aktivdir.',
      errorTitle: 'Bu açar işləmədi',
      privacy: 'Açar yalnız bu brauzerdə (localStorage) saxlanılır və hər Sİ sorğusu ilə göndərilir. Heç bir verilənlər bazasında saxlanılmır. Sayt məlumatlarını təmizləsəniz və ya cihazı dəyişsəniz, açarı yenidən daxil etməlisiniz.',
      responsibility: 'Yalnız öz hesabınıza aid açar istifadə edin. Sorğular bu saytın proxy-si ilə birbaşa provayderə gedir və həmin açarın hesabına yazılır.',
      close: 'Bağla'
    }
  }[language]), [language]);

  const [provider, setProvider] = useState<AIProvider>('deepseek');
  const [keyValue, setKeyValue] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [result, setResult] = useState<ModalResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setKeyValue('');
    setIsRevealed(false);
    setResult(null);
    setIsBusy(false);

    const preferred: AIProvider = initialProvider ?? 'deepseek';
    const fallback: AIProvider = preferred === 'deepseek' ? 'gemini' : 'deepseek';
    setProvider(providerStatus[preferred] || !providerStatus[fallback] ? preferred : fallback);

    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
    // Reset only when the dialog opens; later providerStatus updates (after a
    // successful save) must not wipe the test result the user is reading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = async () => {
    const trimmed = keyValue.trim();
    if (!trimmed) {
      setResult({ type: 'error', message: t.needKey });
      return;
    }

    setIsBusy(true);
    setResult(null);
    try {
      await onUpdateKey(provider, trimmed);

      const test = await testAIProviderKey(provider, trimmed);
      if (test.ok) {
        setKeyValue('');
        setResult({
          type: 'success',
          message: `${t.works}${test.latencyMs ? ` (${test.latencyMs} ms)` : ''}`
        });
      } else {
        setResult({ type: 'error', message: test.message });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not save the key.'
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async () => {
    setIsBusy(true);
    setResult(null);
    try {
      await onUpdateKey(provider);
      setResult({ type: 'success', message: t.removed });
    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not remove the key.'
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-key-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto custom-scrollbar"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 id="ai-key-title" className="text-sm font-bold text-white uppercase tracking-widest">
                {t.title}
              </h2>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t.close}
            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.provider}</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(['deepseek', 'gemini'] as AIProvider[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => { setProvider(option); setResult(null); }}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all ${
                    provider === option
                      ? 'border-blue-500/60 bg-blue-600/10 text-blue-300'
                      : 'border-slate-800 bg-slate-950/40 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${providerStatus[option] ? 'bg-green-500' : 'bg-slate-600'}`} />
                  {t[option]}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              {provider === 'deepseek' ? t.deepseekHint : t.geminiHint}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="ai-key-input" className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                {t.keyLabel}
              </label>
              {providerStatus[provider] && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-green-500">{t.configured}</span>
              )}
            </div>
            <div className="relative mt-2">
              <input
                id="ai-key-input"
                ref={inputRef}
                type={isRevealed ? 'text' : 'password'}
                value={keyValue}
                onChange={(event) => setKeyValue(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') void handleSave(); }}
                placeholder={t.placeholder}
                autoComplete="off"
                spellCheck={false}
                disabled={isBusy}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-11 py-2.5 text-[12px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setIsRevealed((value) => !value)}
                aria-label={isRevealed ? 'Hide key' : 'Show key'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <a
                href={KEY_LINKS[provider]}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300"
              >
                {t.getKey}
                <ExternalLink size={10} />
              </a>
              {providerStatus[provider] && (
                <button
                  type="button"
                  onClick={() => void handleRemove()}
                  disabled={isBusy}
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-red-400 disabled:opacity-50"
                >
                  {t.remove}
                </button>
              )}
            </div>
          </div>

          {result && (
            <div
              role="status"
              className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed ${
                result.type === 'success'
                  ? 'border-green-700/50 bg-green-950/30 text-green-300'
                  : 'border-red-800/50 bg-red-950/30 text-red-300'
              }`}
            >
              {result.type === 'success'
                ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
              <div>
                {result.type === 'error' && <p className="font-bold">{t.errorTitle}</p>}
                <p className="break-words">{result.message}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isBusy}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase tracking-widest transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isBusy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              {isBusy ? t.saving : t.save}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-[11px] font-bold uppercase tracking-widest transition-colors"
            >
              {t.later}
            </button>
          </div>

          <div className="space-y-2 border-t border-slate-800 pt-4">
            <p className="flex items-start gap-2 text-[10px] text-slate-500 leading-relaxed">
              <ShieldCheck size={12} className="mt-0.5 shrink-0 text-blue-500/70" />
              {t.privacy}
            </p>
            <p className="text-[10px] text-slate-600 leading-relaxed">{t.responsibility}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
