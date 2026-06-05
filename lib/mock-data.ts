import { UserProfile } from './store';

export interface InquiryRecord {
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
  video_object_key?: string | null;
  video_status?: string | null;
  video_expires_at?: string | null;
  video_url?: string | null;
}

export interface ChatMessage {
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

const DEFAULT_TRAINEES: UserProfile[] = [
  {
    uid: 'mock-trainee-123',
    email: 'farmer@poultry.com',
    displayName: 'Samuel Adebayor',
    role: 'trainee',
    focusArea: 'Marketing',
    phoneNumber: '+251922334455',
    location: 'Bole, Addis Ababa',
    farmSize: '1.2 Acres',
    flockCount: 450,
    isActive: true,
    createdAt: '2025-05-10T12:00:00Z',
    assignedTrainerId: 'mock-trainer-123',
  },
  {
    uid: 't1',
    email: 'david.mwangi@example.com',
    phoneNumber: '+254701234567',
    location: 'Nairobi Region',
    farmSize: '2 Acres',
    flockCount: 1500,
    createdAt: '2023-10-15T12:00:00Z',
    displayName: 'David Mwangi',
    role: 'trainee',
    focusArea: 'Breeder',
    isActive: true,
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    assignedTrainerId: 'mock-trainer-123',
  },
  {
    uid: 't2',
    email: 'sarah.j@example.com',
    phoneNumber: '+254722987654',
    location: 'Kiambu County',
    farmSize: '1.5 Acres',
    flockCount: 800,
    createdAt: '2024-01-20T12:00:00Z',
    displayName: 'Sarah Johnson',
    role: 'trainee',
    focusArea: 'Broilers',
    isActive: true,
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    assignedTrainerId: 'mock-trainer-123',
  },
  {
    uid: 't3',
    email: 'anita.peters@example.com',
    phoneNumber: '+254733456789',
    location: 'Nakuru Town',
    farmSize: '3 Acres',
    flockCount: 2500,
    createdAt: '2024-02-10T12:00:00Z',
    displayName: 'Anita Peters',
    role: 'trainee',
    focusArea: 'Layers',
    isActive: false,
    photoURL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    assignedTrainerId: 'mock-trainer-123',
  },
  {
    uid: 't4',
    email: 'robert.kiprop@example.com',
    phoneNumber: '+254711222333',
    location: 'Eldoret',
    farmSize: '5 Acres',
    flockCount: 5000,
    createdAt: '2024-04-05T12:00:00Z',
    displayName: 'Robert Kiprop',
    role: 'trainee',
    focusArea: 'Hatchery',
    isActive: true,
    photoURL: '',
    assignedTrainerId: 'mock-trainer-123',
  },
];

const DEFAULT_INQUIRIES: InquiryRecord[] = [
  {
    id: 'mock-inquiry-1',
    trainee_id: 'mock-trainee-123',
    trainer_id: 'mock-trainer-123',
    trainee_name: 'Samuel Adebayor',
    message: 'The chicks look weak today. I have attached a short clip.',
    urgency: 'High',
    status: 'pending',
    image: null,
    audio_url: null,
    response: null,
    response_audio_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    responded_at: null,
  },
  {
    id: 'mock-inquiry-2',
    trainee_id: 't1',
    trainer_id: 'mock-trainer-123',
    trainee_name: 'David Mwangi',
    message: 'What is the best vaccination schedule for brooding week 2?',
    urgency: 'Normal',
    status: 'responded',
    image: null,
    audio_url: null,
    response: 'Ensure Gumboro intermediate plus is administered on day 10-14, and keep temperature stable.',
    response_audio_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    responded_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  }
];

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    sender_id: 'mock-trainer-123',
    text: 'Hi there! How are the new chicks settling into the brooder today? Any temperature issues?',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'm2',
    sender_id: 'mock-trainee-123',
    text: "They seem a bit huddled in one corner. I'm concerned it might be a draft. Is the lamp too high?",
    image_url: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=300',
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'm3',
    sender_id: 'mock-trainer-123',
    text: "If they are huddling directly under the lamp, they're cold. If they are huddling in a corner away from it, there might be a draft. Let's try lowering the lamp by 2 inches first.",
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

// Helper to check if running on client side
const isClient = () => typeof window !== 'undefined';

export function getMockTrainees(): UserProfile[] {
  if (!isClient()) return DEFAULT_TRAINEES;
  const data = localStorage.getItem('addis_mock_trainees');
  if (!data) {
    localStorage.setItem('addis_mock_trainees', JSON.stringify(DEFAULT_TRAINEES));
    return DEFAULT_TRAINEES;
  }
  return JSON.parse(data);
}

export function saveMockTrainees(trainees: UserProfile[]) {
  if (!isClient()) return;
  localStorage.setItem('addis_mock_trainees', JSON.stringify(trainees));
}

export function getMockInquiries(): InquiryRecord[] {
  if (!isClient()) return DEFAULT_INQUIRIES;
  const data = localStorage.getItem('addis_mock_inquiries');
  if (!data) {
    localStorage.setItem('addis_mock_inquiries', JSON.stringify(DEFAULT_INQUIRIES));
    return DEFAULT_INQUIRIES;
  }
  return JSON.parse(data);
}

export function saveMockInquiries(inquiries: InquiryRecord[]) {
  if (!isClient()) return;
  localStorage.setItem('addis_mock_inquiries', JSON.stringify(inquiries));
}

export function getMockMessages(): ChatMessage[] {
  if (!isClient()) return DEFAULT_MESSAGES;
  const data = localStorage.getItem('addis_mock_messages');
  if (!data) {
    localStorage.setItem('addis_mock_messages', JSON.stringify(DEFAULT_MESSAGES));
    return DEFAULT_MESSAGES;
  }
  return JSON.parse(data);
}

export function saveMockMessages(messages: ChatMessage[]) {
  if (!isClient()) return;
  localStorage.setItem('addis_mock_messages', JSON.stringify(messages));
}

export function getMockProfiles(): Record<string, UserProfile> {
  if (!isClient()) return {};
  const data = localStorage.getItem('addis_mock_profiles');
  if (!data) {
    const initialProfiles: Record<string, UserProfile> = {
      'mock-trainer-123': {
        uid: 'mock-trainer-123',
        email: 'expert@poultry.com',
        displayName: 'Expert Sarah',
        role: 'trainer',
        focusArea: 'Brooding Management',
        phoneNumber: '+251911223344',
        createdAt: '2025-05-01T12:00:00Z',
      },
      'mock-trainee-123': {
        uid: 'mock-trainee-123',
        email: 'farmer@poultry.com',
        displayName: 'Samuel Adebayor',
        role: 'trainee',
        focusArea: 'Marketing',
        phoneNumber: '+251922334455',
        location: 'Bole, Addis Ababa',
        farmSize: '1.2 Acres',
        flockCount: 450,
        isActive: true,
        createdAt: '2025-05-10T12:00:00Z',
        assignedTrainerId: 'mock-trainer-123',
      }
    };
    localStorage.setItem('addis_mock_profiles', JSON.stringify(initialProfiles));
    return initialProfiles;
  }
  return JSON.parse(data);
}

export function saveMockProfile(profile: UserProfile) {
  if (!isClient()) return;
  const profiles = getMockProfiles();
  profiles[profile.uid] = profile;
  localStorage.setItem('addis_mock_profiles', JSON.stringify(profiles));
}
