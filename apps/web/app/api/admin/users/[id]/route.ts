import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/supabase/server';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function verifyAdmin(request: Request) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) return null;
  const service = getServiceClient();
  const { data: profile } = await service.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return null;
  return user;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const service = getServiceClient();

    // Get profile
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get auth user info
    const { data: authData } = await service.auth.admin.getUserById(id);

    // Get content counts
    const [
      { count: resumesCount },
      { count: applicationsCount },
      { count: interviewsCount },
      { count: coverLettersCount },
      { count: translationsCount },
      { count: syncedJobsCount },
      { count: calendarEventsCount },
    ] = await Promise.all([
      service.from('resumes').select('*', { count: 'exact', head: true }).eq('user_id', id),
      service.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', id),
      service.from('interview_sessions').select('*', { count: 'exact', head: true }).eq('user_id', id),
      service.from('cover_letters').select('*', { count: 'exact', head: true }).eq('user_id', id),
      service.from('translation_logs').select('*', { count: 'exact', head: true }).eq('user_id', id),
      service.from('synced_jobs').select('*', { count: 'exact', head: true }).eq('user_id', id),
      service.from('calendar_events').select('*', { count: 'exact', head: true }).eq('user_id', id),
    ]);

    return NextResponse.json({
      ...profile,
      email: authData?.user?.email || '',
      provider: authData?.user?.app_metadata?.provider || 'email',
      last_sign_in: authData?.user?.last_sign_in_at || null,
      stats: {
        resumes: resumesCount || 0,
        applications: applicationsCount || 0,
        interviews: interviewsCount || 0,
        coverLetters: coverLettersCount || 0,
        translations: translationsCount || 0,
        syncedJobs: syncedJobsCount || 0,
        calendarEvents: calendarEventsCount || 0,
      },
    });
  } catch (err) {
    console.error('[Admin User Detail]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    const allowedFields = ['is_premium', 'is_admin', 'full_name'];
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const service = getServiceClient();
    const { error } = await service.from('profiles').update(updates).eq('id', id);

    if (error) {
      console.error('[Admin User PATCH]', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin User PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
