'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore, useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { TraineeBottomNav } from '@/components/TraineeBottomNav';
import { processVideoForUpload } from '@/lib/media/video';
import { LogOut, Send, CheckCircle2, Globe, Camera, Image as ImageIcon, Mic, Square, Trash2, Video, AlertTriangle, Clock } from 'lucide-react';
import { resolveApiUrl } from '@/lib/api-helper';
import { differenceInDays, format } from 'date-fns';

const CATEGORIES = ['Marketing', 'Health', 'Housing', 'Feeding', 'General'];

const TRANSLATIONS: any = {
  en: {
    askExpert: "Ask Expert",
    howCanWeHelp: "How can we help?",
    subtitle: "Submit a question or report an issue to your trainer.",
    topic: "Topic",
    urgency: "Urgency",
    message: "Message",
    attachments: "Attachments (Optional)",
    placeholder: "Describe your question or issue in detail...",
    send: "Send to Trainer",
    success: "Sent Successfully!",
    successSub: "Your trainer has been notified and will respond shortly.",
    normal: "Normal",
    high: "High",
    home: "Home",
    profile: "Profile",
    trainerMessage: "Message from Trainer",
    noMessages: "No messages from trainer yet.",
    camera: "Camera",
    gallery: "Gallery",
    voice: "Voice",
    stop: "Stop",
    categories: {
      'Marketing': 'Marketing',
      'Health': 'Health',
      'Housing': 'Housing',
      'Feeding': 'Feeding',
      'General': 'General'
    }
  },
  am: {
    askExpert: "ባለሙያ ይጠይቁ",
    howCanWeHelp: "እንዴት ልንረዳዎ እንችላለን?",
    subtitle: "ጥያቄዎን ወይም ችግርዎን ለአሰልጣኝዎ ያቅርቡ።",
    topic: "ርዕስ",
    urgency: "አስቸኳይነት",
    message: "መልእክት",
    attachments: "አባሪዎች (አማራጭ)",
    placeholder: "ጥያቄዎን ወይም ችግርዎን በዝርዝር ያብራሩ...",
    send: "ለአሰልጣኝ ላክ",
    success: "በተሳካ ሁኔታ ተልኳል!",
    successSub: "አሰልጣኝዎ መልእክቱን አግኝተዋል እና በቅርቡ ምላሽ ይሰጣሉ።",
    normal: "መደበኛ",
    high: "ከፍተኛ",
    home: "ዋና ገጽ",
    profile: "መገለጫ",
    trainerMessage: "ከአሰልጣኝ የመጣ መልእክት",
    noMessages: "እስካሁን ከአሰልጣኝ ምንም መልእክት የለም።",
    camera: "ካሜራ",
    gallery: "ጋለሪ",
    voice: "ድምጽ",
    stop: "አቁም",
    categories: {
      'Marketing': 'ግብይት',
      'Health': 'ጤና',
      'Housing': 'ማከማቻ/ማደሪያ',
      'Feeding': 'አመጋገብ',
      'General': 'አጠቃላይ'
    }
  }
};



async function findOrCreateChat(supabase: ReturnType<typeof createClient>, userId: string, peerId: string) {
  const { data: myChats, error: myChatsError } = await supabase
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', userId);

  if (myChatsError) {
    throw new Error(myChatsError.message);
  }

  const chatIds = myChats?.map((chat) => chat.chat_id) ?? [];

  if (chatIds.length > 0) {
    const { data: existingChat, error: existingChatError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', peerId)
      .in('chat_id', chatIds)
      .maybeSingle();

    if (existingChatError) {
      throw new Error(existingChatError.message);
    }

    if (existingChat) {
      return existingChat.chat_id as string;
    }
  }

  const { data: newChat, error: chatError } = await supabase
    .from('chats')
    .insert({})
    .select('id')
    .single();

  if (chatError || !newChat) {
    throw new Error(chatError?.message || 'Could not create trainer chat.');
  }

  const { error: participantsError } = await supabase.from('chat_participants').insert([
    { chat_id: newChat.id, user_id: userId },
    { chat_id: newChat.id, user_id: peerId },
  ]);

  if (participantsError) {
    throw new Error(participantsError.message);
  }

  return newChat.id as string;
}

export default function TraineeDashboard() {
  const { profile, loading: authLoading } = useAuthStore();
  const { isAmharic, setIsAmharic } = useAppStore();
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [loading, setLoading] = useState(true);
  const lang = isAmharic ? 'am' : 'en';
  
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState('Normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [image, setImage] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDetails, setVideoDetails] = useState<{ durationSeconds: number; width: number; height: number } | null>(null);
  const [videoStatus, setVideoStatus] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [latestResponse, setLatestResponse] = useState<{
    type?: 'inquiry_response' | 'chat_message';
    message: string;
    response: string | null;
    created_at?: string;
    responded_at?: any;
    audio_url?: string;
    image?: string;
    response_audio_url?: string | null;
  } | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (!profile || profile.role !== 'trainee') return;

    const fetchTrainerMessage = async () => {
      const { data: inquiries } = await supabase
        .from('inquiries')
        .select('message, response, response_audio_url, responded_at')
        .eq('trainee_id', profile.uid)
        .not('responded_at', 'is', null)
        .order('responded_at', { ascending: false })
        .limit(1);

      const latestInquiry = inquiries?.[0]
        ? {
            type: 'inquiry_response' as const,
            message: inquiries[0].message,
            response: inquiries[0].response,
            response_audio_url: inquiries[0].response_audio_url,
            created_at: inquiries[0].responded_at,
          }
        : null;

      let latestChatMessage:
        | {
            type: 'chat_message';
            message: string;
            response: string | null;
            response_audio_url: null;
            created_at: string;
          }
        | null = null;

      if (profile.assignedTrainerId) {
        const { data: myChats } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', profile.uid);

        const chatIds = myChats?.map((row) => row.chat_id) ?? [];

        if (chatIds.length > 0) {
          const { data: trainerChats } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', profile.assignedTrainerId)
            .in('chat_id', chatIds);

          const sharedChatIds = trainerChats?.map((row) => row.chat_id) ?? [];

          if (sharedChatIds.length > 0) {
            const { data: messages } = await supabase
              .from('messages')
              .select('text, image_url, audio_url, created_at')
              .in('chat_id', sharedChatIds)
              .eq('sender_id', profile.assignedTrainerId)
              .order('created_at', { ascending: false })
              .limit(1);

            const message = messages?.[0];

            if (message) {
              latestChatMessage = {
                type: 'chat_message',
                message: 'Direct message',
                response:
                  message.text ||
                  (message.image_url
                    ? 'Sent an image'
                    : message.audio_url
                      ? 'Sent a voice message'
                      : null),
                response_audio_url: null,
                created_at: message.created_at,
              };
            }
          }
        }
      }

      if (latestInquiry && latestChatMessage) {
        setLatestResponse(
          new Date(latestInquiry.created_at).getTime() >=
            new Date(latestChatMessage.created_at).getTime()
            ? latestInquiry
            : latestChatMessage
        );
        return;
      }

      setLatestResponse(latestInquiry ?? latestChatMessage);
    };

    fetchTrainerMessage();
    const intervalId = window.setInterval(fetchTrainerMessage, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setVideoPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return previewUrl;
    });

    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = previewUrl;

    const details = await new Promise<{ durationSeconds: number; width: number; height: number }>((resolve, reject) => {
      tempVideo.onloadedmetadata = () =>
        resolve({
          durationSeconds: Math.ceil(tempVideo.duration || 0),
          width: tempVideo.videoWidth,
          height: tempVideo.videoHeight,
        });
      tempVideo.onerror = () => reject(new Error('Could not read this video file.'));
    }).catch((error: Error) => {
      setVideoStatus(error.message);
      return null;
    });

    if (!details) {
      return;
    }

    setVideoDetails(details);
    setVideoFile(file);
    setVideoStatus('');
  };

  const clearVideoSelection = () => {
    setVideoFile(null);
    setVideoDetails(null);
    setVideoStatus('');
    setVideoPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });

    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  useEffect(() => {
    // Still waiting for auth — don't touch the spinner yet
    if (authLoading) return;
    // Auth resolved but no profile (not logged in)
    if (!profile) {
      setLoading(false);
      return;
    }
    if (profile.role !== 'trainee') {
      router.push('/trainer');
      return;
    }
    setLoading(false);
  }, [profile, authLoading, router]);

  // Subscription state
  const subscriptionExpiresAt = profile?.subscriptionExpiresAt
    ? new Date(profile.subscriptionExpiresAt)
    : null;
  const daysLeft = subscriptionExpiresAt ? differenceInDays(subscriptionExpiresAt, new Date()) : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 5;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const toggleLanguage = () => {
    setIsAmharic(!isAmharic);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !profile) return;

    setIsSubmitting(true);
    
    try {
      let audioBase64 = null;
      let uploadedVideo:
        | {
            objectKey: string;
            canonicalUrl: string;
            expiresAt: string;
            contentType: string;
            fileSize: number;
            durationSeconds: number;
            width: number;
            height: number;
          }
        | null = null;

      if (audioBlob) {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        audioBase64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
        });
      }

      if (videoFile) {
        setVideoStatus('Compressing video...');
        const processedVideo = await processVideoForUpload(videoFile);
        setVideoStatus('Uploading video...');
        const uploadFormData = new FormData();
        uploadFormData.append('file', processedVideo.file);
        uploadFormData.append(
          'durationSeconds',
          String(processedVideo.metadata.durationSeconds)
        );
        uploadFormData.append('width', String(processedVideo.metadata.width));
        uploadFormData.append('height', String(processedVideo.metadata.height));

        const uploadResponse = await fetch(resolveApiUrl('/api/inquiry-media/upload'), {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json().catch(() => null);
          throw new Error(uploadError?.error || 'Video upload failed. Please try again.');
        }

        const uploadedVideoResult = await uploadResponse.json();

        uploadedVideo = {
          objectKey: uploadedVideoResult.objectKey,
          canonicalUrl: uploadedVideoResult.canonicalUrl,
          expiresAt: uploadedVideoResult.expiresAt,
          contentType: uploadedVideoResult.contentType,
          fileSize: uploadedVideoResult.fileSize,
          durationSeconds: uploadedVideoResult.durationSeconds,
          width: uploadedVideoResult.width,
          height: uploadedVideoResult.height,
        };
      }

      if (!profile.assignedTrainerId) {
        throw new Error('No trainer is assigned to this trainee.');
      }

      const { data: inquiry, error } = await supabase
        .from('inquiries')
        .insert({
        trainee_id: profile.uid,
        trainer_id: profile.assignedTrainerId,
        trainee_name: profile.displayName,
        message,
        urgency,
        status: 'pending',
        image: image || null,
        audio_url: (audioBase64 as string) || null,
        video_storage_provider: uploadedVideo?.objectKey ? 'r2' : null,
        video_asset_type: uploadedVideo?.objectKey ? 'file' : null,
        video_status: uploadedVideo?.objectKey ? 'ready' : null,
        video_url: uploadedVideo?.canonicalUrl ?? null,
        video_object_key: uploadedVideo?.objectKey ?? null,
        video_mime_type: uploadedVideo?.contentType ?? null,
        video_size_bytes: uploadedVideo?.fileSize ?? null,
        video_duration_seconds: uploadedVideo?.durationSeconds ?? null,
        video_width: uploadedVideo?.width ?? null,
        video_height: uploadedVideo?.height ?? null,
        video_expires_at: uploadedVideo?.expiresAt ?? null,
        })
        .select(
          'id, message, urgency, image, audio_url, video_object_key, video_status, video_expires_at'
        )
        .single();

      if (error || !inquiry) {
        if (uploadedVideo?.objectKey) {
          await fetch(resolveApiUrl('/api/inquiry-media/delete'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              objectKey: uploadedVideo.objectKey,
            }),
          }).catch(() => null);
        }

        throw new Error(error?.message || 'Could not submit inquiry.');
      }

      const chatId = await findOrCreateChat(supabase, profile.uid, profile.assignedTrainerId);
      const chatText = inquiry.urgency === 'High' ? `[High] ${inquiry.message}` : inquiry.message;

      const { error: messageError } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: profile.uid,
        text: chatText,
        image_url: inquiry.image,
        audio_url: inquiry.audio_url,
        inquiry_id: inquiry.id,
        inquiry_urgency: inquiry.urgency,
        video_object_key: inquiry.video_object_key,
        video_status: inquiry.video_status,
        video_expires_at: inquiry.video_expires_at,
      });

      if (messageError) {
        throw new Error(messageError.message || 'Could not send inquiry to trainer chat.');
      }

      await supabase
        .from('chats')
        .update({
          last_message: uploadedVideo?.objectKey ? 'Sent an inquiry video' : chatText,
          last_message_time: new Date().toISOString(),
        })
        .eq('id', chatId);
      
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setMessage('');
        setUrgency('Normal');
        setImage(null);
        setAudioBlob(null);
        setAudioUrl(null);
        clearVideoSelection();
      }, 3000);
    } catch (error) {
      console.error('Error submitting form:', error);
      setVideoStatus(error instanceof Error ? error.message : 'Something went wrong with the video upload.');
    } finally {
      setIsSubmitting(false);
      if (!videoStatus.startsWith('Video attached')) {
        setVideoStatus((current) => (current === 'Uploading video...' ? '' : current));
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light font-sans text-slate-900 pb-24">
      {/* Top App Bar */}
      <header className="flex items-center px-6 pt-12 pb-4 justify-between bg-background-light sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="relative size-12 rounded-full overflow-hidden bg-primary/20 border border-slate-200">
            {profile?.photoURL ? (
              <Image src={profile.photoURL} alt="Trainee" fill className="object-cover rounded-full" unoptimized referrerPolicy="no-referrer" />
            ) : (
              <div className="flex w-full h-full items-center justify-center text-primary-dark font-bold">
                {profile?.displayName?.trim() ? profile.displayName.substring(0,2).toUpperCase() : 'TR'}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.profile}</p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Hi, {profile?.displayName?.split(' ')[0] || 'Trainee'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleLanguage} className="flex size-11 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:text-primary transition-colors">
            <Globe className="w-5 h-5" />
          </button>
          <button onClick={handleLogout} className="flex size-11 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-red-500 hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 mt-4">
        {/* Subscription Banner */}
        {(isExpired || isExpiringSoon) && (
          <div className={`mb-6 rounded-3xl p-4 flex items-start gap-3 border ${
            isExpired
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            <div className={`mt-0.5 shrink-0 size-8 rounded-full flex items-center justify-center ${
              isExpired ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              {isExpired
                ? <AlertTriangle className="w-4 h-4" />
                : <Clock className="w-4 h-4" />}
            </div>
            <div>
              <p className="font-bold text-sm">
                {isExpired
                  ? (lang === 'am' ? 'የደንበኝነት ምዝገባ አብቅቷል' : 'Subscription Expired')
                  : (lang === 'am' ? 'ደንበኝነት ምዝገባ እያለቀ ነው' : 'Subscription Expiring Soon')}
              </p>
              <p className="text-xs mt-0.5 font-medium opacity-80">
                {isExpired
                  ? (lang === 'am'
                    ? `ደንበኝነት ምዝገባዎ ${subscriptionExpiresAt ? format(subscriptionExpiresAt, 'MMM d, yyyy') : ''} ጀምሮ ቆሟል። ለማደስ አሰልጣኝዎን ያነጋግሩ።`
                    : `Your subscription stopped on ${subscriptionExpiresAt ? format(subscriptionExpiresAt, 'MMM d, yyyy') : ''}. Contact your trainer to reactivate.`)
                  : (lang === 'am'
                    ? `ደንበኝነት ምዝገባዎ በ${daysLeft} ቀን ውስጥ ያልቃል።`
                    : `Your subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`)}
              </p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-slate-900">{t.howCanWeHelp}</h1>
          <p className="text-slate-500 font-medium">{t.subtitle}</p>
        </div>

        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300 py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-[#E5F5E5] rounded-full flex items-center justify-center mb-6 shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-primary-dark" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-slate-900">{t.success}</h3>
            <p className="text-slate-500 max-w-[250px] leading-relaxed">
              {t.successSub}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t.urgency}</label>
              <div className="flex gap-3">
                {['Normal', 'High'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUrgency(level)}
                    className={`flex-1 py-4 rounded-2xl border-2 font-bold transition-all duration-200 active:scale-95 ${
                      urgency === level 
                        ? level === 'High' 
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' 
                          : 'bg-primary/10 border-primary text-primary-dark shadow-sm'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {level === 'Normal' ? t.normal : t.high}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t.message}</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.placeholder}
                className="w-full min-h-[160px] rounded-3xl border-2 border-slate-100 bg-white p-5 font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none transition-all resize-none shadow-sm"
                required
              />
            </div>

            {/* Attachments */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t.attachments}</label>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border-2 border-slate-100 bg-white text-slate-600 hover:border-slate-300 transition-colors flex-1 shadow-sm active:scale-95">
                  <Camera className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-bold uppercase">{t.camera}</span>
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border-2 border-slate-100 bg-white text-slate-600 hover:border-slate-300 transition-colors flex-1 shadow-sm active:scale-95">
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-bold uppercase">{t.gallery}</span>
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border-2 border-slate-100 bg-white text-slate-600 hover:border-slate-300 transition-colors flex-1 shadow-sm active:scale-95"
                >
                  <Video className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-bold uppercase">Video</span>
                </button>
                <button 
                  type="button" 
                  onClick={isRecording ? stopRecording : startRecording} 
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border-2 transition-colors flex-1 shadow-sm active:scale-95 ${isRecording ? 'bg-red-50 border-red-300 text-red-600' : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300'}`}
                >
                  {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-6 h-6 text-slate-400" />}
                  <span className="text-xs font-bold uppercase">{isRecording ? t.stop : t.voice}</span>
                </button>
              </div>

              <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleImageUpload} className="hidden" />
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
              <input type="file" accept="video/*" ref={videoInputRef} onChange={handleVideoUpload} className="hidden" />

              {/* Previews */}
              {(image || audioUrl || videoPreviewUrl || videoStatus) && (
                <div className="flex flex-col gap-3 mt-2 p-4 rounded-3xl border-2 border-slate-100 bg-slate-50">
                  {image && (
                    <div className="relative w-full max-w-[200px] rounded-xl overflow-hidden shadow-sm">
                      <Image src={image} alt="Preview" width={200} height={200} className="w-full h-auto object-cover" />
                      <button type="button" onClick={() => setImage(null)} className="absolute top-2 right-2 p-2 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {videoPreviewUrl && (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm p-3">
                      <video src={videoPreviewUrl} controls className="w-full rounded-xl" />
                      {videoDetails && (
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {videoDetails.width}x{videoDetails.height} • {videoDetails.durationSeconds}s
                        </p>
                      )}
                      <button type="button" onClick={clearVideoSelection} className="absolute top-5 right-5 p-2 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {audioUrl && (
                    <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                      <audio src={audioUrl} controls className="h-10 w-full" />
                      <button type="button" onClick={() => { setAudioUrl(null); setAudioBlob(null); }} className="p-2.5 text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  {videoStatus && (
                    <p className="text-sm font-medium text-slate-600">{videoStatus}</p>
                  )}
                </div>
              )}
            </div>

            {/* Latest Trainer Message */}
            <div className="flex flex-col gap-3 mt-4">
              <label className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t.trainerMessage}</label>
              <div className="w-full min-h-[120px] rounded-3xl border-2 border-slate-100 bg-white shadow-sm p-6 text-slate-700 flex flex-col justify-center">
                {latestResponse ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-bold text-primary-dark uppercase tracking-wider bg-primary/10 self-start px-3 py-1 rounded-full">
                      {latestResponse.type === 'chat_message'
                        ? 'Direct message'
                        : `Re: ${latestResponse.message.length > 50 ? latestResponse.message.substring(0, 50) + '...' : latestResponse.message}`}
                    </p>
                    <p className="text-base font-medium leading-relaxed text-slate-800">
                      {latestResponse.response}
                    </p>
                    {latestResponse.response_audio_url && (
                      <audio src={latestResponse.response_audio_url} controls className="h-10 w-full" />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-sm font-medium text-slate-400 italic">
                    {t.noMessages}
                  </div>
                )}
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="w-full h-16 bg-primary hover:bg-[#7ED465] text-primary-dark text-lg font-bold rounded-full shadow-[0_8px_20px_-4px_rgba(141,235,113,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100 mt-6"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-3 border-primary-dark border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{t.send}</span>
                  <Send className="w-6 h-6" />
                </>
              )}
            </button>
          </form>
        )}
      </main>

      <TraineeBottomNav isAmharic={lang === 'am'} />
    </div>
  );
}
