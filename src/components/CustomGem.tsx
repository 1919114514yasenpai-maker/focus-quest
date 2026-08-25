import React, { useState } from 'react';

export const CustomGem: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user'|'gem', text: string}[]>([
    { role: 'gem', text: 'マスター、何か御用ですか？（化学式以外はオウム返しします）' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        role: 'gem', 
        text: data.text || data.error || 'エラーが発生しました' 
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'gem', text: '通信エラーが発生しました' }]);
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
      >
        <span className="text-2xl animate-pulse">💎</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-80 bg-slate-950 border-2 border-indigo-500 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] flex flex-col overflow-hidden animate-fade-in">
          <div className="bg-indigo-950 p-2 border-b border-indigo-500 flex justify-between items-center">
            <span className="text-indigo-200 font-bold text-xs flex items-center gap-1">
              💎 カスタムGEM
            </span>
            <button onClick={() => setIsOpen(false)} className="text-indigo-400 hover:text-indigo-200 font-bold px-1">
              ✕
            </button>
          </div>
          
          <div className="h-64 overflow-y-auto p-3 space-y-3 flex flex-col">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-2 rounded text-xs leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-900 text-indigo-100 border border-indigo-700' 
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 border border-slate-700 p-2 rounded text-xs animate-pulse">
                  考え中...
                </div>
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-slate-800 bg-slate-900 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="話しかける..."
              className="pixel-input flex-1 bg-slate-950 border border-slate-700 text-slate-200 text-xs p-2 rounded focus:outline-none focus:border-indigo-400"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="pixel-btn !bg-indigo-900 !border-indigo-500 !text-indigo-100 text-xs px-3 disabled:opacity-50"
            >
              送信
            </button>
          </div>
        </div>
      )}
    </>
  );
};
