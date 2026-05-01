import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';
import { Bot, X, Send } from 'lucide-react';
import clsx from 'clsx';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: '👋 Hi! I can answer questions about your website health. Try: "Is my site up?"' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const msgsEndRef = useRef(null);

  const scrollToBottom = () => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      // Send history excluding the first welcome message
      const history = messages.slice(1).map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        text: m.text
      }));

      const res = await apiClient.post('/chat', { message: userMsg, history });
      if (res.success) {
        setMessages(prev => [...prev, { role: 'bot', text: res.data.reply }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, AI is unavailable right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:scale-105 transition-transform z-50"
      >
        {isOpen ? <X size={24} /> : <Bot size={28} />}
      </button>

      <div className={clsx(
        "fixed bottom-28 right-8 w-80 md:w-96 h-[500px] bg-white border border-slate-200 rounded-xl flex flex-col shadow-2xl z-50 transition-all origin-bottom-right duration-200",
        isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none"
      )}>
        <div className="p-4 border-b border-slate-200 flex items-center gap-2 font-semibold text-slate-800">
          <Bot size={20} className="text-blue-500" /> AI Assistant
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={clsx(
                "max-w-[85%] p-3 rounded-xl text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-blue-600 text-white self-end rounded-br-sm" 
                  : "bg-slate-100 text-slate-800 self-start rounded-bl-sm"
              )}
              dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br>') }}
            />
          ))}
          {loading && (
            <div className="bg-slate-100 text-slate-500 self-start p-3 rounded-xl rounded-bl-sm text-sm">
              <span className="animate-pulse">Thinking...</span>
            </div>
          )}
          <div ref={msgsEndRef} />
        </div>

        <div className="p-3 border-t border-slate-200 flex gap-2">
          <textarea
            className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
            rows="1"
            placeholder="Ask about your sites..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button 
            className="btn btn-primary px-3 rounded-lg flex items-center justify-center"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
