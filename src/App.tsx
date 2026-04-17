/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Calculator as CalcIcon, 
  Settings, 
  History, 
  Download, 
  Trash2, 
  Plus, 
  Minus, 
  X, 
  Divide, 
  Equal, 
  RotateCcw,
  Check,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { BusinessSettings, CalculationItem } from './types';
import { cn } from './lib/utils';

// Standard components for Calculator Buttons
const CalcButton = ({ onClick, children, className, variant = 'default' }: any) => {
  const variants: any = {
    default: "bg-zinc-800 hover:bg-zinc-700 text-white",
    operator: "bg-orange-500 hover:bg-orange-600 text-white",
    utility: "bg-zinc-600 hover:bg-zinc-500 text-white",
    action: "bg-green-600 hover:bg-green-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={cn(
        "h-16 w-full rounded-2xl flex items-center justify-center text-xl font-medium transition-colors shadow-lg",
        variants[variant],
        className
      )}
    >
      {children}
    </motion.button>
  );
};

export default function App() {
  // --- States ---
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<CalculationItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [shouldResetDisplay, setShouldResetDisplay] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [settings, setSettings] = useState<BusinessSettings>({
    name: 'আমার দোকান (My Shop)',
    address: 'ঢাকা, বাংলাদেশ (Dhaka, Bangladesh)',
    phone: '+8801XXXXXXXXX',
    email: 'info@example.com',
    footerMessage: 'আমাদের সাথে থাকার জন্য ধন্যবাদ!',
    logoColor: '#f97316',
    currencySymbol: '৳',
    currencyPosition: 'prefix'
  });

  const receiptRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---
  useEffect(() => {
    const savedSettings = localStorage.getItem('calc_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));

    const savedHistory = localStorage.getItem('calc_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    localStorage.setItem('calc_history', JSON.stringify(history));
  }, [history]);

  const saveSettings = (newSettings: BusinessSettings) => {
    setSettings(newSettings);
    localStorage.setItem('calc_settings', JSON.stringify(newSettings));
    setIsSettingsOpen(false);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const handleClearHistory = () => {
    if (confirm('আপনি কি হিসাবের ইতিহাস মুছে ফেলতে চান?')) {
      setHistory([]);
      localStorage.removeItem('calc_history');
    }
  };

  // --- Calculator Logic ---
  const handleDigit = (digit: string) => {
    if (display === '0' || display === 'Error' || shouldResetDisplay) {
      setDisplay(digit);
      setShouldResetDisplay(false);
    } else {
      setDisplay(display + digit);
    }
  };

  const handleOperator = (op: string) => {
    // If user clicked an operator multiple times, change the last operator
    if (shouldResetDisplay && expression !== '') {
      setExpression(prev => prev.trimEnd().slice(0, -1) + ' ' + op + ' ');
      return;
    }

    if (expression === '' && display !== '0') {
      setExpression(display + ' ' + op + ' ');
    } else if (display !== '0') {
      setExpression(expression + display + ' ' + op + ' ');
    }
    setShouldResetDisplay(true);
  };

  const handleCalculate = () => {
    if (!expression) return;
    try {
      let fullExpression = expression + display;
      // If the last action was an operator, remove it for the final calculation
      if (shouldResetDisplay && expression !== '') {
        fullExpression = expression.trim().slice(0, -1);
      }
      
      const cleanExpression = fullExpression.replace(/×/g, '*').replace(/÷/g, '/');
      const resultValue = eval(cleanExpression);
      const result = String(resultValue);

      const newItem: CalculationItem = {
        id: Math.random().toString(36).substr(2, 9),
        expression: fullExpression,
        result: result,
        timestamp: Date.now(),
        label: ''
      };

      setHistory(prev => [newItem, ...prev].slice(0, 50));
      
      setDisplay(result);
      setExpression('');
      setShouldResetDisplay(true);
      
      if (resultValue > 1000) {
        confetti({ particleCount: 30, spread: 60, origin: { y: 1.0 } });
      }
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        setDisplay('ভুল হিসাব (Invalid)');
      } else if (e.message?.includes('division by zero') || e.message?.includes('Infinity')) {
        setDisplay('শূন্য দিয়ে ভাগ সম্ভব নয়');
      } else {
        setDisplay('হিসাবে সমস্যা হয়েছে');
      }
      setExpression('');
      setShouldResetDisplay(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
  };

  const handleBackspace = () => {
    if (shouldResetDisplay) {
      handleClear();
      return;
    }
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  // --- Receipt Export ---
  const downloadReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      const dataUrl = await toPng(receiptRef.current, { quality: 1, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `bill-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      confetti({ particleCount: 150, spread: 100 });
    } catch (err) {
      console.error(err);
      alert('ইমেজ ডাউনলোড করতে সমস্যা হয়েছে।');
    }
  };

  const updateItemLabel = (id: string, label: string) => {
    const newHistory = history.map(item => item.id === id ? { ...item, label } : item);
    setHistory(newHistory);
    localStorage.setItem('calc_history', JSON.stringify(newHistory));
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('আপনার ব্রাউজার এই মুহূর্তে ইন্সটল সাপোর্ট করছে না বা এটি ইতিমধ্যে ইন্সটল করা আছে।');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500/30">
      
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/60 backdrop-blur-xl pt-[env(safe-area-inset-top,16px)] pb-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500/20 text-orange-500 shadow-lg shadow-orange-500/5">
            <CalcIcon size={22} />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-white/90">Smart Bill</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <History size={20} />
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={() => setIsReceiptOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-all shadow-lg shadow-orange-500/10"
          >
            <Download size={18} />
            <span className="hidden xs:inline">Bill</span>
          </button>
        </div>
      </header>

      <main className="pt-24 pb-[env(safe-area-inset-bottom,24px)] px-4 w-full h-screen max-w-md mx-auto flex flex-col justify-end gap-6">
        
        {/* Display Section */}
        <section className="flex-1 flex flex-col justify-end gap-2 px-2 pb-4 overflow-hidden">
          <div className="text-zinc-500 font-mono text-lg overflow-x-auto whitespace-nowrap text-right w-full scrollbar-hide">
            {expression || ' '}
          </div>
          <div className="text-6xl sm:text-7xl font-mono font-bold tracking-tighter overflow-x-auto whitespace-nowrap w-full text-right text-white leading-none scrollbar-hide py-2">
            {display}
          </div>
        </section>

        {/* Buttons Grid */}
        <section className="grid grid-cols-4 gap-3">
          {/* Row 1 */}
          <CalcButton variant="utility" onClick={handleClear}>AC</CalcButton>
          <CalcButton variant="utility" onClick={handleBackspace}><RotateCcw size={20} /></CalcButton>
          <CalcButton variant="utility" onClick={() => handleDigit('%')}>%</CalcButton>
          <CalcButton variant="operator" onClick={() => handleOperator('÷')}><Divide size={24} /></CalcButton>

          {/* Row 2 */}
          <CalcButton onClick={() => handleDigit('7')}>7</CalcButton>
          <CalcButton onClick={() => handleDigit('8')}>8</CalcButton>
          <CalcButton onClick={() => handleDigit('9')}>9</CalcButton>
          <CalcButton variant="operator" onClick={() => handleOperator('×')}><X size={24} /></CalcButton>

          {/* Row 3 */}
          <CalcButton onClick={() => handleDigit('4')}>4</CalcButton>
          <CalcButton onClick={() => handleDigit('5')}>5</CalcButton>
          <CalcButton onClick={() => handleDigit('6')}>6</CalcButton>
          <CalcButton variant="operator" onClick={() => handleOperator('-')}><Minus size={24} /></CalcButton>

          {/* Row 4 */}
          <CalcButton onClick={() => handleDigit('1')}>1</CalcButton>
          <CalcButton onClick={() => handleDigit('2')}>2</CalcButton>
          <CalcButton onClick={() => handleDigit('3')}>3</CalcButton>
          <CalcButton variant="operator" onClick={() => handleOperator('+')}><Plus size={24} /></CalcButton>

          {/* Row 5 */}
          <CalcButton className="col-span-2" onClick={() => handleDigit('0')}>0</CalcButton>
          <CalcButton onClick={() => handleDigit('.')}>.</CalcButton>
          <CalcButton variant="action" onClick={handleCalculate}><Equal size={28} /></CalcButton>
        </section>

      </main>

      {/* --- Overlay Modals --- */}

      {/* History Sidebar */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50]"
            />
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xs bg-zinc-900 z-[60] shadow-2xl border-l border-zinc-800 p-6 flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History size={20} className="text-orange-500" />
                  হিস্টরি
                </h2>
                <button onClick={() => setIsHistoryOpen(false)} className="p-2 rounded-lg hover:bg-zinc-800">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {history.length === 0 ? (
                  <div className="text-zinc-500 text-center py-12">
                    <p>কোনো হিস্টরি পাওয়া যায়নি।</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="p-4 rounded-2xl bg-black/40 border border-zinc-800/50 flex flex-col gap-2 relative group">
                      <div className="text-xs text-zinc-500 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-sm text-zinc-400 truncate">{item.expression}</div>
                      <div className="text-lg font-bold text-white">= {item.result}</div>
                      
                      <div className="mt-2">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold">লেবেল (পণ্যের নাম)</label>
                        <input 
                          type="text" 
                          placeholder="উদা: আলু / ডাল"
                          value={item.label}
                          onChange={(e) => updateItemLabel(item.id, e.target.value)}
                          className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-orange-500/50"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button 
                onClick={handleClearHistory}
                className="w-full py-4 flex items-center justify-center gap-2 text-red-500 font-bold bg-red-500/10 rounded-2xl hover:bg-red-500/20 transition-colors"
                disabled={history.length === 0}
              >
                <Trash2 size={18} />
                ক্লিয়ার হিস্টরি
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 rounded-[2.5rem] border border-zinc-800 p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">সেটিংস</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 rounded-full hover:bg-zinc-800">
                  <X size={24} />
                </button>
              </div>

              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveSettings(settings); }}>
                <div className="grid gap-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">প্রতিষ্ঠানের নাম</label>
                  <input 
                    type="text" 
                    value={settings.name}
                    onChange={(e) => setSettings({...settings, name: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-2xl px-4 py-3 focus:border-orange-500 outline-none"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">ঠিকানা</label>
                  <input 
                    type="text" 
                    value={settings.address}
                    onChange={(e) => setSettings({...settings, address: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-2xl px-4 py-3 focus:border-orange-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">ফোন</label>
                    <input 
                      type="text" 
                      value={settings.phone}
                      onChange={(e) => setSettings({...settings, phone: e.target.value})}
                      className="w-full bg-black border border-zinc-800 rounded-2xl px-4 py-3 focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">থিম কালার</label>
                    <div className="flex gap-2">
                      {['#f97316', '#3b82f6', '#10b981', '#ef4444', '#a855f7'].map(c => (
                        <button 
                          key={c}
                          type="button"
                          onClick={() => setSettings({...settings, logoColor: c})}
                          style={{ backgroundColor: c }}
                          className={`w-10 h-10 rounded-full border-2 ${settings.logoColor === c ? 'border-white' : 'border-transparent'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">ফুটারে বার্তা</label>
                  <input 
                    type="text" 
                    value={settings.footerMessage}
                    onChange={(e) => setSettings({...settings, footerMessage: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-2xl px-4 py-3 focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">মুদ্রা চিহ্ন (Currency)</label>
                    <input 
                      type="text" 
                      value={settings.currencySymbol}
                      placeholder="৳, $, Rs"
                      onChange={(e) => setSettings({...settings, currencySymbol: e.target.value})}
                      className="w-full bg-black border border-zinc-800 rounded-2xl px-4 py-3 focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">চিহ্নের অবস্থান</label>
                    <select 
                      value={settings.currencyPosition}
                      onChange={(e) => setSettings({...settings, currencyPosition: e.target.value as any})}
                      className="w-full bg-black border border-zinc-800 rounded-2xl px-4 py-3 focus:border-orange-500 outline-none appearance-none"
                    >
                      <option value="prefix">আগে (Prefix)</option>
                      <option value="suffix">পরে (Suffix)</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={handleInstallClick}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl transition-all group",
                      deferredPrompt 
                        ? "bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20" 
                        : "bg-zinc-800/50 text-zinc-500 cursor-not-allowed border border-zinc-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        deferredPrompt ? "bg-orange-500/20" : "bg-zinc-800"
                      )}>
                        <Smartphone size={18} />
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-sm block">অ্যাপটি ইন্সটল করুন</span>
                        <span className="text-[10px] opacity-60">ফোনে ফুল-স্ক্রিন চালানোর জন্য</span>
                      </div>
                    </div>
                    {deferredPrompt && <Download size={16} className="animate-bounce" />}
                  </button>

                  <div className="pt-2 border-t border-zinc-800">
                    <a 
                      href="https://zunaidhosse.github.io/My-contact/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                          <ExternalLink size={18} />
                        </div>
                        <span className="font-bold text-sm">হেল্প লাইন (Help Line)</span>
                      </div>
                      <X size={16} className="text-zinc-600 group-hover:text-zinc-400 rotate-45" />
                    </a>
                  </div>
                </div>
                
                <button 
                  type="submit"
                  className="w-full mt-6 py-4 bg-orange-500 hover:bg-orange-600 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20"
                >
                  <Check size={20} />
                  সেভ করুন
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bill Preview Modal */}
      <AnimatePresence>
        {isReceiptOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-[110] px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReceiptOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md flex flex-col gap-6 max-h-[95vh] h-full"
            >
              {/* The Actual Bill Content */}
              <div className="flex-1 overflow-y-auto scrollbar-hide rounded-3xl shadow-2xl">
                <div 
                  ref={receiptRef}
                  className="bg-white text-black p-6 sm:p-10 shadow-2xl font-mono text-sm leading-relaxed"
                  style={{ width: '100%', minWidth: '380px' }}
                >
                {/* Header */}
                <div className="text-center space-y-2 mb-8 border-b-2 border-dashed border-zinc-300 pb-6">
                  <div 
                    className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white mb-2"
                    style={{ backgroundColor: settings.logoColor }}
                  >
                    <CalcIcon size={32} />
                  </div>
                  <h2 className="text-2xl font-black uppercase text-zinc-900 leading-tight">{settings.name}</h2>
                  <p className="text-[10px] text-zinc-500 max-w-[200px] mx-auto uppercase tracking-widest">{settings.address}</p>
                  <div className="flex justify-center gap-4 text-[10px] font-bold mt-4">
                    <span>M: {settings.phone}</span>
                    <span>T: {new Date().toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Info Bar */}
                <div className="flex justify-between mb-6 pb-2 border-b border-zinc-100 text-[10px] font-bold uppercase text-zinc-400">
                  <span>Bill #{(Math.random()*10000).toFixed(0)}</span>
                  <span>Date: {new Date().toLocaleDateString()}</span>
                </div>

                {/* Items Table */}
                <div className="space-y-4 mb-8">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase border-b border-zinc-800 pb-2">
                    <div className="col-span-1">#</div>
                    <div className="col-span-7">Items</div>
                    <div className="col-span-4 text-right">Amount</div>
                  </div>
                  
                  {history.length > 0 ? (
                    history.map((item, idx) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 text-[11px] items-center">
                        <div className="col-span-1 text-zinc-300">{idx + 1}</div>
                        <div className="col-span-7 font-bold">
                          {item.label || (
                             <span className="text-zinc-400 font-normal italic">হিসাব - {idx + 1}</span>
                          )}
                        </div>
                        <div className="col-span-4 text-right font-black">
                          {settings.currencyPosition === 'prefix' && settings.currencySymbol}
                          {parseFloat(item.result).toFixed(2)}
                          {settings.currencyPosition === 'suffix' && settings.currencySymbol}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-zinc-300 italic">কোনো আইটেম নেই</div>
                  )}
                </div>

                {/* Totals */}
                <div className="border-t-2 border-zinc-800 pt-6 space-y-2">
                  <div className="flex justify-between text-base font-black">
                    <span className="uppercase">Total Amount</span>
                    <span className="text-xl">
                      {settings.currencyPosition === 'prefix' && settings.currencySymbol}
                      {history.reduce((acc, curr) => acc + (parseFloat(curr.result) || 0), 0).toFixed(2)}
                      {settings.currencyPosition === 'suffix' && settings.currencySymbol}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-400 border-t border-dashed border-zinc-200 pt-6">
                  {settings.footerMessage}
                  <div className="mt-4 text-[7px] opacity-30">Powered by Smart Calc PWA</div>
                </div>
              </div>
            </div>

            {/* Controls */}
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsReceiptOpen(false)}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold transition-all border border-zinc-700"
                >
                  বাতিল করুন
                </button>
                <button 
                  onClick={downloadReceipt}
                  className="flex-[2] py-4 bg-orange-500 hover:bg-orange-600 rounded-2xl font-bold shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  ডাউনলোড করুন (PNG)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
