'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useAuthStore, UserProfile } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Phone, MoreVertical, Image as ImageIcon, Send, Camera, Mic, Square, Trash2, Video } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  text?: string;
  image_url?: string;
  audio_url?: string;
  inquiry_id?: string | null;
  inquiry_urgency?: string | null;
  video_object_key?: string | null;
  video_status?: string | null;
  video_expires_at?: string | null;
  created_at: string;
}

const MOCK_MESSAGES = [
  { id: 'm1', sender_id: 'mock-trainer-123', text: 'Hi there! How are the new chicks settling into the brooder today? Any temperature issues?', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: 'm2', sender_id: 'peer-id', text: 'They seem a bit huddled in one corner. I took a photo of the current setup. Is the lamp too high?', image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDr7RgmbVjL_no83E1WcetcxGTGCoYYLQxDQ8i_XH4QRvEylF1iI6UhfpXtXed8lihxuRbN4cihbfsehvbNHQB8_ybRZ2bk8cSySAPUt87yP5NcT0Cya9p9_lnF-dhCbaC9bbRGGEP01IlvkGhCzfHttXrsDkCodgNNxtfMvK4Zr-nwmHORCipwyjE8vg2Z9015J1oQrvZ0DwiF4XElUdh2Za3w60uw5-k0JercVM0jfnXAc3tOQQYd6_ou-DTVRsEcZgPPIcZVplo', created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
  { id: 'm3', sender_id: 'mock-trainer-123', text: 'If they are huddling directly under the lamp, they\'re cold. If they are huddling in a corner away from it, there might be a draft. Let\'s try lowering the lamp by 2 inches first.', created_at: new Date(Date.now() - 1000 * 60 * 1).toISOString() },
];

function ChatContent() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const peerId = searchParams.get('peerId') as string;
  const supabase = createClient();
  
  const [peer, setPeer] = useState<UserProfile | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [image, setImage] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fetch peer profile
  useEffect(() => {
    if (!peerId) return;
    if (profile?.uid.startsWith('mock-')) {
      setTimeout(() => {
        setPeer({
          uid: peerId,
          displayName: 'Trainee User',
          role: 'trainee',
          email: 'mock@mock.com',
          createdAt: new Date(),
          photoURL: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrKkDmaDcMTNxR572A-aFLLk__o0XOovMJ1VJs8MIHhW95wXrQ-GGKnG36IBMZjvZ8pMLQ3YVgTkkqWlKhutFloCO_K_bRIlpamgPilNJ8pcxto2lJuqJXZuHowLXPULwuVqF2HPbGcVOn8OV90tAfCYCyvRjmGpz2W4ZomGhfKm1IidUHlC5MIO8Pa3ZpU0pEWCOF-TM1zSE7zrhQ1iPkdy1Oa-8GpDfPoZxsA7jRJaHvPpRaYjGbVldG_-JSBlRDPQlUC7xVw7c'
        });
      }, 0);
      return;
    }

    const fetchPeer = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', peerId)
        .single();
      
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
      }
    };
    fetchPeer();
  }, [peerId, profile?.uid, supabase]);

  // Find or create chat
  useEffect(() => {
    if (!profile || !peerId) return;

    if (profile.uid.startsWith('mock-')) {
      setTimeout(() => {
        setChatId('mock-chat-123');
      }, 0);
      return;
    }

    const findOrCreateChat = async () => {
      // Find existing chat between two users
      const { data: myChats } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', profile.uid);

      if (myChats && myChats.length > 0) {
        const chatIds = myChats.map(c => c.chat_id);
        const { data: existingChat } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', peerId)
          .in('chat_id', chatIds)
          .maybeSingle();

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

      if (!chatError && newChat) {
        await supabase.from('chat_participants').insert([
          { chat_id: newChat.id, user_id: profile.uid },
          { chat_id: newChat.id, user_id: peerId }
        ]);
        setChatId(newChat.id);
      } else if (chatError) {
        console.error('Could not create chat:', chatError);
      }
    };

    findOrCreateChat();
  }, [profile, peerId, supabase]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Listen to messages
  useEffect(() => {
    if (!chatId) return;

    if (profile?.uid.startsWith('mock-')) {
      setTimeout(() => {
        setMessages(MOCK_MESSAGES.map(m => m.sender_id === 'peer-id' ? { ...m, sender_id: peerId } : m) as Message[]);
        setLoading(false);
        scrollToBottom();
      }, 0);
      return;
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      
      if (data) {
        setMessages(data);
        setLoading(false);
        scrollToBottom();
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
  }, [chatId, peerId, profile?.uid, supabase]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !image && !audioBlob) || !chatId || !profile) return;

    const text = newMessage;
    setNewMessage(''); // Optimistic clear
    const currentImage = image;
    const currentAudioBlob = audioBlob;
    
    setImage(null);
    setAudioBlob(null);
    setAudioUrl(null);

    let audioBase64 = null;
    if (currentAudioBlob) {
      const reader = new FileReader();
      reader.readAsDataURL(currentAudioBlob);
      audioBase64 = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
      });
    }

    if (profile.uid.startsWith('mock-')) {
      const newMsg: Message = {
        id: Math.random().toString(),
        sender_id: profile.uid,
        text: text,
        image_url: currentImage || undefined,
        audio_url: (audioBase64 as string) || undefined,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, newMsg]);
      scrollToBottom();
      return;
    }

    await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: profile.uid,
      text: text,
      image_url: currentImage || null,
      audio_url: (audioBase64 as string) || null,
    });

    // Update last message in chat
    await supabase.from('chats').update({
      last_message: text || (currentImage ? 'Sent an image' : 'Sent a voice message'),
      last_message_time: new Date().toISOString(),
    }).eq('id', chatId);
  };

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
                
                {msg.image_url && (
                  <div className={`w-full max-w-[240px] rounded-2xl overflow-hidden shadow-sm border-2 ${isMe ? 'border-primary' : 'border-slate-100 bg-white p-1'}`}>
                    <Image src={msg.image_url} alt="Attached media" width={240} height={240} className="w-full h-auto rounded-xl" referrerPolicy="no-referrer" />
                  </div>
                )}

                {msg.audio_url && (
                  <div className={`w-full max-w-[240px] rounded-2xl shadow-sm border ${isMe ? 'bg-[#E5F5E5] border-primary/20' : 'bg-white border-slate-100'} p-2.5`}>
                    <audio src={msg.audio_url} controls className="w-full h-10" />
                  </div>
                )}

                {msg.inquiry_id && msg.video_object_key && msg.video_status !== 'expired' && (
                  <div className={`w-full max-w-[320px] rounded-2xl shadow-sm border ${isMe ? 'bg-[#E5F5E5] border-primary/20' : 'bg-white border-slate-100'} p-2.5`}>
                    <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      <Video className="h-4 w-4" />
                      <span>Inquiry video</span>
                    </div>
                    <video
                      key={msg.id}
                      controls
                      className="w-full rounded-xl bg-black"
                      src={`/api/inquiries/${msg.inquiry_id}/video`}
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
        {(image || audioUrl) && (
          <div className="flex flex-col gap-2 mb-1">
            {image && (
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                <Image src={image} alt="Preview" width={96} height={96} className="w-full h-full object-cover" />
                <button type="button" onClick={() => setImage(null)} className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 backdrop-blur-sm text-white rounded-full hover:bg-black/80 transition-colors">
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
              disabled={(!newMessage.trim() && !image && !audioBlob)}
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
