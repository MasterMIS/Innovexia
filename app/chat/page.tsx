'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LayoutWrapper from '@/components/LayoutWrapper';
import { ensureSessionId } from '@/utils/session';

interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  receiver_id: number | null;
  message: string;
  message_type: 'text' | 'image' | 'file' | 'audio';
  attachment_url?: string | null;
  attachment_type?: string | null;
  duration_ms?: number | null;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  image_url?: string;
  role_name?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordStart, setRecordStart] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const sessionId = ensureSessionId();
      const response = await fetch('/api/auth', { headers: { 'x-session-id': sessionId } });
      const data = await response.json();
      if (data.authenticated) {
        setUser(data.user);
      }
    };

    checkAuth();
    fetchUsers();
    const interval = setInterval(fetchMessages, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedUserId !== null) {
      fetchMessages();
    }
  }, [selectedUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/chat');
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      return { url: data.url as string, mimeType: data.mimeType as string };
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, extra?: { attachment?: File; messageType?: Message['message_type']; durationMs?: number }) => {
    if (e) e.preventDefault();
    if (!user || (!newMessage.trim() && !extra?.attachment)) return;
    if (!selectedUserId) {
      alert('Select a user to chat with');
      return;
    }

    setIsSending(true);
    try {
      let attachmentUrl = '';
      let attachmentType = '';
      let messageType: Message['message_type'] = extra?.messageType || 'text';

      if (extra?.attachment) {
        const uploaded = await uploadFile(extra.attachment);
        if (!uploaded) {
          setIsSending(false);
          return;
        }
        attachmentUrl = uploaded.url;
        attachmentType = uploaded.mimeType;
        // auto-set message type by mime
        if (uploaded.mimeType.startsWith('image/')) messageType = 'image';
        else if (uploaded.mimeType.startsWith('audio/')) messageType = 'audio';
        else messageType = 'file';
      }

      const payload = {
        senderId: user.id,
        receiverId: selectedUserId,
        message: newMessage.trim(),
        messageType,
        attachmentUrl: attachmentUrl || undefined,
        attachmentType: attachmentType || undefined,
        durationMs: extra?.durationMs,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectUser = (u: User) => {
    setSelectedUserId(u.id);
    setSelectedUser(u);
    setChatSearch('');
    setShowSidebar(false); // Close sidebar on mobile after selecting user
  };

  const handleFileButton = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleSendMessage(undefined, { attachment: file });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedChunks([]);
        const durationMs = recordStart ? Date.now() - recordStart : undefined;
        await handleSendMessage(undefined, { attachment: new File([blob], 'voice-note.webm', { type: 'audio/webm' }), messageType: 'audio', durationMs });
      };
      setRecordedChunks(chunks);
      setRecorder(mediaRecorder);
      setRecordStart(Date.now());
      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    recorder?.stop();
    setRecording(false);
    setRecordStart(null);
  };

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredUsers = users.filter((u) => {
    if (u.id === user?.id) return false;
    const q = contactSearch.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q)
    );
  });

  const conversationMessages = messages.filter((m) => {
    if (!selectedUserId || !user) return false;
    const isBetween =
      (m.sender_id === user.id && m.receiver_id === selectedUserId) ||
      (m.sender_id === selectedUserId && m.receiver_id === user.id);
    if (!isBetween) return false;
    if (!chatSearch) return true;
    return (
      m.message?.toLowerCase().includes(chatSearch.toLowerCase()) ||
      (m.attachment_type || '').toLowerCase().includes(chatSearch.toLowerCase())
    );
  });

  const renderAttachment = (msg: Message) => {
    if (!msg.attachment_url) return null;
    if (msg.message_type === 'image') {
      return (
        <a
          href={msg.attachment_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block"
        >
          <img
            src={msg.attachment_url}
            alt="attachment"
            className="rounded-lg max-w-xs border border-[var(--theme-primary)]/30 dark:border-slate-700 hover:border-[var(--theme-primary)] hover:shadow-lg transition-all cursor-pointer"
          />
        </a>
      );
    }
    if (msg.message_type === 'audio') {
      return (
        <div className="mt-2 w-56">
          <audio controls className="w-full">
            <source src={msg.attachment_url} type={msg.attachment_type || 'audio/webm'} />
            Your browser does not support the audio element.
          </audio>
          {msg.duration_ms ? (
            <p className="text-xs text-slate-500 mt-1">{Math.round(msg.duration_ms / 1000)}s</p>
          ) : null}
        </div>
      );
    }
    // Document/File attachment with preview
    const fileName = msg.attachment_url?.split('/').pop() || 'document';
    const fileExt = fileName.split('.').pop()?.toUpperCase() || 'FILE';
    const isPdf = fileExt === 'PDF';
    const isDoc = ['DOC', 'DOCX'].includes(fileExt);

    return (
      <div className="mt-2">
        <a
          href={msg.attachment_url}
          target="_blank"
          rel="noreferrer"
          className="block"
        >
          <div className="bg-gradient-to-br from-[var(--theme-primary)]/10 to-[var(--theme-secondary)]/10 dark:bg-slate-700/50 border border-[var(--theme-primary)]/30 dark:border-slate-600 rounded-xl p-4 max-w-xs hover:shadow-lg hover:border-[var(--theme-primary)]/50 transition-all cursor-pointer">
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md ${isPdf ? 'bg-red-500' : isDoc ? 'bg-blue-500' : 'bg-gray-500'
                }`}>
                {fileExt}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{fileName}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{msg.attachment_type || 'Document'}</p>
                <div className="inline-flex items-center gap-1 text-xs text-[var(--theme-secondary)] dark:text-[var(--theme-primary)] mt-2 font-medium">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Click to open
                </div>
              </div>
            </div>
          </div>
        </a>
      </div>
    );
  };

  return (
    <LayoutWrapper>
      <div className="flex h-full gap-4 p-2 sm:p-4 md:p-6 bg-gradient-to-br from-[var(--theme-light)] via-[var(--theme-lighter)] to-[#fef6d8] dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 relative">
        {/* Mobile Menu Button - Only show when sidebar is hidden OR when chat is open */}
        {(!showSidebar || selectedUserId) && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showSidebar ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </motion.button>
        )}

        {/* Overlay for mobile - Show when sidebar is manually opened while in chat view */}
        {showSidebar && selectedUserId && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar - Users List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`
            w-full lg:w-80 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm 
            lg:rounded-2xl rounded-none
            shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-0 lg:border border-[var(--theme-primary)]/20 
            dark:border-slate-700 flex flex-col
            lg:relative lg:top-0 lg:h-auto
            fixed top-16 left-0 h-[calc(100vh-4rem)] z-40 transition-transform duration-300
            ${
            // Mobile: hide when user selected (unless manually opened)
            // Desktop: always show
            (selectedUserId && !showSidebar)
              ? '-translate-x-full lg:translate-x-0'
              : 'translate-x-0'
            }
          `}
        >
          {/* Sidebar Header */}
          <div className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] p-4 rounded-t-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              💬 All Chats
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search people..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-700/50 text-gray-900 dark:text-white placeholder-gray-600 dark:placeholder-slate-400 focus:ring-2 focus:ring-white/50 outline-none text-sm shadow-sm border border-white/30"
              />
              <svg className="w-5 h-5 absolute left-3 top-3 text-gray-700 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Online Now Section */}
          <div className="p-4 border-b border-[var(--theme-primary)]/20 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-400">🟢 Online Now</h3>
              <span className="text-xs text-[var(--theme-secondary)] dark:text-[var(--theme-primary)] cursor-pointer font-medium hover:underline">View All</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {filteredUsers.slice(0, 5).map((u) => (
                u.id !== user?.id && (
                  <div key={u.id} className="flex flex-col items-center cursor-pointer" onClick={() => handleSelectUser(u)}>
                    <div className="relative">
                      {u.image_url ? (
                        <img src={u.image_url} alt={u.username} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] flex items-center justify-center text-gray-900 text-sm font-bold shadow-md">
                          {u.username[0].toUpperCase()}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Recent Chat Section */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-400 mb-3">💬 Recent Chat</h3>
            {filteredUsers.map((u) => (
              u.id !== user?.id && (
                <motion.button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full text-left p-3 rounded-xl transition-all ${selectedUserId === u.id
                    ? 'bg-gradient-to-r from-[var(--theme-primary)]/20 to-[var(--theme-secondary)]/20 border-l-4 border-[var(--theme-primary)] shadow-md'
                    : 'hover:bg-[var(--theme-primary)]/10 dark:hover:bg-slate-700/50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {u.image_url ? (
                        <img src={`/api/image-proxy?url=${encodeURIComponent(u.image_url)}`} alt={u.username} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] flex items-center justify-center text-gray-900 text-sm font-bold shadow-md">
                          {u.username[0].toUpperCase()}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`font-semibold truncate ${selectedUserId === u.id
                          ? 'text-gray-900 dark:text-[var(--theme-primary)]'
                          : 'text-slate-900 dark:text-white'
                          }`}>
                          {u.full_name || u.username}
                        </p>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{formatTime(new Date().toISOString())}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">Click to start chatting</p>
                    </div>
                  </div>
                </motion.button>
              )
            ))}
          </div>
        </motion.div>

        {/* Chat Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            flex-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm 
            lg:rounded-2xl rounded-none
            shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[var(--theme-primary)]/20 dark:border-slate-700 
            flex flex-col w-full lg:w-auto
            ${selectedUserId ? 'block' : 'hidden lg:flex'}
            ${selectedUserId ? 'fixed top-16 left-0 right-0 h-[calc(100vh-4rem)] lg:relative lg:top-0 lg:h-auto z-30' : ''}
          `}
        >
          {selectedUserId && selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] p-3 sm:p-4 rounded-t-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedUserId(null)}
                      className="lg:hidden p-1.5 rounded-full text-gray-900 hover:bg-white/50 transition mr-1"
                      title="Back to contacts"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </motion.button>
                    {selectedUser.image_url ? (
                      <img src={`/api/image-proxy?url=${encodeURIComponent(selectedUser.image_url)}`} alt={selectedUser.username} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center text-gray-900 font-bold shadow-lg border-2 border-white/50 flex-shrink-0">
                        {selectedUser.username[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                        {selectedUser.full_name || selectedUser.username}
                      </h3>
                      <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 flex items-center gap-1 font-medium">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="hidden sm:inline">Last Seen at 07:15 PM</span>
                        <span className="sm:hidden">Online</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowChatSearch((s) => !s)}
                      className={`p-1.5 sm:p-2 rounded-xl text-gray-900 hover:bg-white/50 transition ${showChatSearch ? 'bg-white/50 shadow-sm' : ''}`}
                      title="Search in chat"
                    >
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="p-1.5 sm:p-2 rounded-xl text-gray-900 hover:bg-white/50 transition hidden sm:block" title="Call">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="p-1.5 sm:p-2 rounded-xl text-gray-900 hover:bg-white/50 transition hidden sm:block" title="Info">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.button>
                    <div className="relative hidden sm:block">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="p-1.5 sm:p-2 rounded-xl text-gray-900 hover:bg-white/50 transition" title="More">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </motion.button>
                    </div>
                  </div>
                </div>
                {showChatSearch && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3"
                  >
                    <input
                      type="text"
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      placeholder="Search in this chat..."
                      className="w-full px-3 py-2.5 rounded-xl bg-white/50 dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-white/50 border border-white/30 shadow-sm text-gray-900 dark:text-white"
                    />
                  </motion.div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 bg-gradient-to-br from-[var(--theme-light)]/50 via-[var(--theme-lighter)]/50 to-[#fef6d8]/50 dark:bg-slate-900/50">
                {conversationMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-600 dark:text-slate-400">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-lg font-medium mb-1">No messages yet</p>
                      <p className="text-sm">Start a conversation with {selectedUser.full_name || selectedUser.username}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center"
                    >
                      <span className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] px-4 py-1.5 rounded-full text-xs text-gray-900 font-semibold shadow-md">
                        📅 Today, July 24
                      </span>
                    </motion.div>
                    {conversationMessages.map((msg, index) => {
                      const isCurrentUser = msg.sender_id === user?.id;
                      const sender = users.find(u => u.id === msg.sender_id);
                      return (
                        <div
                          key={msg.id || index}
                          className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isCurrentUser && sender && (
                            sender.image_url ? (
                              <img src={`/api/image-proxy?url=${encodeURIComponent(sender.image_url)}`} alt={sender.username} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] flex items-center justify-center text-gray-900 text-xs font-bold flex-shrink-0 shadow-md">
                                {sender.username[0].toUpperCase()}
                              </div>
                            )
                          )}
                          <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-md`}>
                            {!isCurrentUser && (
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{msg.sender_name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatTime(msg.created_at)}
                                </span>
                              </div>
                            )}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`px-4 py-2.5 rounded-2xl shadow-md ${isCurrentUser
                                ? 'bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-gray-900 rounded-br-none'
                                : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none border border-[var(--theme-primary)]/20'
                                }`}
                            >
                              {msg.message && <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.message}</p>}
                              {renderAttachment(msg)}
                            </motion.div>
                            {isCurrentUser && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatTime(msg.created_at)}
                                </span>
                                <svg className="w-4 h-4 text-[var(--theme-secondary)] dark:text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                          {isCurrentUser && user && (
                            user.image_url ? (
                              <img src={`/api/image-proxy?url=${encodeURIComponent(user.image_url)}`} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] flex items-center justify-center text-gray-900 text-xs font-bold flex-shrink-0 shadow-md">
                                {user.username[0].toUpperCase()}
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="bg-gradient-to-r from-[var(--theme-primary)]/10 to-[var(--theme-secondary)]/10 dark:bg-slate-800 p-2 sm:p-3 md:p-4 rounded-b-2xl border-t border-[var(--theme-primary)]/20 dark:border-slate-700">
                <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-1 sm:gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleFileButton}
                    className="p-1.5 sm:p-2 rounded-xl text-gray-900 dark:text-slate-400 hover:bg-[var(--theme-primary)]/20 dark:hover:bg-slate-700 transition"
                    title="Attach file"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a4 4 0 10-5.656-5.656L7 7" />
                    </svg>
                  </motion.button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,audio/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={recording ? stopRecording : startRecording}
                    className={`p-1.5 sm:p-2 rounded-xl ${recording ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' : 'text-gray-900 dark:text-slate-400 hover:bg-[var(--theme-primary)]/20 dark:hover:bg-slate-700'} transition`}
                    title="Voice note"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10v2a7 7 0 01-14 0v-2m7 7v4m-4 0h8" />
                    </svg>
                  </motion.button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="✍️ Type message..."
                    className="flex-1 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-[var(--theme-primary)]/30 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-primary)] outline-none text-sm shadow-sm"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={isSending || uploading}
                    className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] hover:from-[var(--theme-secondary)] hover:to-[#d4b229] text-gray-900 p-2 sm:p-2.5 md:p-3 rounded-xl transition shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </motion.button>
                </form>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full"
            >
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] flex items-center justify-center text-4xl shadow-xl">
                  💬
                </div>
                <p className="text-gray-900 dark:text-slate-400 text-lg font-medium">Select a user to start chatting</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </LayoutWrapper>
  );
}

