'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useAuthStore, UserProfile } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Phone, MoreVertical, Image as ImageIcon, Send, Camera, Mic, Square, Trash2, Video } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { resolveApiUrl } from '@/lib/api-helper';

interface Message {
  id: string;
  sender_id: string;
  text?: string;
  // Either a base64 data URI (legacy) or an R2 object key ("chat/images/...")  
  image_url?: string | null;
  // Either a base64 data URI (legacy) or an R2 object key ("chat/audio/...")
  audio_url?: string | null;
  inquiry_id?: string | null;
  inquiry_urgency?: string | null;
  video_object_key?: string | null;
  video_status?: string | null;
  video_expires_at?: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

/** Returns the src to use for a stored media value.
 *  Legacy rows stored full base64 data URIs; new rows store R2 object keys. */
function mediaSrc(value: string | null | undefined, apiPrefix: string): string | null {
  if (!value) return null;
  if (value.startsWith('data:') || value.startsWith('http')) return value;
  // R2 object key — route through the signed-URL proxy
  return resolveApiUrl(`${apiPrefix}/${value.replace(/^chat\//, '')}`);
}



function ChatContent() {
  const { profile, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const peerId = searchParams.get('peerId') as string;
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  
  const [peer, setPeer] = useState<UserProfile | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // image: file object for new upload; imagePreview: local object URL for preview only
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Store the File for R2 upload; create a local object URL just for preview
    setImageFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return preview; });
  };

  // Fetch peer profile
  useEffect(() => {
    if (!peerId) return;

    const fetchPeer = async () => {
      try {
        const { data, error: peerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', peerId)
          .single();
        
        if (peerError) throw peerError;
        
        if (data) {
          setPeer({
            uid: data.id,
            displayName: data.display_name,
            email: data.email || '',
            photoURL: data.photo_url || '',
            role: data.role as 'trainer' | 'trainee',
            focusArea: data.focus_area || '',
            createdAt: data.created_at,
          });
        } else {
          setError('User profile not found.');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error fetching peer:', err);
        setError(err.message || 'Could not fetch peer profile.');
        setLoading(false);
      }
    };
    fetchPeer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId, profile?.uid]);

  // Find or create chat
  useEffect(() => {
    // Wait for auth to resolve before doing anything
    if (authLoading) return;
    if (!profile || !peerId) {
      setLoading(false);
      return;
    }

    const findOrCreateChat = async () => {
      try {
        // Find existing chat between two users
        const { data: myChats, error: myChatsError } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', profile.uid);

        if (myChatsError) throw myChatsError;

        if (myChats && myChats.length > 0) {
          const chatIds = myChats.map(c => c.chat_id);
          const { data: existingChat, error: existingChatError } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', peerId)
            .in('chat_id', chatIds)
            .maybeSingle();

          if (existingChatError) throw existingChatError;

          if (existingChat) {
            setChatId(existingChat.chat_id);
            return;
          }
        }

        // If none found, create new chat + participants
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert({})
          .select('id')
          .single();

        if (chatError) throw chatError;

        if (newChat) {
          const { error: participantsError } = await supabase.from('chat_participants').insert([
            { chat_id: newChat.id, user_id: profile.uid },
            { chat_id: newChat.id, user_id: peerId }
          ]);
          if (participantsError) throw participantsError;
          
          setChatId(newChat.id);
        }
      } catch (err: any) {
        console.error('Error finding/creating chat:', err);
        setError(err.message || 'Could not establish chat connection.');
        setLoading(false);
      }
    };

    findOrCreateChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, authLoading, peerId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Listen to messages — load only the latest PAGE_SIZE to keep the DB payload tiny
  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      try {
        // Fetch newest PAGE_SIZE messages (descending) then reverse for display
        const { data, error: msgError } = await supabase
          .from('messages')
          .select('id, sender_id, text, image_url, audio_url, inquiry_id, inquiry_urgency, video_object_key, video_status, video_expires_at, created_at')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);
        
        if (msgError) throw msgError;

        if (data) {
          const ordered = [...data].reverse();
          setMessages(ordered);
          setHasOlderMessages(data.length === PAGE_SIZE);
          setOldestCursor(ordered[0]?.created_at ?? null);
          scrollToBottom();
        }
      } catch (err: any) {
        console.error('Error fetching messages:', err);
        setError(err.message || 'Could not load messages.');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase.channel(`chat:${chatId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `chat_id=eq.${chatId}` 
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, peerId, profile?.uid]);

  const loadOlderMessages = async () => {
    if (!chatId || !oldestCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const { data, error: msgError } = await supabase
        .from('messages')
        .select('id, sender_id, text, image_url, audio_url, inquiry_id, inquiry_urgency, video_object_key, video_status, video_expires_at, created_at')
        .eq('chat_id', chatId)
        .lt('created_at', oldestCursor)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (msgError) throw msgError;
      if (data && data.length > 0) {
        const ordered = [...data].reverse();
        setMessages(prev => [...ordered, ...prev]);
        setOldestCursor(ordered[0].created_at);
        setHasOlderMessages(data.length === PAGE_SIZE);
      } else {
        setHasOlderMessages(false);
      }
    } catch (err) {
      console.error('Error loading older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !imageFile && !audioBlob) || !chatId || !profile || isSending) return;

    const text = newMessage;
    const currentImageFile = imageFile;
    const currentAudioBlob = audioBlob;

    // Optimistic clear
    setNewMessage('');
    setImageFile(null);
    setImagePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setAudioBlob(null);
    setAudioUrl(null);
    setIsSending(true);

    let imageObjectKey: string | null = null;
    let audioObjectKey: string | null = null;

    try {
      // Upload image to R2 (avoids storing base64 in DB)
      if (currentImageFile) {
        const fd = new FormData();
        fd.append('file', currentImageFile);
        const res = await fetch(resolveApiUrl('/api/chat-media/upload'), { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Image upload failed.');
        const json = await res.json();
        imageObjectKey = json.objectKey as string;
      }

      // Upload audio to R2
      if (currentAudioBlob) {
        const audioFile = new File([currentAudioBlob], 'voice.webm', { type: currentAudioBlob.type || 'audio/webm' });
        const fd = new FormData();
        fd.append('file', audioFile);
        const res = await fetch(resolveApiUrl('/api/chat-media/upload'), { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Audio upload failed.');
        const json = await res.json();
        audioObjectKey = json.objectKey as string;
      }

      const { error: msgError } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: profile.uid,
        text: text || null,
        image_url: imageObjectKey,
        audio_url: audioObjectKey,
      });

      if (msgError) throw msgError;

      await supabase.from('chats').update({
        last_message: text || (imageObjectKey ? 'Sent an image' : 'Sent a voice message'),
        last_message_time: new Date().toISOString(),
      }).eq('id', chatId);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setNewMessage(text); // Restore so user can retry
    } finally {
      setIsSending(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <Trash2 className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-slate-600 mb-6 max-w-sm">{error}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 bg-primary text-primary-dark font-semibold rounded-xl hover:bg-[#7ED465] transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!profile || loading || !peer) {
    return <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="flex flex-col h-[100dvh] max-w-2xl mx-auto bg-background-light font-sans text-slate-900 border-x border-slate-100">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-4 py-4 bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 relative shrink-0">
              {peer.photoURL ? (
                <Image src={peer.photoURL} alt={peer.displayName} fill className="object-cover rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-slate-500 font-bold uppercase text-sm">{peer.displayName.substring(0, 2)}</span>
              )}
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-base leading-tight text-slate-900">{peer.displayName}</h1>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary-dark opacity-80 mt-0.5">
                {peer.focusArea || (peer.role === 'trainer' ? 'Trainer' : 'Trainee')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button className="p-2.5 hover:bg-slate-50 rounded-full transition-colors text-slate-500 hover:text-primary-dark">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2.5 hover:bg-slate-50 rounded-full transition-colors text-slate-500 hover:text-primary-dark">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
        {/* Load older messages */}
        {hasOlderMessages && (
          <div className="flex justify-center">
            <button
              onClick={loadOlderMessages}
              disabled={loadingOlder}
              className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-full shadow-sm hover:border-primary hover:text-primary-dark transition-all disabled:opacity-50"
            >
              {loadingOlder ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

        {/* Date Divider */}
        <div className="flex justify-center my-2">
          <span className="px-4 py-1.5 bg-white border border-slate-100 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest shadow-sm">
            Today
          </span>
        </div>

        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === profile.uid;
          const timeString = msg.created_at ? format(new Date(msg.created_at), 'hh:mm a') : 'Sending...';

          return (
            <div key={msg.id || idx} className={`flex items-end gap-2.5 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
              {!isMe && (
                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 overflow-hidden mb-1.5 relative shadow-sm border border-slate-100">
                  {peer.photoURL ? (
                    <Image src={peer.photoURL} alt={peer.displayName} fill className="object-cover rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-slate-500 font-bold uppercase text-xs flex items-center justify-center h-full w-full">{peer.displayName.substring(0, 2)}</span>
                  )}
                </div>
              )}
              
              <div className={`flex flex-col gap-1.5 ${isMe ? 'items-end' : ''}`}>
                <div className={`px-4 py-3 shadow-sm ${
                  isMe 
                    ? 'bg-primary text-primary-dark font-medium rounded-2xl rounded-br-sm' 
                    : 'bg-white text-slate-700 font-medium rounded-2xl rounded-bl-sm border border-slate-100'
                }`}>
                  {msg.inquiry_id && (
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-70">
                      {msg.inquiry_urgency === 'High' ? 'High urgency inquiry' : 'Trainee inquiry'}
                    </p>
                  )}
                  {msg.text && <p className="text-[15px] leading-relaxed">{msg.text}</p>}
                </div>
                
                {msg.image_url && (() => {
                  const src = mediaSrc(msg.image_url, '/api/chat-media');
                  return src ? (
                    <div className={`w-full max-w-[240px] rounded-2xl overflow-hidden shadow-sm border-2 ${isMe ? 'border-primary' : 'border-slate-100 bg-white p-1'}`}>
                      <Image src={src} alt="Attached media" width={240} height={240} loading="lazy" className="w-full h-auto rounded-xl" referrerPolicy="no-referrer" />
                    </div>
                  ) : null;
                })()}

                {msg.audio_url && (() => {
                  const src = mediaSrc(msg.audio_url, '/api/chat-media');
                  return src ? (
                    <div className={`w-full max-w-[240px] rounded-2xl shadow-sm border ${isMe ? 'bg-[#E5F5E5] border-primary/20' : 'bg-white border-slate-100'} p-2.5`}>
                      <audio src={src} controls preload="none" className="w-full h-10" />
                    </div>
                  ) : null;
                })()}

                {msg.inquiry_id && msg.video_object_key && msg.video_status !== 'expired' && (
                  <div className={`w-full max-w-[320px] rounded-2xl shadow-sm border ${isMe ? 'bg-[#E5F5E5] border-primary/20' : 'bg-white border-slate-100'} p-2.5`}>
                    <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      <Video className="h-4 w-4" />
                      <span>Inquiry video</span>
                    </div>
                    <video
                      key={msg.id}
                      controls
                      preload="none"
                      className="w-full rounded-xl bg-black"
                      src={resolveApiUrl(`/api/inquiries/${msg.inquiry_id}/video`)}
                    />
                  </div>
                )}
                
                <span className={`text-[10px] font-medium text-slate-400 mt-0.5 ${isMe ? 'mr-1' : 'ml-1'}`}>
                  {timeString} {isMe && '• Sent'}
                </span>
              </div>
            </div>
          );
        })}
        
        <div ref={messagesEndRef} className="h-2" />
      </main>

      {/* Bottom Input Bar */}
      <footer className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3 pb-safe z-10 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.02)]">
        {/* Previews */}
        {(imagePreview || audioUrl) && (
          <div className="flex flex-col gap-2 mb-1">
            {imagePreview && (
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                <Image src={imagePreview} alt="Preview" width={96} height={96} className="w-full h-full object-cover" />
                <button type="button" onClick={() => {
                  setImageFile(null);
                  setImagePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
                }} className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 backdrop-blur-sm text-white rounded-full hover:bg-black/80 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {audioUrl && (
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 shadow-sm inline-flex max-w-[260px]">
                <audio src={audioUrl} controls className="h-10 flex-1 min-w-0" />
                <button type="button" onClick={() => { setAudioUrl(null); setAudioBlob(null); }} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={sendMessage} className="flex items-end gap-2 max-w-full">
          <div className="flex gap-0.5 pb-1 shrink-0">
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleImageUpload} className="hidden" />
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
            
            <button type="button" onClick={() => cameraInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-primary-dark hover:bg-slate-50 rounded-full transition-all active:scale-95">
              <Camera className="w-6 h-6" />
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-primary-dark hover:bg-slate-50 rounded-full transition-all active:scale-95">
              <ImageIcon className="w-6 h-6" />
            </button>
            <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`p-2.5 rounded-full transition-all active:scale-95 ${isRecording ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-primary-dark hover:bg-slate-50'}`}>
              {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-6 h-6" />}
            </button>
          </div>
          
          <div className="flex-1 min-w-0 relative bg-slate-50 rounded-3xl border border-slate-100 shadow-sm flex items-center pr-1 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
            <textarea 
              className="w-full py-3.5 px-4 bg-transparent border-none text-[15px] font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none resize-none max-h-32 min-h-[50px]" 
              placeholder="Message..." 
              rows={1}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            <button 
              type="submit"
              disabled={(!newMessage.trim() && !imageFile && !audioBlob)}
              className="p-2.5 bg-primary text-primary-dark rounded-full hover:bg-[#7ED465] transition-all active:scale-90 shadow-sm disabled:opacity-50 disabled:active:scale-100 shrink-0 ml-1.5 mb-1"
            >
              <Send className="w-5 h-5 -ml-0.5" />
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}

export default function ChatInterface() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
      <ChatContent />
    </Suspense>
  );
}
