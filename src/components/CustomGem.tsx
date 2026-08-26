import React, { useState, useRef, useEffect } from 'react';

const FALLBACK_DICTIONARY: Record<string, string> = {
  'h2o': '水 (H2O) は、水素と酸素からなる無機化合物です。',
  'nacl': '塩化ナトリウム (NaCl) は、いわゆる食塩の主成分です。',
  'co2': '二酸化炭素 (CO2) は、炭素の酸化物です。',
  'e=mc^2': '特殊相対性理論における質量とエネルギーの等価性を示すアインシュタインの公式です。',
  'e=mc2': '特殊相対性理論における質量とエネルギーの等価性を示すアインシュタインの公式です。',
  '三平方の定理': '直角三角形の斜辺の長さを c、他の2辺の長さを a, b とすると、a^2 + b^2 = c^2 が成り立つ定理です。ピタゴラスの定理とも呼ばれます。',
  'ピタゴラスの定理': '直角三角形の斜辺の長さを c、他の2辺の長さを a, b とすると、a^2 + b^2 = c^2 が成り立つ定理です。',
};

const evaluateMath = (expr: string): string | null => {
  try {
    const cleanExpr = expr.replace(/\s+/g, '');
    if (/^[0-9+\-*/.()]+$/.test(cleanExpr) && cleanExpr.length > 2) {
      const result = new Function('return ' + cleanExpr)();
      if (typeof result === 'number' && !isNaN(result)) {
        return `計算結果: ${result}`;
      }
    }
    return null;
  } catch {
    return null;
  }
};

const getLocalFallback = (text: string): string => {
  const lower = text.toLowerCase().trim();
  
  if (FALLBACK_DICTIONARY[lower]) {
    return `(※AI通信制限中・内蔵辞書より)\n${FALLBACK_DICTIONARY[lower]}`;
  }

  const mathResult = evaluateMath(text);
  if (mathResult) {
    return `(※AI通信制限中・内蔵電卓より)\n${mathResult}`;
  }

  return `(※AI通信制限中・オウム返し)\n${text}`;
};

export const CustomGem: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user'|'gem', text: string}[]>([
    { role: 'gem', text: 'マスター、何か御用ですか？（数式・計算式・公式・化学式などを入力すると解説します。それ以外の言葉はオウム返しします）' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessages(prev => [...prev, { 
          role: 'gem', 
          text: getLocalFallback(userText)
        }]);
        return;
      }
      
      setMessages(prev => [...prev, { 
        role: 'gem', 
        text: data?.text || '（応答が空でした）' 
      }]);
    } catch (e: any) {
      console.error("Fetch Gemini error:", e);
      setMessages(prev => [...prev, { 
        role: 'gem', 
        text: getLocalFallback(userText)
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Gem Icon */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 bg-indigo-950 border-2 border-indigo-400 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(129,140,248,0.6)] hover:bg-indigo-900 transition-all active:scale-95"
        title="知恵の使い魔 カスタムGEM"
      >
        <span className="text-2xl animate-pulse">💎</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-84 sm:w-96 max-w-[calc(100vw-2rem)] bg-slate-950 border-2 border-indigo-500 rounded-lg shadow-[0_0_25px_rgba(99,102,241,0.5)] flex flex-col overflow-hidden animate-fade-in">
          <div className="bg-indigo-950 p-2.5 border-b border-indigo-500 flex justify-between items-center">
            <span className="text-indigo-200 font-bold text-xs flex items-center gap-1.5">
              <span>💎</span> 知恵の使い魔 カスタムGEM
            </span>
            <button 
              onClick={() => setIsOpen(false)} 
              className="text-indigo-400 hover:text-indigo-200 font-bold px-2 py-0.5 rounded hover:bg-indigo-900/50"
            >
              ✕
            </button>
          </div>

          <div className="px-2.5 py-1 bg-indigo-950/40 border-b border-indigo-900/60 text-[10px] text-indigo-300">
            💡 数式・計算式・公式（数学/物理）・化学式を解説します
          </div>
          
          <div className="h-72 overflow-y-auto p-3 space-y-3 flex flex-col">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-2.5 rounded text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-indigo-900 text-indigo-100 border border-indigo-700' 
                    : 'bg-slate-900 text-slate-200 border border-slate-700 shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 text-indigo-300 border border-indigo-800 p-2 rounded text-xs animate-pulse flex items-center gap-1.5">
                  <span>✨</span> 式を解読中...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-2 border-t border-slate-800 bg-slate-900 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="数式・公式・化学式、または言葉を入力..."
              className="pixel-input flex-1 bg-slate-950 border border-slate-700 text-slate-200 text-xs p-2 rounded focus:outline-none focus:border-indigo-400"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="pixel-btn !bg-indigo-900 !border-indigo-500 !text-indigo-100 text-xs px-3.5 disabled:opacity-50"
            >
              送信
            </button>
          </div>
        </div>
      )}
    </>
  );
};
