'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { Bell, Mic, Square, Trash2, Video } from 'lucide-react';
import { TrainerBottomNav } from '@/components/TrainerBottomNav';
import { useAuthStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { resolveApiUrl } from '@/lib/api-helper';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface InquiryRecord {
  id: string;
  trainee_id: string;
  trainer_id: string | null;
  trainee_name: string;
  message: string;
  urgency: 'Normal' | 'High';
  status: 'pending' | 'responded';
  image: string | null;
  audio_url: string | null;
  response: string | null;
  response_audio_url: string | null;
  created_at: string;
  responded_at: string | null;
  video_object_key: string | null;
  video_status: string | null;
  video_expires_at: string | null;
}

async function findOrCreateChat(supabase: ReturnType<typeof createClient>, userId: string, peerId: string) {
  const { data: myChats, error: myChatsError } = await supabase
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', userId);
  if (myChatsError) throw new Error(myChatsError.message);
  const chatIds = myChats?.map((chat) => chat.chat_id) ?? [];
  if (chatIds.length > 0) {
    const { data: existingChat, error: existingChatError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', peerId)
      .in('chat_id', chatIds)
      .maybeSingle();
    if (existingChatError) throw new Error(existingChatError.message);
    if (existingChat) return existingChat.chat_id as string;
  }
  const { data: newChat, error: chatError } = await supabase.from('chats').insert({}).select('id').single();
  if (chatError || !newChat) throw new Error(chatError?.message || 'Could not create trainer chat.');
  const { error: participantsError } = await supabase.from('chat_participants').insert([
    { chat_id: newChat.id, user_id: userId },
    { chat_id: newChat.id, user_id: peerId },
  ]);
  if (participantsError) throw new Error(participantsError.message);
  return newChat.id as string;
}

export default function AlertsPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseAudioBlob, setResponseAudioBlob] = useState<Blob | null>(null);
  const [responseAudioUrl, setResponseAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      setLoading(false);
      return;
    }
    if (profile.role !== 'trainer') {
      router.push('/trainee');
      return;
    }

    const fetchInquiries = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('trainer_id', profile.uid)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Could not load inquiries', error);
        setLoading(false);
        return;
      }
      if (data) {
        setInquiries(data as InquiryRecord[]);
        setSelectedInquiryId((current) => current ?? data[0]?.id ?? null);
      }
      setLoading(false);
    };

    const supabase = createClient();
    fetchInquiries();
    const channel = supabase
      .channel(`trainer_inquiries:${profile.uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inquiries', filter: `trainer_id=eq.${profile.uid}` },
        () => fetchInquiries()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, authLoading, router]);

  const selectedInquiry = useMemo(
    () => inquiries.find((inquiry) => inquiry.id === selectedInquiryId) ?? null,
    [inquiries, selectedInquiryId]
  );

  useEffect(() => {
    setResponseText(selectedInquiry?.response || '');
    setResponseAudioBlob(null);
    setResponseAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, [selectedInquiryId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setResponseAudioBlob(blob);
        setResponseAudioUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return url;
        });
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Could not access microphone', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const clearResponseAudio = () => {
    setResponseAudioBlob(null);
    setResponseAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const handleSubmitResponse = async () => {
    if (!selectedInquiry || !profile) return;
    if (!responseText.trim() && !responseAudioBlob) return;
    try {
      setSaving(true);
      let responseAudioBase64 = selectedInquiry.response_audio_url;
      if (responseAudioBlob) {
        responseAudioBase64 = (await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(responseAudioBlob);
        })) as string;
      }
      const supabase = createClient();
      const { error } = await supabase
        .from('inquiries')
        .update({
          response: responseText.trim(),
          response_audio_url: responseAudioBase64 || null,
          status: 'responded',
          responded_at: new Date().toISOString(),
        })
        .eq('id', selectedInquiry.id)
        .eq('trainer_id', profile.uid);
      if (error) throw new Error(error.message || 'Could not send response.');

      try {
        const chatId = await findOrCreateChat(supabase, selectedInquiry.trainee_id, profile.uid);
        const responseMsgText = responseText.trim() || 'Sent an audio reply';
        await supabase.from('messages').insert({
          chat_id: chatId,
          sender_id: profile.uid,
          text: responseMsgText,
          audio_url: responseAudioBase64 || null,
          inquiry_id: selectedInquiry.id,
        });
        await supabase
          .from('chats')
          .update({ last_message: responseMsgText, last_message_time: new Date().toISOString() })
          .eq('id', chatId);
      } catch (chatErr) {
        console.error('Error auto-sending inquiry response message to chat:', chatErr);
      }

      setInquiries((current) =>
        current.map((inquiry) =>
          inquiry.id === selectedInquiry.id
            ? {
                ...inquiry,
                status: 'responded',
                response: responseText.trim() || inquiry.response,
                response_audio_url: responseAudioBase64 || null,
                responded_at: new Date().toISOString(),
              }
            : inquiry
        )
      );
      clearResponseAudio();
    } catch (error) {
      console.error('Could not send response', error);
    } finally {
      setSaving(false);
    }
  };

  // Shell-first: header + nav render instantly, inquiry list shimmers while loading.
  return (
    <div className="flex min-h-svh w-full flex-col bg-background font-sans text-foreground pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-6 pb-6 pt-10">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Inquiry Alerts</h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">Review trainee issues, media, and respond.</p>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 pt-6" aria-busy={loading}>
        {loading ? (
          <div className="flex flex-col gap-2" role="status" aria-label="Loading inquiries">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-1.5 h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : inquiries.length === 0 ? (
          <Empty>
            <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Bell className="size-7" />
            </span>
            <EmptyTitle>No inquiries yet</EmptyTitle>
            <EmptyDescription>Trainee questions will appear here when they need your help.</EmptyDescription>
          </Empty>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {inquiries.map((inquiry) => (
                <li key={inquiry.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedInquiryId(inquiry.id)}
                    aria-pressed={selectedInquiryId === inquiry.id}
                    className={cn(
                      'w-full rounded-xl border p-4 text-left shadow-[0_1px_0_0_var(--border)] transition-colors',
                      selectedInquiryId === inquiry.id
                        ? 'border-ring bg-primary/5'
                        : 'border-border bg-card hover:bg-accent/50'
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block font-semibold">{inquiry.trainee_name}</span>
                        <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{inquiry.message}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1.5">
                        <Badge variant={inquiry.urgency === 'High' ? 'destructive' : 'secondary'} size="sm">
                          {inquiry.urgency}
                        </Badge>
                        <Badge variant={inquiry.status === 'responded' ? 'success' : 'warning'} size="sm">
                          {inquiry.status}
                        </Badge>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {selectedInquiry && (
              <Card>
                <CardPanel className="flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-heading text-lg font-bold">{selectedInquiry.trainee_name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedInquiry.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    {selectedInquiry.status === 'responded' && <Badge variant="success">Responded</Badge>}
                  </div>

                  <div className="rounded-xl bg-muted p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Inquiry</p>
                    <p className="mt-1.5 text-[15px] leading-relaxed">{selectedInquiry.message}</p>
                  </div>

                  {(selectedInquiry.image || selectedInquiry.audio_url || selectedInquiry.video_object_key) && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Attachments</p>
                      {selectedInquiry.image && (
                        <span className="block overflow-hidden rounded-xl border border-border">
                          <Image
                            src={selectedInquiry.image}
                            alt="Inquiry attachment"
                            width={640}
                            height={640}
                            loading="lazy"
                            className="h-auto w-full object-cover"
                          />
                        </span>
                      )}
                      {selectedInquiry.audio_url && (
                        <div className="rounded-xl border border-border bg-muted p-3">
                          <audio src={selectedInquiry.audio_url} controls preload="none" className="w-full" />
                        </div>
                      )}
                      {selectedInquiry.video_object_key && selectedInquiry.video_status !== 'expired' && (
                        <div className="rounded-xl border border-border bg-muted p-3">
                          <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            <Video className="size-4" />
                            Video attachment
                          </p>
                          <video
                            key={selectedInquiry.id}
                            controls
                            preload="none"
                            className="w-full rounded-lg bg-black"
                            src={resolveApiUrl(`/api/inquiries/${selectedInquiry.id}/video`)}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <label htmlFor="trainer-response" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Your response
                    </label>
                    <Textarea
                      id="trainer-response"
                      value={responseText}
                      onChange={(event) => setResponseText(event.target.value)}
                      placeholder="Type your response to the trainee..."
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant={isRecording ? 'destructive' : 'secondary'}
                        size="sm"
                        onClick={isRecording ? stopRecording : startRecording}
                      >
                        {isRecording ? <Square className="size-4 fill-current" /> : <Mic className="size-4" />}
                        {isRecording ? 'Stop audio' : 'Record audio reply'}
                      </Button>
                      {responseAudioUrl && (
                        <Button type="button" variant="destructive-outline" size="sm" onClick={clearResponseAudio}>
                          <Trash2 className="size-4" />
                          Remove audio
                        </Button>
                      )}
                    </div>
                    {responseAudioUrl && (
                      <div className="rounded-xl border border-border bg-muted p-3">
                        <audio src={responseAudioUrl} controls className="w-full" />
                      </div>
                    )}
                    {selectedInquiry.response_audio_url && !responseAudioUrl && (
                      <div className="rounded-xl border border-border bg-muted p-3">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Current audio reply
                        </p>
                        <audio src={selectedInquiry.response_audio_url} controls className="w-full" />
                      </div>
                    )}
                    <Button
                      type="button"
                      size="lg"
                      loading={saving}
                      disabled={!responseText.trim() && !responseAudioBlob}
                      onClick={handleSubmitResponse}
                    >
                      {saving ? 'Sending...' : 'Send response'}
                    </Button>
                  </div>
                </CardPanel>
              </Card>
            )}
          </>
        )}
      </main>

      <TrainerBottomNav />
    </div>
  );
}
