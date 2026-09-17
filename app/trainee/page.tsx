'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore, useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { TraineeBottomNav } from '@/components/TraineeBottomNav';
import { processVideoForUpload } from '@/lib/media/video';
import { pickSupportedAudioMime, requestMicrophone, micErrorMessage } from '@/lib/media/audio-recorder';
import { LogOut, Send, CheckCircle2, Globe, Camera, Image as ImageIcon, Mic, Square, Trash2, Video, AlertTriangle, Clock } from 'lucide-react';
import { resolveApiUrl } from '@/lib/api-helper';
import { differenceInDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Marketing', 'Health', 'Housing', 'Feeding', 'General'];

const TRANSLATIONS: any = {
  en: {
    askExpert: "Ask Expert",
    howCanWeHelp: "How can we help?",
    subtitle: "Submit a question or report an issue to your supervisor.",
    topic: "Topic",
    urgency: "Urgency",
    message: "Message",
    attachments: "Attachments (Optional)",
    placeholder: "Describe your question or issue in detail...",
    send: "Send to Supervisor",
    success: "Sent Successfully!",
    successSub: "Your supervisor has been notified and will respond shortly.",
    normal: "Normal",
    high: "High",
    home: "Home",
    profile: "Profile",
    trainerMessage: "Message from Supervisor",
    noMessages: "No messages from supervisor yet.",
    sessionsTitle: "Chat sessions",
    sessionsEmpty: "No chat sessions yet — each question you send opens one here with full history.",
    openSession: "Open chat session",
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
    subtitle: "ጥያቄዎን ወይም ችግርዎን ለተቆጣጣሪዎ ያቅርቡ።",
    topic: "ርዕስ",
    urgency: "አስቸኳይነት",
    message: "መልእክት",
    attachments: "አባሪዎች (አማራጭ)",
    placeholder: "ጥያቄዎን ወይም ችግርዎን በዝርዝር ያብራሩ...",
    send: "ለተቆጣጣሪ ላክ",
    success: "በተሳካ ሁኔታ ተልኳል!",
    successSub: "ተቆጣጣሪዎ መልእክቱን አግኝተዋል እና በቅርቡ ምላሽ ይሰጣሉ።",
    normal: "መደበኛ",
    high: "ከፍተኛ",
    home: "ዋና ገጽ",
    profile: "መገለጫ",
    trainerMessage: "ከተቆጣጣሪ የመጣ መልእክት",
    noMessages: "እስካሁን ከተቆጣጣሪ ምንም መልእክት የለም።",
    sessionsTitle: "ውይይቶች",
    sessionsEmpty: "እስካሁን ምንም ውይይት የለም — የሚልኩት ጥያቄ እዚህ ውይይት ይከፍታል።",
    openSession: "ውይይቱን ክፈት",
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
    throw new Error(chatError?.message || 'Could not create supervisor chat.');
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
  const [sessions, setSessions] = useState<{
    chatId: string;
    peerId: string;
    peerName: string;
    lastMessage: string | null;
    lastTime: string | null;
  }[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioMimeRef = useRef<string | undefined>(undefined);
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

  // Farmer chat sessions — every chat is a session with full history.
  useEffect(() => {
    if (!profile || profile.role !== 'trainee') return;

    const fetchSessions = async () => {
      const { data: mine } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', profile.uid);

      const chatIds = (mine ?? []).map((row) => row.chat_id);
      if (chatIds.length === 0) {
        setSessions([]);
        return;
      }

      const { data: chats } = await supabase
        .from('chats')
        .select('id, last_message, last_message_time')
        .in('id', chatIds)
        .order('last_message_time', { ascending: false })
        .limit(20);

      const { data: parts } = await supabase
        .from('chat_participants')
        .select('chat_id, user_id')
        .in('chat_id', chatIds);

      const peerIds = [
        ...new Set(
          (parts ?? [])
            .filter((p) => p.user_id !== profile.uid)
            .map((p) => p.user_id),
        ),
      ];

      const nameById = new Map<string, string>();
      if (peerIds.length > 0) {
        const { data: peers } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', peerIds);
        for (const p of peers ?? []) nameById.set(p.id, p.display_name);
      }

      const peerByChat = new Map<string, string>();
      for (const p of parts ?? []) {
        if (p.user_id !== profile.uid && !peerByChat.has(p.chat_id)) {
          peerByChat.set(p.chat_id, p.user_id);
        }
      }

      setSessions(
        (chats ?? []).map((c) => {
          const peerId = peerByChat.get(c.id) ?? profile.assignedTrainerId ?? '';
          return {
            chatId: c.id,
            peerId,
            peerName: nameById.get(peerId) ?? 'Supervisor',
            lastMessage: c.last_message,
            lastTime: c.last_message_time,
          };
        }),
      );
    };

    void fetchSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const startRecording = async () => {
    try {
      const stream = await requestMicrophone();
      const mimeType = pickSupportedAudioMime();
      audioMimeRef.current = mimeType;
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const type = audioMimeRef.current ?? 'audio/mp4';
        const audioBlob = new Blob(audioChunksRef.current, { type });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert(micErrorMessage(err));
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
    if (!profile) return;
    const hasMedia = image !== null || audioBlob !== null || videoFile !== null;
    if (!message.trim() && !hasMedia) return;

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
        throw new Error('No supervisor is assigned to this farmer.');
      }

      const { data: inquiry, error } = await supabase
        .from('inquiries')
        .insert({
        trainee_id: profile.uid,
        trainer_id: profile.assignedTrainerId,
        trainee_name: profile.displayName,
        message: message.trim() || '(media message)',
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
        throw new Error(messageError.message || 'Could not send inquiry to supervisor chat.');
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

  // Shell-first: no full-page gate — header + nav render instantly while
  // the inquiry form area shimmers until auth resolves.

  return (
    <div className="flex min-h-svh w-full flex-col bg-background font-sans text-foreground pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 sm:px-6 pb-4 pt-10">
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              {profile?.photoURL ? (
                <AvatarImage src={profile.photoURL} alt="Farmer" />
              ) : (
                <AvatarFallback>{profile?.displayName?.trim() ? profile.displayName.substring(0, 2).toUpperCase() : 'TR'}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.profile}</p>
              <h1 className="font-heading text-xl font-bold tracking-tight">Hi, {profile?.displayName?.split(' ')[0] || 'Farmer'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Toggle language" onClick={toggleLanguage}>
              <Globe className="size-5" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Log out" onClick={handleLogout} className="text-destructive">
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 min-w-0 px-4 sm:px-6 pt-4" aria-busy={loading}>
        {loading ? (
          <div className="flex flex-col gap-4" role="status" aria-label="Loading">
            <div>
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="mt-2 h-4 w-1/2" />
            </div>
            <Card>
              <CardPanel className="flex flex-col gap-3 p-5">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </CardPanel>
            </Card>
          </div>
        ) : (
        <>
        {(isExpired || isExpiringSoon) && (
          <Alert variant={isExpired ? 'error' : 'warning'} className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 shrink-0">{isExpired ? <AlertTriangle className="size-4" /> : <Clock className="size-4" />}</span>
            <span>
              <span className="block font-bold">
                {isExpired
                  ? (lang === 'am' ? 'የደንበኝነት ምዝገባ አብቅቷል' : 'Subscription Expired')
                  : (lang === 'am' ? 'ደንበኝነት ምዝገባ እያለቀ ነው' : 'Subscription Expiring Soon')}
              </span>
              <AlertDescription>
                {isExpired
                  ? (lang === 'am'
                    ? `ደንበኝነት ምዝገባዎ ${subscriptionExpiresAt ? format(subscriptionExpiresAt, 'MMM d, yyyy') : ''} ጀምሮ ቆሟል። ለማደስ ተቆጣጣሪዎን ያነጋግሩ።`
                    : `Your subscription stopped on ${subscriptionExpiresAt ? format(subscriptionExpiresAt, 'MMM d, yyyy') : ''}. Contact your supervisor to reactivate.`)
                  : (lang === 'am'
                    ? `ደንበኝነት ምዝገባዎ በ${daysLeft} ቀን ውስጥ ያልቃል።`
                    : `Your subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`)}
              </AlertDescription>
            </span>
          </Alert>
        )}

        <div className="mb-6">
          <h1 className="font-heading text-3xl font-bold tracking-tight">{t.howCanWeHelp}</h1>
          <p className="mt-1 font-medium text-muted-foreground">{t.subtitle}</p>
        </div>

        {submitted ? (
          <Card>
            <CardPanel className="flex flex-col items-center py-12 text-center">
              <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
                <CheckCircle2 className="size-8" />
              </span>
              <h3 className="font-heading text-2xl font-bold">{t.success}</h3>
              <p className="mt-2 max-w-[260px] leading-relaxed text-muted-foreground">{t.successSub}</p>
              {profile?.assignedTrainerId && (
                <Button
                  type="button"
                  size="lg"
                  className="mt-6 w-full max-w-[260px]"
                  onClick={() => router.push(`/chat?peerId=${profile.assignedTrainerId}`)}
                >
                  <span>{t.openSession}</span>
                </Button>
              )}
            </CardPanel>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold">{t.urgency}</span>
              <div className="grid grid-cols-2 gap-2">
                {['Normal', 'High'].map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant={urgency === level ? (level === 'High' ? 'destructive' : 'default') : 'outline'}
                    size="lg"
                    onClick={() => setUrgency(level)}
                  >
                    {level === 'Normal' ? t.normal : t.high}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="inquiry-message" className="text-[13px] font-semibold">{t.message}</label>
              <Textarea
                id="inquiry-message"
                aria-label={t.placeholder}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.placeholder}
                className="min-h-[150px]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold">{t.attachments}</span>
              <div className="grid grid-cols-4 gap-2">
                <Button type="button" variant="outline" className="h-auto flex-col gap-1 py-3" onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="size-5 text-muted-foreground" />
                  <span className="text-[11px] font-bold uppercase">{t.camera}</span>
                </Button>
                <Button type="button" variant="outline" className="h-auto flex-col gap-1 py-3" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="size-5 text-muted-foreground" />
                  <span className="text-[11px] font-bold uppercase">{t.gallery}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto flex-col gap-1 py-3"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <Video className="size-5 text-muted-foreground" />
                  <span className="text-[11px] font-bold uppercase">Video</span>
                </Button>
                <Button
                  type="button"
                  variant={isRecording ? 'destructive' : 'outline'}
                  className="h-auto flex-col gap-1 py-3"
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? <Square className="size-5 fill-current" /> : <Mic className="size-5 text-muted-foreground" />}
                  <span className="text-[11px] font-bold uppercase">{isRecording ? t.stop : t.voice}</span>
                </Button>
              </div>

              <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleImageUpload} className="hidden" />
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
              <input type="file" accept="video/*" ref={videoInputRef} onChange={handleVideoUpload} className="hidden" />

              {(image || audioUrl || videoPreviewUrl || videoStatus) && (
                <Card>
                  <CardPanel className="flex flex-col gap-3 p-4">
                    {image && (
                      <div className="relative w-full max-w-[220px] overflow-hidden rounded-xl border border-border">
                        <Image src={image} alt="Preview" width={220} height={220} className="h-auto w-full object-cover" />
                        <Button type="button" variant="destructive" size="icon-sm" className="absolute right-2 top-2" onClick={() => setImage(null)} aria-label="Remove image">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                    {videoPreviewUrl && (
                      <div className="rounded-xl border border-border bg-muted p-3">
                        <video src={videoPreviewUrl} controls className="w-full rounded-lg" />
                        {videoDetails && (
                          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {videoDetails.width}x{videoDetails.height} • {videoDetails.durationSeconds}s
                          </p>
                        )}
                        <Button type="button" variant="destructive-outline" size="sm" className="mt-2" onClick={clearVideoSelection}>
                          <Trash2 className="size-4" /> Remove video
                        </Button>
                      </div>
                    )}
                    {audioUrl && (
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted p-3">
                        <audio src={audioUrl} controls className="h-10 w-full" />
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => { setAudioUrl(null); setAudioBlob(null); }} aria-label="Remove audio">
                          <Trash2 className="size-5" />
                        </Button>
                      </div>
                    )}
                    {videoStatus && <p className="text-sm font-medium text-muted-foreground">{videoStatus}</p>}
                  </CardPanel>
                </Card>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold">{t.trainerMessage}</span>
              <Card>
                <CardPanel className="flex min-h-[110px] flex-col justify-center p-5">
                  {latestResponse ? (
                    <div className="flex flex-col gap-2">
                      <Badge variant="secondary" size="sm" className={cn('self-start')}>
                        {latestResponse.type === 'chat_message'
                          ? 'Direct message'
                          : `Re: ${latestResponse.message.length > 50 ? latestResponse.message.substring(0, 50) + '...' : latestResponse.message}`}
                      </Badge>
                      <p className="text-[15px] font-medium leading-relaxed">{latestResponse.response}</p>
                      {latestResponse.response_audio_url && (
                        <audio src={latestResponse.response_audio_url} controls className="h-10 w-full" />
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-sm font-medium italic text-muted-foreground">{t.noMessages}</p>
                  )}
                </CardPanel>
              </Card>
            </div>

            <Button type="submit" size="lg" loading={isSubmitting} disabled={!message.trim() && !image && !audioBlob && !videoFile} className="mt-1 w-full">
              <span>{t.send}</span>
              <Send className="size-5" />
            </Button>
          </form>
        )}

        <section className="mt-8" data-testid="farmer-sessions" aria-label={t.sessionsTitle}>
          <h2 className="font-heading text-xl font-bold tracking-tight">{t.sessionsTitle}</h2>
          {sessions.length === 0 ? (
            <Card className="mt-3">
              <CardPanel className="p-5">
                <p className="text-center text-sm font-medium italic text-muted-foreground">{t.sessionsEmpty}</p>
              </CardPanel>
            </Card>
          ) : (
            <ul className="mt-3 grid gap-2">
              {sessions.map((s) => (
                <li key={s.chatId}>
                  <button
                    type="button"
                    data-testid="farmer-session"
                    onClick={() => router.push(`/chat?peerId=${s.peerId}`)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/50"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                      {s.peerName.substring(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{s.peerName}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {s.lastMessage || (lang === 'am' ? '(የሚዲያ መልእክት)' : '(media message)')}
                      </span>
                    </span>
                    {s.lastTime && (
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">
                        {format(new Date(s.lastTime), 'MMM d')}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        </>
        )}
      </main>

      <TraineeBottomNav isAmharic={lang === 'am'} />
    </div>
  );
}
