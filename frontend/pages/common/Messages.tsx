import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Edit, Phone, Video, MoreVertical, Paperclip, Send, 
  Smile, Mic, ChevronLeft, CheckCheck, FileText, Play, Pause, X,
  PlusCircle, User
} from 'lucide-react';
import { authService, messagingService, websocketService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Group, Message as MessageType } from '../../types';

const Messages: React.FC = () => {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New Features State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  // 1. Load User & Fetch Groups
  useEffect(() => {
    console.log('[Messages] Component mounted, getting current user...');
    const user = authService.getCurrentUser();
    console.log('[Messages] Current user:', user);
    if (user) {
      setCurrentUser(user);
      loadGroups(user.id);
    } else {
      console.log('[Messages] No user found, cannot load groups');
      setLoading(false);
    }
  }, []);

  const loadGroups = async (userId: string) => {
    console.log('[Messages] loadGroups called for user:', userId);
    try {
      console.log('[Messages] Calling messagingService.getGroups()...');
      const userGroups = await messagingService.getGroups();
      console.log('[Messages] Groups received:', userGroups);
      setGroups(userGroups);
      setLoading(false);
      
      // Auto-select first group on desktop
      if (window.innerWidth > 768 && userGroups.length > 0) {
        console.log('[Messages] Auto-selecting first group:', userGroups[0].id);
        setActiveGroupId(userGroups[0].id);
      } else {
        console.log('[Messages] No groups available or mobile view');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load groups';
      console.error('[Messages] Error loading groups:', errorMsg, err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
      setLoading(false);
    }
  };

  // 2. Fetch Messages and Connect WebSocket when group changes
  useEffect(() => {
    if (!activeGroupId || !currentUser) return;

    // Disconnect old WebSocket if exists
    if (ws) {
      websocketService.disconnect(ws);
    }

    // Load message history
    const loadMessages = async () => {
      try {
        const msgs = await messagingService.getGroupMessages(activeGroupId, 50);
        setMessages(msgs);
      } catch (err: any) {
        console.error('Failed to load messages:', err);
      }
    };

    loadMessages();

    // Connect WebSocket for real-time updates
    const newWs = websocketService.connect(
      activeGroupId,
      currentUser.id,
      (newMessage: MessageType) => {
        setMessages(prev => [...prev, newMessage]);
      }
    );

    setWs(newWs);

    return () => {
      if (newWs) {
        websocketService.disconnect(newWs);
      }
    };
  }, [activeGroupId, currentUser]);

  // 3. Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeGroupId]);

  // Recording Timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeGroupId || !currentUser) return;

    try {
      await messagingService.sendMessage(activeGroupId, inputText);
      setInputText('');
      showToast('Message sent!', 'success', 1500);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to send message';
      showToast(errorMsg, 'error');
    }
  };

  // Filter groups based on search
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const availableContacts: any[] = [];

  // Audio Msg Simulation
  const stopRecording = () => {
    setIsRecording(false);
    if (activeGroupId) {
      const audioMock = {
        name: 'Voice Note',
        url: '', // Mock
        size: formatTime(recordingTime)
      };
      // TODO: Send audio message via API
      console.log('[Messages] Audio message recording stopped:', audioMock);
    }
  };

  // Reactions
  const handleReaction = (msgId: number, emoji: string) => {
    // TODO: Add reaction via API
    console.log('[Messages] Reaction added:', { msgId, emoji });
    setShowReactionPicker(null);
  };

  // Calls
  const startCall = (type: 'voice' | 'video') => {
    alert(`Starting ${type} call... (Feature simulation)`);
  };

  // Contacts for New Chat
  const openNewChatModal = () => {
    // TODO: Fetch potential contacts from API
    console.log('[Messages] New chat modal opened');
    setShowNewChatModal(true);
  };

  const startNewChat = (contactId: string) => {
    // TODO: Create direct chat via API
    console.log('[Messages] Starting new chat with:', contactId);
    setShowNewChatModal(false);
    setMobileChatOpen(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper getters
  const getChatName = (chat: any) => {
    if (chat.type === 'group') return chat.name;
    return 'Direct Message';
  };

  const getChatAvatar = (chat: any) => {
    if (chat.type === 'group') return null;
    return undefined;
  };

  const activeChatInfo = filteredGroups.find(c => c.id === activeGroupId);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-navy relative">
      
      {/* --- NEW CHAT MODAL --- */}
      {showNewChatModal && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white dark:bg-navy rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                 <h3 className="font-bold text-navy dark:text-white">Start New Conversation</h3>
                 <button onClick={() => setShowNewChatModal(false)}><X className="text-slate-500" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                 {availableContacts.map(contact => (
                    <div key={contact.id} onClick={() => startNewChat(contact.id)} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                       <img src={contact.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                       <div>
                          <p className="font-bold text-sm text-navy dark:text-white">{contact.firstName} {contact.lastName}</p>
                          <p className="text-xs text-slate-500">{contact.role} • {contact.setNumber || 'Staff'}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* --- LEFT SIDEBAR: CONVERSATION LIST --- */}
      <aside className={`
        w-full md:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-navy
        ${mobileChatOpen ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-navy dark:text-white">Messages</h1>
            <button onClick={openNewChatModal} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-primary hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <PlusCircle size={20} />
            </button>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none text-navy dark:text-white placeholder-slate-500"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin mb-2"></div>
                <p className="text-slate-400 text-sm">Loading groups...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          ) : filteredGroups.length > 0 ? (
            filteredGroups.map(group => (
              <div 
                key={group.id}
                onClick={() => {
                  setActiveGroupId(group.id);
                  setMobileChatOpen(true);
                }}
                className={`p-4 flex items-center gap-3 cursor-pointer border-b border-slate-50 dark:border-slate-800/50 transition-colors
                  ${activeGroupId === group.id ? 'bg-blue-50 dark:bg-blue-900/10 border-l-4 border-l-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}
                `}
              >
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg shrink-0">
                  {group.name.charAt(0)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-navy dark:text-white text-sm truncate">{group.name}</h3>
                  </div>
                  <div className="flex justify-between items-center">
                     <p className="text-xs text-slate-500 dark:text-slate-400 truncate pr-2">{group.type === 'SET' ? '📚 Set Group' : '🎯 Stream Group'}</p>
                     <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                       {group.memberCount} members
                     </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 dark:text-slate-500 text-sm">No groups yet</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* --- RIGHT SIDEBAR: CHAT WINDOW --- */}
      <main className={`
        flex-1 flex flex-col bg-[#f0f2f5] dark:bg-slate-900/50 relative
        ${mobileChatOpen ? 'flex fixed inset-0 z-50 bg-white dark:bg-navy' : 'hidden md:flex'}
      `}>
        {activeGroupId && groups.find(g => g.id === activeGroupId) ? (
          <>
            <header className="h-16 px-4 flex items-center justify-between bg-white dark:bg-navy border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileChatOpen(false)} className="md:hidden p-2 -ml-2 text-slate-500"><ChevronLeft size={24} /></button>
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                  {groups.find(g => g.id === activeGroupId)?.name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-bold text-navy dark:text-white text-sm">{groups.find(g => g.id === activeGroupId)?.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{groups.find(g => g.id === activeGroupId)?.memberCount} members</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><MoreVertical size={20} /></button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-4 bg-[url('https://camo.githubusercontent.com/857a27d095bb12b406e22f280a916327d6b384666f7f3299c8366050b4455f5f/68747470733a2f2f7765622e77686174736170702e636f6d2f696d672f62672d636861742d74696c652d6461726b5f6134626535313265373139356236623733336439313130b46238613961356430e2e706e67')] bg-repeat dark:opacity-80">
               {messages.length === 0 ? (
                 <div className="flex items-center justify-center h-full text-center">
                   <div>
                     <Smile className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                     <p className="text-slate-400 dark:text-slate-500 text-sm">No messages yet. Start the conversation!</p>
                   </div>
                 </div>
               ) : (
                 messages.map((msg: MessageType) => {
                   const isMe = msg.userId === currentUser?.id;
                   
                   return (
                     <div key={msg.id} className={`flex gap-3 max-w-[85%] md:max-w-[70%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'} group/msg relative`}>
                        {!isMe && (
                          <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden mt-1 shadow-sm bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <User size={16} className="text-slate-400" />
                          </div>
                        )}

                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                           {!isMe && (
                             <span className="text-[10px] text-slate-500 ml-1 mb-1 font-bold">{msg.userName}</span>
                           )}
                           
                           <div 
                             className={`
                               px-4 py-2 rounded-2xl shadow-sm text-sm relative
                               ${isMe 
                                 ? 'bg-primary text-white rounded-br-none' 
                                 : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none'
                               }
                             `}
                           >
                             <p className="break-words">{msg.content}</p>
                           </div>
                           
                           <span className={`text-[10px] text-slate-400 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                             {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                     </div>
                   );
                 })
               )}
                <div ref={messagesEndRef} />
            </div>

            <footer className="bg-white dark:bg-navy p-3 md:p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
               <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-4xl mx-auto">
                   <input type="file" ref={fileInputRef} className="hidden" />
                   
                   <button type="button" className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" onClick={() => setShowReactionPicker(null)}>
                     <Smile size={24} />
                   </button>
                   
                   <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center px-4 py-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-800 dark:text-white placeholder-slate-500 outline-none max-h-32 overflow-y-auto"
                      />
                   </div>

                   {inputText.trim() && (
                     <button type="submit" className="p-3 bg-primary text-white rounded-full shadow-lg hover:bg-blue-600 transition-all transform hover:scale-105">
                       <Send size={20} fill="currentColor" className="ml-0.5" />
                     </button>
                   )}
                 </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-[#f0f2f5] dark:bg-navy">
             <div className="w-48 h-48 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                <User className="w-32 h-32 text-slate-400 opacity-50" />
             </div>
             <h2 className="text-2xl font-bold text-navy dark:text-white mb-2">PRICE Classroom Messenger</h2>
             <p className="max-w-md">Select a group to start chatting with your Set mates or stream members in real-time.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;
