import React, { useState, useEffect, useRef } from 'react';
import { trpc } from '../trpc';

export function ChatRoom() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  
  // Queries
  const myChats = trpc.getMyChats.useQuery();
  const allUsers = trpc.getAllUsers.useQuery();
  const me = trpc.me.useQuery(); // <--- Get "My ID"
  
  // Mutations
  const createPrivate = trpc.createPrivateChat.useMutation({
    onSuccess: (data) => {
       setSelectedChatId(data.id);
       myChats.refetch();
    }
  });

  return (
    <div className="flex h-[600px] w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden font-sans">
      
      {/* --- LEFT SIDEBAR --- */}
      <div className="w-1/3 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-4 bg-slate-900 border-b border-slate-800">
          <h2 className="text-white font-bold mb-3 text-lg">Chats</h2>
          
          <select 
            className="w-full bg-slate-800 text-slate-300 p-2.5 rounded-lg text-sm outline-none border border-slate-700 focus:border-indigo-500 transition-colors"
            onChange={(e) => {
              if(e.target.value) createPrivate.mutate({ otherUserId: e.target.value });
            }}
            defaultValue=""
          >
            <option value="" disabled>+ Start New Conversation</option>
            {allUsers.data?.map(u => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {myChats.data?.map(chat => {
            const isGroup = chat.isGroup;
            // Filter out "Me" to find the other person's name
            const otherUser = chat.participants.find(p => p.user.username !== me.data?.username)?.user.username; 
            const title = isGroup ? chat.name : (otherUser || "Chat");
            const lastMsg = chat.messages[0];

            return (
              <div 
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`p-4 cursor-pointer hover:bg-slate-800 transition-all border-b border-slate-800/50 ${selectedChatId === chat.id ? 'bg-slate-800 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="font-bold text-slate-200">{title}</div>
                <div className="flex justify-between items-center mt-1">
                  <div className="text-xs text-slate-400 truncate max-w-[140px]">
                    {lastMsg ? (lastMsg.userId === me.data?.id ? `You: ${lastMsg.content}` : lastMsg.content) : "Start chatting..."}
                  </div>
                  {lastMsg && <span className="text-[10px] text-slate-600">{new Date(lastMsg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- RIGHT SIDE --- */}
      <div className="flex-1 bg-black flex flex-col relative">
        {selectedChatId && me.data ? (
          <ActiveChatWindow conversationId={selectedChatId} myId={me.data.id} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-600 flex-col bg-slate-950">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 text-3xl">👋</div>
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: The Chat Window ---
function ActiveChatWindow({ conversationId, myId }: { conversationId: string, myId: string }) {
  const [msg, setMsg] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<any[]>([]);

  const history = trpc.getHistory.useQuery({ conversationId });
  
  trpc.onMessage.useSubscription({ conversationId }, {
    onData(newMessage) {
      setMessages((prev) => [...prev, newMessage]);
    },
  });

  useEffect(() => {
    if (history.data) setMessages(history.data);
  }, [history.data, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = trpc.sendMessage.useMutation();

  const handleSend = () => {
    if (!msg.trim()) return;
    sendMutation.mutate({ conversationId, content: msg, isCode: isCodeMode });
    setMsg('');
    setIsCodeMode(false);
  };

  return (
    <>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950">
        {messages.map((m, idx) => {
          const isMe = m.userId === myId; // <--- CHECK IF IT IS ME

          return (
            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              
              {/* Message Bubble */}
              <div 
                className={`max-w-[85%] relative shadow-md ${
                  m.isCode 
                    ? 'w-full max-w-xl' // Code blocks get more width
                    : isMe 
                      ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' // My Bubble (Blue, Pointy Top-Right)
                      : 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm' // Other Bubble (Gray, Pointy Top-Left)
                }`}
              >
                {/* Name Label (Only for others in groups) */}
                {!isMe && (
                  <div className="text-[9px] text-slate-400 absolute -top-4 left-1 font-bold uppercase tracking-wide">
                    {m.user?.username}
                  </div>
                )}

                {/* Content */}
                {m.isCode ? (
                  <div className="bg-[#1e1e1e] border border-slate-700/50 rounded-lg overflow-hidden">
                     <div className="flex justify-between items-center bg-[#2d2d2d] px-3 py-1 border-b border-white/5">
                        <span className="text-[10px] text-slate-400 font-mono">CODE SNIPPET</span>
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                          <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                          <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                        </div>
                     </div>
                     <pre className="p-3 text-xs font-mono text-indigo-300 whitespace-pre-wrap overflow-x-auto">{m.content}</pre>
                  </div>
                ) : (
                  <div className="px-4 py-2 text-sm leading-relaxed">
                    {m.content}
                  </div>
                )}
              </div>
              
              {/* Timestamp */}
              <span className={`text-[9px] text-slate-600 mt-1 mx-1`}>
                 {new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="bg-slate-900 p-4 border-t border-slate-800">
        <div className="flex gap-3 items-end">
           {/* Code Toggle Button */}
           <button 
             onClick={() => setIsCodeMode(!isCodeMode)}
             className={`h-10 px-3 rounded-lg flex items-center justify-center transition-all ${isCodeMode ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
             title="Toggle Code Mode"
           >
             <span className="font-mono font-bold text-xs">{isCodeMode ? '</>' : 'Aa'}</span>
           </button>

           {/* Input Field */}
           <div className="flex-1 relative">
              {isCodeMode ? (
                 <textarea 
                   value={msg}
                   onChange={(e) => setMsg(e.target.value)}
                   placeholder="Paste your code snippet here..."
                   className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl p-3 text-indigo-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 h-24 resize-none shadow-inner"
                   autoFocus
                 />
              ) : (
                 <input
                   value={msg}
                   onChange={(e) => setMsg(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                   placeholder="Type a message..."
                   className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 h-10 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                 />
              )}
           </div>
           
           {/* Send Button */}
           <button 
             onClick={handleSend}
             className="h-10 w-10 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 shadow-lg shadow-indigo-500/20"
           >
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 ml-0.5">
               <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 004.835 9h5.17A.745.745 0 0110 9a.75.75 0 010 1.5h-5.17c-.507 0-.965.253-1.14.562L2.28 16.76a.75.75 0 00.826.95l14-5a.75.75 0 000-1.42l-14-5z" />
             </svg>
           </button>
        </div>
        
        {/* Mode Indicator */}
        {isCodeMode && (
          <div className="text-[10px] text-indigo-400 mt-2 flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
            Code Mode Active
          </div>
        )}
      </div>
    </>
  );
}