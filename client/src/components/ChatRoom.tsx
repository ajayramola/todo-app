import React, { useState, useEffect, useRef } from 'react';
import { trpc } from '../trpc';

// --- MOCK HELPER: Simulates online status ---
// (In your real app, this would come from your backend user object, e.g., user.isOnline)
const getRandomStatus = (id: string) => {
  // varied status for demo purposes based on ID char
  return id.charCodeAt(0) % 2 === 0; 
};

export function ChatRoom() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  
  // Group Modal State
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Queries
  const myChats = trpc.getMyChats.useQuery();
  const allUsers = trpc.getAllUsers.useQuery();
  const me = trpc.me.useQuery(); 
  
  // Mutations
  const createPrivate = trpc.createPrivateChat.useMutation({
    onSuccess: (data) => {
       setSelectedChatId(data.id);
       myChats.refetch();
    }
  });

  const createGroup = trpc.createGroup.useMutation({
    onSuccess: (data) => {
        setSelectedChatId(data.id);
        setShowGroupModal(false);
        setNewGroupName("");
        setSelectedUserIds([]);
        myChats.refetch();
    }
  });

  const toggleUserSelection = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedUserIds(prev => [...prev, userId]);
    }
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedUserIds.length === 0) return;
    createGroup.mutate({ name: newGroupName, participantIds: selectedUserIds });
  };

  // Helper to find the active chat object
  const activeChat = myChats.data?.find(c => c.id === selectedChatId);

  return (
    <div className="flex h-[600px] w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden font-sans relative">
      
      {/* --- LEFT SIDEBAR --- */}
      <div className="w-1/3 border-r border-slate-800 bg-slate-900 flex flex-col z-10">
        <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-white font-bold text-lg">Chats</h2>
            <button 
              onClick={() => setShowGroupModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs border border-slate-700 transition-colors"
            >
              + New Group
            </button>
          </div>
          
          <select 
            className="w-full bg-slate-800 text-slate-300 p-2.5 rounded-lg text-sm outline-none border border-slate-700 focus:border-indigo-500 transition-colors"
            onChange={(e) => {
              if(e.target.value) createPrivate.mutate({ otherUserId: e.target.value });
            }}
            defaultValue=""
          >
            <option value="" disabled>Start Private Message...</option>
            {allUsers.data?.map(u => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {myChats.data?.map(chat => {
            const isGroup = chat.isGroup;
            const otherParticipant = chat.participants.find(p => p.user.username !== me.data?.username)?.user; 
            const title = isGroup ? chat.name : (otherParticipant?.username || "Unknown");
            const lastMsg = chat.messages[0];
            
            // Check status (Mocked or Real)
            const isOnline = !isGroup && otherParticipant ? getRandomStatus(otherParticipant.id) : false;

            return (
              <div 
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`p-4 cursor-pointer hover:bg-slate-800 transition-all border-b border-slate-800/50 ${selectedChatId === chat.id ? 'bg-slate-800 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex items-center gap-3">
                   {/* Avatar Container with Status Dot */}
                   <div className="relative">
                     <span className={`flex items-center justify-center w-10 h-10 rounded-full text-lg ${isGroup ? 'bg-orange-500/20 text-orange-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                        {isGroup ? '👥' : title.charAt(0).toUpperCase()}
                     </span>
                     
                     {/* --- GREEN DOT (Online Indicator) --- */}
                     {!isGroup && isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                     )}
                   </div>

                   <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-200 truncate flex justify-between">
                          {title}
                          {lastMsg && <span className="text-[10px] text-slate-500 font-normal">{new Date(lastMsg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {lastMsg ? (
                            <span>
                                {lastMsg.userId === me.data?.id && <span className="text-indigo-400">You: </span>}
                                {lastMsg.userId !== me.data?.id && isGroup && <span className="text-orange-400">{lastMsg.user.username}: </span>}
                                {lastMsg.content}
                            </span>
                        ) : "Start chatting..."}
                      </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- RIGHT SIDE --- */}
      <div className="flex-1 bg-black flex flex-col relative z-0">
        {selectedChatId && me.data && activeChat ? (
          <ActiveChatWindow 
            conversationId={selectedChatId} 
            myId={me.data.id} 
            chatDetails={activeChat}
            meData={me.data}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-600 flex-col bg-slate-950">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 text-3xl">👋</div>
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {/* --- MODAL: CREATE GROUP --- */}
      {showGroupModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-white font-bold text-lg mb-4">Create New Group</h3>
                
                <div className="mb-4">
                    <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1 block">Group Name</label>
                    <input 
                        type="text" 
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-indigo-500 outline-none"
                        placeholder="e.g. Project Alpha"
                    />
                </div>

                <div className="mb-6">
                    <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">Add Members</label>
                    <div className="max-h-40 overflow-y-auto border border-slate-800 rounded bg-slate-950 p-2 space-y-1">
                        {allUsers.data?.filter(u => u.id !== me.data?.id).map(u => {
                            const isOnline = getRandomStatus(u.id);
                            return (
                                <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-slate-900 rounded cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedUserIds.includes(u.id)}
                                        onChange={() => toggleUserSelection(u.id)}
                                        className="accent-indigo-500 w-4 h-4 rounded"
                                    />
                                    <div className="relative">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold group-hover:bg-slate-700">
                                            {u.username.charAt(0).toUpperCase()}
                                        </div>
                                        {/* Status Dot in Modal */}
                                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-slate-950 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-600'}`}></span>
                                    </div>
                                    <span className="text-slate-300 text-sm flex-1">{u.username}</span>
                                    {isOnline && <span className="text-[10px] text-green-500 font-medium">Online</span>}
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <button 
                        onClick={() => setShowGroupModal(false)}
                        className="px-4 py-2 text-slate-400 text-sm hover:text-white"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleCreateGroup}
                        disabled={!newGroupName || selectedUserIds.length === 0}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create Group
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENT: The Chat Window ---
function ActiveChatWindow({ conversationId, myId, chatDetails, meData }: { conversationId: string, myId: string, chatDetails: any, meData: any }) {
  const [msg, setMsg] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<any[]>([]);

  // Identify Chat Type & Other User
  const isGroup = chatDetails.isGroup;
  const otherParticipant = chatDetails.participants.find((p: any) => p.user.id !== myId)?.user;
  const chatTitle = isGroup ? chatDetails.name : otherParticipant?.username;
  const isOnline = !isGroup && otherParticipant ? getRandomStatus(otherParticipant.id) : false;

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
      {/* --- NEW: CHAT HEADER --- */}
      <div className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center px-6 justify-between z-20 backdrop-blur-md">
         <div className="flex items-center gap-3">
             <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg ${isGroup ? 'bg-orange-600 text-white' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'}`}>
                    {isGroup ? '👥' : chatTitle?.charAt(0).toUpperCase()}
                </div>
                {/* Header Status Dot */}
                {!isGroup && (
                   <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-slate-900 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-500'}`}></span>
                )}
             </div>
             <div>
                 <h3 className="text-white font-bold text-md leading-tight">{chatTitle}</h3>
                 {!isGroup && (
                    <p className={`text-xs ${isOnline ? 'text-green-400 font-medium' : 'text-slate-500'}`}>
                        {isOnline ? 'Active Now' : 'Offline'}
                    </p>
                 )}
                 {isGroup && (
                    <p className="text-xs text-slate-500">{chatDetails.participants.length} members</p>
                 )}
             </div>
         </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950">
        {messages.map((m, idx) => {
          const isMe = m.userId === myId; 

          return (
            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              
              <div 
                className={`max-w-[85%] relative shadow-md ${
                  m.isCode 
                    ? 'w-full max-w-xl' 
                    : isMe 
                      ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm' 
                }`}
              >
                {!isMe && (
                  <div className="text-[9px] text-slate-400 absolute -top-4 left-1 font-bold uppercase tracking-wide flex items-center gap-1">
                    {m.user?.username}
                  </div>
                )}

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
              <span className={`text-[9px] text-slate-600 mt-1 mx-1`}>
                 {new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="bg-slate-900 p-4 border-t border-slate-800 z-20">
        <div className="flex gap-3 items-end">
           <button 
             onClick={() => setIsCodeMode(!isCodeMode)}
             className={`h-10 px-3 rounded-lg flex items-center justify-center transition-all ${isCodeMode ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
           >
             <span className="font-mono font-bold text-xs">{isCodeMode ? '</>' : 'Aa'}</span>
           </button>

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
           
           <button 
             onClick={handleSend}
             className="h-10 w-10 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 shadow-lg shadow-indigo-500/20"
           >
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 ml-0.5">
               <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 004.835 9h5.17A.745.745 0 0110 9a.75.75 0 010 1.5h-5.17c-.507 0-.965.253-1.14.562L2.28 16.76a.75.75 0 00.826.95l14-5a.75.75 0 000-1.42l-14-5z" />
             </svg>
           </button>
        </div>
        
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