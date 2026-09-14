'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useAuthStore, UserProfile } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Phone, MoreVertical, Image as ImageIcon, Send, Camera, Mic, Square, Trash2, Video, TriangleAlert } from 'lucide-react';
import { format } from 'date-fns';
import { resolveApiUrl } from '@/lib/api-helper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

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

function MessageSkeletons() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading messages">
      <div className="flex items-end gap-2">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-12 w-48 rounded-xl rounded-bl-sm" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="flex items-end justify-end gap-2">
        <div className="flex flex-col items-end gap-1.5">
          <Skeleton className="h-12 w-56 rounded-xl rounded-br-sm" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-16 w-40 rounded-xl rounded-bl-sm" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
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
            role: data.role as 'trainer' | 'trainee' | 'admin',
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
          // A pair of users may legitimately share multiple chat rows (older
          // sessions created one chat per visit). The docs for maybeSingle()
          // require the result to be zero-or-one row, so limit(1) keeps this
          // from throwing "multiple rows returned" on the existing duplicate
          // chats. We reuse the first match instead of creating yet another.
          const { data: existingChat, error: existingChatError } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', peerId)
            .in('chat_id', chatIds)
            .order('chat_id')
            .limit(1)
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
      <div className="flex min-h-svh flex-col bg-background font-sans">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center p-6">
          <Empty>
            <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="size-7" />
            </span>
            <EmptyTitle>Something went wrong</EmptyTitle>
            <EmptyDescription>{error}</EmptyDescription>
            <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-2">
              <ArrowLeft className="size-4" />
              Go Back
            </Button>
          </Empty>
        </div>
      </div>
    );
  }

  // Shell-first: header renders instantly with shimmer fallback for the peer,
  // message list shows skeleton bubbles until the first page arrives.
  const peerInitials = (peer?.displayName || '??').substring(0, 2).toUpperCase();

  return (
    <div className="mx-auto flex h-svh w-full max-w-2xl flex-col border-x border-border bg-background font-sans text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Go back" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          {loading || !peer ? (
            <div className="flex items-center gap-3" role="status" aria-label="Loading conversation">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-10">
                {peer.photoURL ? (
                  <AvatarImage src={peer.photoURL} alt={peer.displayName} />
                ) : (
                  <AvatarFallback>{peerInitials}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <h1 className="truncate font-heading text-[15px] font-bold leading-tight">{peer.displayName}</h1>
                <Badge variant="secondary" size="sm" className="mt-0.5 self-start uppercase">
                  {peer.focusArea || (peer.role === 'trainer' ? 'Trainer' : 'Trainee')}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center">
          <Button variant="ghost" size="icon-sm" aria-label="Call">
            <Phone className="size-5" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="More options">
            <MoreVertical className="size-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-muted/40 p-4" aria-busy={loading} aria-label="Messages">
        {loading ? (
          <MessageSkeletons />
        ) : (
          <div className="flex flex-col gap-4">
            {hasOlderMessages && (
              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={loadOlderMessages} loading={loadingOlder}>
                  Load older messages
                </Button>
              </div>
            )}

            <div className="flex justify-center">
              <Badge variant="secondary" size="sm" className="uppercase tracking-widest">
                Today
              </Badge>
            </div>

            {messages.map((msg, idx) => {
              const isMe = profile ? msg.sender_id === profile.uid : false;
              const timeString = msg.created_at ? format(new Date(msg.created_at), 'hh:mm a') : 'Sending...';

              return (
                <div key={msg.id || idx} className={cn('flex max-w-[85%] items-end gap-2', isMe && 'ml-auto flex-row-reverse')}>
                  {!isMe && (
                    <Avatar className="size-8 shrink-0">
                      {peer?.photoURL ? (
                        <AvatarImage src={peer.photoURL} alt={peer.displayName} />
                      ) : (
                        <AvatarFallback className="text-[10px]">{peerInitials}</AvatarFallback>
                      )}
                    </Avatar>
                  )}

                  <div className={cn('flex min-w-0 flex-col gap-1.5', isMe && 'items-end')}>
                    {(msg.text || msg.inquiry_id) && (
                      <div
                        className={cn(
                          'px-3.5 py-2.5 text-[15px] leading-relaxed shadow-[0_1px_0_0_var(--border)]',
                          isMe
                            ? 'rounded-xl rounded-br-sm bg-primary font-medium text-primary-foreground'
                            : 'rounded-xl rounded-bl-sm border border-border bg-card font-medium text-card-foreground'
                        )}
                      >
                        {msg.inquiry_id && (
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest opacity-70">
                            {msg.inquiry_urgency === 'High' ? 'High urgency inquiry' : 'Farmer inquiry'}
                          </p>
                        )}
                        {msg.text && <p>{msg.text}</p>}
                      </div>
                    )}

                    {msg.image_url && (() => {
                      const src = mediaSrc(msg.image_url, '/api/chat-media');
                      return src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt="Attached media"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className={cn(
                            'h-auto w-full max-w-[240px] rounded-xl border object-cover shadow-[0_1px_0_0_var(--border)]',
                            isMe ? 'border-primary/30' : 'border-border'
                          )}
                        />
                      ) : null;
                    })()}

                    {msg.audio_url && (() => {
                      const src = mediaSrc(msg.audio_url, '/api/chat-media');
                      return src ? (
                        <div
                          className={cn(
                            'w-full max-w-[240px] rounded-xl border p-2 shadow-[0_1px_0_0_var(--border)]',
                            isMe ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
                          )}
                        >
                          <audio src={src} controls preload="none" className="h-10 w-full" />
                        </div>
                      ) : null;
                    })()}

                    {msg.inquiry_id && msg.video_object_key && msg.video_status !== 'expired' && (
                      <div className="w-full max-w-[320px] rounded-xl border border-border bg-card p-2.5 shadow-[0_1px_0_0_var(--border)]">
                        <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          <Video className="size-4" />
                          Inquiry video
                        </p>
                        <video
                          key={msg.id}
                          controls
                          preload="none"
                          className="w-full rounded-lg bg-black"
                          src={resolveApiUrl(`/api/inquiries/${msg.inquiry_id}/video`)}
                        />
                      </div>
                    )}

                    <span className="text-[11px] font-medium text-muted-foreground">
                      {timeString} {isMe && '• Sent'}
                    </span>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} className="h-1" />
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-card p-3 pb-safe">
        {(imagePreview || audioUrl) && (
          <div className="mb-2 flex flex-col gap-2">
            {imagePreview && (
              <div className="relative w-24 overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="size-24 object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-xs"
                  aria-label="Remove image"
                  className="absolute right-1.5 top-1.5"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            )}
            {audioUrl && (
              <div className="flex max-w-[280px] items-center gap-2 rounded-xl border border-border bg-muted p-2">
                <audio src={audioUrl} controls className="h-10 min-w-0 flex-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove audio"
                  className="shrink-0 text-destructive"
                  onClick={() => { setAudioUrl(null); setAudioBlob(null); }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={sendMessage} className="flex items-end gap-1.5">
          <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleImageUpload} className="hidden" />
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />

          <Button type="button" variant="ghost" size="icon" aria-label="Take photo" onClick={() => cameraInputRef.current?.click()}>
            <Camera className="size-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Attach image" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon className="size-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={isRecording ? 'Stop recording' : 'Record voice message'}
            aria-pressed={isRecording}
            className={isRecording ? 'text-destructive' : undefined}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? <Square className="size-5 fill-current" /> : <Mic className="size-5" />}
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-input bg-background py-1 pl-3 pr-1 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
            <label htmlFor="chat-input" className="sr-only">Message</label>
            <textarea
              id="chat-input"
              aria-label="Message..."
              className="max-h-28 min-h-[38px] w-full resize-none bg-transparent py-2 text-[15px] font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
              placeholder="Message..."
              rows={1}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px';
              }}
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              loading={isSending}
              disabled={isSending || (!newMessage.trim() && !imageFile && !audioBlob)}
              className="shrink-0 rounded-lg"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </form>
      </footer>
    </div>
  );
}

export default function ChatInterface() {
  return (
    <div className="min-h-svh bg-background">
      <Suspense
        fallback={
          <div className="mx-auto flex h-svh w-full max-w-2xl flex-col border-x border-border bg-background">
            <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3" role="status" aria-label="Loading conversation">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="flex-1 p-4">
              <MessageSkeletons />
            </div>
            <div className="flex items-center justify-center border-t border-border bg-card p-4">
              <Spinner className="size-5 text-muted-foreground" />
            </div>
          </div>
        }
      >
        <ChatContent />
      </Suspense>
    </div>
  );
}
