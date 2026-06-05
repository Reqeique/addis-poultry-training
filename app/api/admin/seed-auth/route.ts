import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const admin = createAdminClient();

    const preloadedUsers = [
      { phone: '+251911223344', name: 'Admin Trainer' },
      { phone: '+251922334455', name: 'Abebe Kebede' },
      { phone: '+251933445566', name: 'Chala Bekele' },
      { phone: '+251944556677', name: 'Mulu Tesfaye' },
    ];

    const results: any[] = [];

    for (const u of preloadedUsers) {
      const digits = u.phone.replace(/\D/g, '');
      const email = `${digits}@phone.addis.local`;

      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        phone: u.phone,
        password: 'password123',
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          display_name: u.name,
          login_phone: u.phone,
        }
      });

      if (error) {
        if (error.message.includes('already exists') || error.status === 422 || error.message.includes('already registered')) {
          results.push({ name: u.name, phone: u.phone, status: 'already exists' });
        } else {
          results.push({ name: u.name, phone: u.phone, status: 'error', error: error.message });
        }
      } else {
        results.push({ name: u.name, phone: u.phone, status: 'created', id: created.user.id });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
