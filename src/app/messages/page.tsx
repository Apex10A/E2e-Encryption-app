'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { 
  fetchConversations, 
  fetchMessages, 
  fetchMe, 
  sendEncryptedMessage,
  fetchPublicKey,
  fetchUsers
} from '@/lib/api';
import { getPrivateKey } from '@/lib/storage';
import { decryptMessage, encryptMessageForMultiple, importPublicKey } from '@/lib/crypto';
import { Conversation, Message, User } from '@/types';
import Loading from '../loading';


export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const results = await fetchUsers(query);
      setSearchResults(results.filter(u => u.id !== currentUser?.id));
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [currentUser]);

  const loadMessages = useCallback(async (userId: string) => {
    setLoadingMessages(true);
    try {
      const msgs = await fetchMessages(userId);
      const chronologicalMsgs = [...msgs].reverse();
      setMessages(chronologicalMsgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const handleIncomingMessage = useCallback(async (msg: Message) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });

    // Increment unread count if message is from someone else and not the current chat
    if (msg.from_user_id !== currentUser?.id && msg.from_user_id !== selectedUserId) {
      setUnreadCounts(prev => ({
        ...prev,
        [msg.from_user_id]: (prev[msg.from_user_id] || 0) + 1
      }));
    }

    // Update conversations list to show newest on top
    const convs = await fetchConversations();
    setConversations(convs);
  }, [currentUser, selectedUserId]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    if (!token || !currentUser) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.host;
    const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const wsUrl = `${protocol}//${host}/ws?token=${token}`;
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket Connected');
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message.receive') {
          handleIncomingMessage(data.message);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
      setSocket(null);
      // Optional: implement reconnect logic here
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };

    return () => {
      ws.close();
    };
  }, [currentUser, handleIncomingMessage]);

  // Decrypt whenever the thread or crypto material changes (fixes race where loadMessages ran before privateKey existed).
  useEffect(() => {
    if (messages.length === 0) return;

    let cancelled = false;

    (async () => {
      const updates: Record<string, string> = {};

      for (const msg of messages) {
        const id = String(msg.id);
        if (id.startsWith('temp-')) continue;

        if (!privateKey || !currentUser) {
          updates[id] =
            '[Encryption unavailable on this device — log out and sign in again with your password.]';
          continue;
        }

        const encryptedKey =
          String(msg.from_user_id) === String(currentUser.id)
            ? msg.payload.encryptedKeyForSelf
            : msg.payload.encryptedKey;

        try {
          const text = await decryptMessage(
            msg.payload.ciphertext,
            encryptedKey,
            msg.payload.iv,
            privateKey,
          );
          updates[id] = text;
        } catch (err) {
          console.error('Decryption failed for message:', msg.id, err);
          updates[id] = '[Decryption failed]';
        }
      }

      if (cancelled) return;

      setDecryptedMessages((prev) => {
        const next = { ...prev };
        for (const [id, text] of Object.entries(updates)) {
          next[id] = text;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [messages, privateKey, currentUser]);

  useEffect(() => {
    const init = async () => {
      try {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
        if (!token || token === 'null' || token === 'undefined') {
          router.push('/login');
          return;
        }

        const user = await fetchMe();
        setCurrentUser(user);

        const key = await getPrivateKey(user.id);
        setPrivateKey(key);

        const convs = await fetchConversations();
        setConversations(convs);
        
        setLoading(false);
      } catch (err) {
        console.error('Initialization failed:', err);
        router.push('/login');
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    if (selectedUserId) {
      const timeoutId = setTimeout(() => {
        loadMessages(selectedUserId);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedUserId, loadMessages]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, handleSearch]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, decryptedMessages, scrollToBottom]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const selectUser = (user: User | Conversation) => {
    const id = 'user_id' in user ? user.user_id : user.id;
    setSelectedUserId(id);
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
    
    // Clear unread count for this user
    setUnreadCounts(prev => ({
      ...prev,
      [id]: 0
    }));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !selectedUserId || !currentUser || !privateKey) return;

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      from_user_id: currentUser.id,
      to_user_id: selectedUserId,
      payload: { ciphertext: '', iv: '', encryptedKey: '', encryptedKeyForSelf: '' },
      delivered: false,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setDecryptedMessages(prev => ({ ...prev, [tempId]: content }));
    setNewMessage('');
    setIsEncrypting(true);

    try {
      const recipientKeyInfo = await fetchPublicKey(selectedUserId);
      const recipientPublicKey = await importPublicKey(recipientKeyInfo.public_key);
      
      const myKeyInfo = await fetchPublicKey(currentUser.id);
      const myPublicKey = await importPublicKey(myKeyInfo.public_key);

      const encryption = await encryptMessageForMultiple(content, [recipientPublicKey, myPublicKey]);

      const payload = {
        ciphertext: encryption.encryptedContent,
        iv: encryption.iv,
        encryptedKey: encryption.encryptedKeys[0],
        encryptedKeyForSelf: encryption.encryptedKeys[1]
      };

      const sentMsg = await sendEncryptedMessage(selectedUserId, payload);
      
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m));
      setDecryptedMessages(prev => {
        const next = { ...prev };
        delete next[tempId];
        next[sentMsg.id] = content;
        return next;
      });
    } catch (err) {
      console.error('Send failed:', err);
      setError('Failed to send message');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setDecryptedMessages(prev => {
        const next = { ...prev };
        delete next[tempId];
        return next;
      });
      // Restore input
      setNewMessage(content);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className={`${selectedUserId ? 'hidden' : 'flex'} md:flex w-full md:w-[320px] lg:w-[380px] bg-[#111114] border-r border-[#23232a] flex-col shrink-0`}>
        <div className="p-4 md:p-6 border-b border-[#23232a] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#4f46e5] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="font-bold text-xl tracking-tight">MutterBox</h2>
        </div>

        {/* Search Bar */}
        <div className="p-4 relative">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1c1c21] border border-[#2d2d35] rounded-xl text-sm focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent outline-none transition-all placeholder-[#52525e]"
              data-testid="user-search-input"
            />
          </div>
          
          {searchResults.length > 0 && (
            <div className="absolute left-4 right-4 mt-2 bg-[#1c1c21] border border-[#2d2d35] rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => selectUser(user)}
                  className="p-4 hover:bg-[#23232a] cursor-pointer border-b border-[#2d2d35] last:border-0 transition-colors"
                >
                  <div className="font-semibold text-sm">{user.display_name}</div>
                  <div className="text-xs text-[#9494a0]">@{user.username}</div>
                </div>
              ))}
            </div>
          )}
          {isSearching && (
            <div className="absolute right-8 top-7 flex items-center">
              <svg className="animate-spin h-4 w-4 text-[#4f46e5]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.length === 0 && !searchQuery ? (
            <div className="p-10 text-center space-y-2">
              <div className="text-[#32323a] flex justify-center">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-[#52525e] text-sm font-medium">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.user_id}
                onClick={() => selectUser(conv)}
                className={`p-4 mx-2 my-1 rounded-xl cursor-pointer transition-all duration-200 group ${
                  selectedUserId === conv.user_id 
                    ? 'bg-[#23232a] shadow-inner border border-[#2d2d35]' 
                    : 'hover:bg-[#1c1c21] border border-transparent'
                }`}
                data-testid={`conversation-${conv.username}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                    selectedUserId === conv.user_id ? 'bg-[#4f46e5] text-white' : 'bg-[#2d2d35] text-[#9494a0]'
                  }`}>
                    {conv.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="font-semibold text-sm truncate text-[#ededed] group-hover:text-white transition-colors">{conv.display_name}</div>
                      <svg className="w-3 h-3 text-[#52525e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    {unreadCounts[conv.user_id] > 0 && (
                      <div className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-[#4f46e5] rounded-full text-[10px] font-bold text-white shadow-lg animate-in zoom-in duration-200">
                        {unreadCounts[conv.user_id]}
                      </div>
                    )}
                    <div className="text-xs text-[#9494a0] truncate">@{conv.username}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Current User Info */}
        <div className="p-4 md:p-6 border-t border-[#23232a] bg-[#0e0e11]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-[#23232a] border border-[#2d2d35] rounded-full flex items-center justify-center font-bold text-[#4f46e5]">
                {currentUser?.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{currentUser?.display_name}</div>
                <div className="text-[10px] text-[#52525e] truncate uppercase tracking-wider font-bold">@{currentUser?.username}</div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-[#52525e] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
              title="Logout"
              data-testid="logout-button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${selectedUserId ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-[#0a0a0c]`}>
        {selectedUserId ? (
          <>
            {/* Chat Header */}
            <div className="px-4 md:px-8 py-5 border-b border-[#23232a] bg-[#0e0e11]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-40">
              <div className="flex items-center gap-2 md:gap-4">
                <button 
                  onClick={() => setSelectedUserId(null)}
                  className="md:hidden p-2 -ml-2 text-[#52525e] hover:text-[#ededed] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="w-10 h-10 bg-[#4f46e5] rounded-full flex items-center justify-center font-bold shadow-lg shadow-indigo-500/10 shrink-0">
                  {selectedUser?.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-lg leading-none mb-1 text-[#ededed]">
                    {selectedUser?.display_name || 'Chat'}
                  </div>
                  <div className="text-xs text-[#52525e] font-medium">
                    @{selectedUser?.username}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#4f46e5]/10 border border-[#4f46e5]/20 rounded-full">
                <svg className="w-3.5 h-3.5 text-[#4f46e5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-[10px] font-bold text-[#4f46e5] uppercase tracking-widest">End-to-end encrypted</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed opacity-[0.98]">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <svg className="animate-spin h-8 w-8 text-[#4f46e5]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div className="text-[#52525e] text-sm font-medium animate-pulse">Retrieving secure messages...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-[#16161a] border border-[#23232a] rounded-3xl flex items-center justify-center">
                    <svg className="w-10 h-10 text-[#32323a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[#ededed] font-bold">No messages yet</p>
                    <p className="text-[#52525e] text-sm">Be the first to say hello!</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.from_user_id === currentUser?.id;
                  const isTemp = msg.id.toString().startsWith('temp-');
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      <div className={`flex items-end gap-2 max-w-[80%] md:max-w-[70%]`}>
                        {!isMe && (
                          <div className="w-6 h-6 bg-[#23232a] border border-[#2d2d35] rounded-full flex items-center justify-center text-[10px] font-bold text-[#4f46e5] mb-1">
                            {selectedUser?.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div 
                          className={`relative p-4 rounded-2xl shadow-xl transition-all ${
                            isMe 
                              ? 'bg-[#4f46e5] text-white rounded-br-none shadow-indigo-500/10' 
                              : 'bg-[#16161a] text-[#ededed] border border-[#23232a] rounded-bl-none shadow-black/20'
                          } ${isTemp ? 'opacity-70 grayscale-[0.5]' : 'opacity-100'}`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {decryptedMessages[String(msg.id)] || (
                              <span className="flex items-center gap-2 italic opacity-60">
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Decrypting...
                              </span>
                            )}
                          </div>
                          
                          <div className={`absolute bottom-1 right-2 flex items-center gap-1 opacity-60 transition-opacity`}>
                            <svg className={`w-3 h-3 ${isMe ? 'text-white/80' : 'text-[#52525e]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className={`text-[10px] mt-1.5 font-bold tracking-wider uppercase ${isMe ? 'mr-1 text-[#52525e]' : 'ml-8 text-[#52525e]'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMe && (
                           <span className="ml-2">
                             {isTemp ? '• Sending' : msg.delivered ? '• Delivered' : '• Sent'}
                           </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-[#0e0e11] border-t border-[#23232a]">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-2 md:gap-3 items-center">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-[#16161a] border border-[#23232a] rounded-2xl py-3 md:py-3.5 px-4 md:px-6 pr-12 text-sm focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent outline-none transition-all placeholder-[#52525e]"
                    data-testid="message-input"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2" ref={emojiPickerRef}>
                    {showEmojiPicker && (
                      <div className="absolute bottom-14 right-0 z-50 shadow-2xl">
                        <EmojiPicker 
                          onEmojiClick={onEmojiClick} 
                          theme={Theme.DARK}
                          autoFocusSearch={false}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`transition-colors ${showEmojiPicker ? 'text-[#4f46e5]' : 'text-[#32323a] hover:text-[#52525e]'}`}
                      title="Add emoji"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isEncrypting}
                  className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-4 md:px-6 py-3 md:p-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:grayscale shrink-0 flex items-center gap-2"
                  data-testid="send-button"
                  title="Send encrypted message"
                >
                  {isEncrypting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs md:text-sm">Encrypting...</span>
                    </>
                  ) : (
                    <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            <div className="relative mb-10">
              <div className="absolute inset-0 bg-[#4f46e5] blur-[80px] opacity-20 rounded-full animate-pulse"></div>
              <div className="relative w-32 h-32 bg-[#16161a] border border-[#23232a] rounded-[40px] flex items-center justify-center shadow-2xl">
                <svg className="w-16 h-16 text-[#4f46e5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-3 tracking-tight text-[#ededed]">Select a conversation</h3>
            <p className="text-[#52525e] max-w-sm mx-auto leading-relaxed">
              Your messages are protected with industry-standard end-to-end encryption. Only you and the recipient can read them.
            </p>
            {/* <div className="mt-10 flex items-center gap-2 px-4 py-2 bg-[#16161a] border border-[#23232a] rounded-full text-[10px] font-bold text-[#4f46e5] uppercase tracking-[0.2em]">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4f46e5] opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4f46e5]"></span>
               </span>
               Encryption Active
            </div> */}
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-8 right-8 bg-red-900/90 backdrop-blur-md border border-red-500/50 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] animate-in slide-in-from-right-10 duration-500 flex items-center gap-4">
          <div className="bg-white/10 p-2 rounded-lg">
             <svg className="w-5 h-5 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          </div>
          <p className="font-medium text-sm">{error}</p>
          <button onClick={() => setError('')} className="ml-2 p-1 hover:bg-white/10 rounded-md transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l18 18" />
            </svg>
          </button>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #23232a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2d2d35;
        }
      `}</style>
    </div>
  );
}
