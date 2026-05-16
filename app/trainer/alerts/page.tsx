'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { Bell, CheckCircle2, Loader2, Mic, Send, Square, Trash2, Video } from 'lucide-react';
import { TrainerBottomNav } from '@/components/TrainerBottomNav';
import { useAuthStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';

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

export default function AlertsPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
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
    if (!profile) {
      return;
    }

    if (profile.role !== 'trainer') {
      router.push('/trainee');
      return;
    }

    if (profile.uid.startsWith('mock-')) {
      setInquiries([
        {
          id: 'mock-inquiry-1',
          trainee_id: 'mock-trainee-123',
          trainer_id: profile.uid,
          trainee_name: 'Samuel Adebayor',
          message: 'The chicks look weak today. I have attached a short clip.',
          urgency: 'High',
          status: 'pending',
          image: null,
          audio_url: null,
          response: null,
          response_audio_url: null,
          created_at: new Date().toISOString(),
          responded_at: null,
          video_object_key: null,
          video_status: null,
          video_expires_at: null,
        },
      ]);
      setSelectedInquiryId('mock-inquiry-1');
      setLoading(false);
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
        {
          event: '*',
          schema: 'public',
          table: 'inquiries',
          filter: `trainer_id=eq.${profile.uid}`,
        },
        () => {
          fetchInquiries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, router]);

  const selectedInquiry = useMemo(
    () => inquiries.find((inquiry) => inquiry.id === selectedInquiryId) ?? null,
    [inquiries, selectedInquiryId]
  );

  useEffect(() => {
    setResponseText(selectedInquiry?.response || '');
    setResponseAudioBlob(null);
    setResponseAudioUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
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
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setResponseAudioBlob(blob);
        setResponseAudioUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
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
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  };

  const handleSubmitResponse = async () => {
    if (!selectedInquiry || !profile) {
      return;
    }

    if (!responseText.trim() && !responseAudioBlob) {
      return;
    }

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

      if (profile?.uid.startsWith('mock-')) {
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
      } else {
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

        if (error) {
          throw new Error(error.message || 'Could not send response.');
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
      }

      clearResponseAudio();
    } catch (error) {
      console.error('Could not send response', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background-light">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background-light font-sans text-slate-900 pb-24">
      <header className="px-6 pt-12 pb-6 bg-white border-b border-slate-100 mb-6 sticky top-0 z-10">
        <h1 className="text-2xl font-bold tracking-tight">Inquiry Alerts</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Review trainee issues, media, and respond.</p>
      </header>

      <main className="px-6 flex-1 flex flex-col gap-6">
        {inquiries.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <div className="size-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200">
              <Bell className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No inquiries yet</h3>
            <p className="text-sm text-slate-500 max-w-[240px] leading-relaxed">
              Trainee questions will appear here when they need your help.
            </p>
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              {inquiries.map((inquiry) => (
                <button
                  key={inquiry.id}
                  type="button"
                  onClick={() => setSelectedInquiryId(inquiry.id)}
                  className={`rounded-3xl border p-4 text-left shadow-sm transition-colors ${
                    selectedInquiryId === inquiry.id
                      ? 'border-primary bg-[#F6FFF2]'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{inquiry.trainee_name}</p>
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2">{inquiry.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${inquiry.urgency === 'High' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                        {inquiry.urgency}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${inquiry.status === 'responded' ? 'bg-[#E5F5E5] text-primary-dark' : 'bg-[#FFF4E5] text-[#B76E00]'}`}>
                        {inquiry.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </section>

            {selectedInquiry && (
              <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedInquiry.trainee_name}</h2>
                    <p className="text-sm font-medium text-slate-500">
                      {format(new Date(selectedInquiry.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {selectedInquiry.status === 'responded' && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#E5F5E5] px-3 py-1 text-xs font-bold text-primary-dark">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Responded</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-400">Inquiry</p>
                  <p className="mt-2 text-base leading-relaxed text-slate-800">{selectedInquiry.message}</p>
                </div>

                {(selectedInquiry.image || selectedInquiry.audio_url || selectedInquiry.video_object_key) && (
                  <div className="mt-5 flex flex-col gap-4">
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-400">Attachments</p>

                    {selectedInquiry.image && (
                      <div className="overflow-hidden rounded-3xl border border-slate-100">
                        <Image src={selectedInquiry.image} alt="Inquiry attachment" width={640} height={640} className="h-auto w-full object-cover" />
                      </div>
                    )}

                    {selectedInquiry.audio_url && (
                      <div className="rounded-3xl border border-slate-100 bg-slate-50 p-3">
                        <audio src={selectedInquiry.audio_url} controls className="w-full" />
                      </div>
                    )}

                    {selectedInquiry.video_object_key && selectedInquiry.video_status !== 'expired' && (
                      <div className="rounded-3xl border border-slate-100 bg-slate-50 p-3">
                        <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          <Video className="h-4 w-4" />
                          <span>Video attachment</span>
                        </div>
                        <video
                          key={selectedInquiry.id}
                          controls
                          className="w-full rounded-2xl bg-black"
                          src={`/api/inquiries/${selectedInquiry.id}/video`}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-400">Your response</label>
                  <textarea
                    value={responseText}
                    onChange={(event) => setResponseText(event.target.value)}
                    placeholder="Type your response to the trainee..."
                    className="min-h-[140px] rounded-3xl border-2 border-slate-100 bg-white p-4 font-medium text-slate-900 outline-none focus:border-primary"
                  />

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition-colors ${isRecording ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
                      <span>{isRecording ? 'Stop audio' : 'Record audio reply'}</span>
                    </button>

                    {responseAudioUrl && (
                      <button
                        type="button"
                        onClick={clearResponseAudio}
                        className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Remove audio</span>
                      </button>
                    )}
                  </div>

                  {responseAudioUrl && (
                    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-3">
                      <audio src={responseAudioUrl} controls className="w-full" />
                    </div>
                  )}

                  {selectedInquiry.response_audio_url && !responseAudioUrl && (
                    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Current audio reply</p>
                      <audio src={selectedInquiry.response_audio_url} controls className="w-full" />
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={saving || (!responseText.trim() && !responseAudioBlob)}
                    onClick={handleSubmitResponse}
                    className="mt-2 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-5 text-base font-bold text-primary-dark transition-colors hover:bg-[#7ED465] disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    <span>{saving ? 'Sending...' : 'Send response'}</span>
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <TrainerBottomNav />
    </div>
  );
}
