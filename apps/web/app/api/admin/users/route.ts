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

export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const service = getServiceClient();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Get auth users list via admin API
    const { data: authData, error: authError } = await service.auth.admin.listUsers({
      page,
      perPage: limit,
    });

    if (authError) {
      console.error('[Admin Users] Auth error:', authError);
      return NextResponse.json({ error: 'Failed to list auth users' }, { status: 500 });
    }

    // Get profiles with pagination and optional search
    let query = service
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('full_name', `%${search}%`);
    }

    const { data: profiles, count } = await query;

    // Merge auth user emails with profiles
    const authMap = new Map<string, { email: string; provider: string; last_sign_in: string | null }>();
    authData?.users?.forEach((u) => {
      authMap.set(u.id, {
        email: u.email || '',
        provider: u.app_metadata?.provider || 'email',
        last_sign_in: u.last_sign_in_at || null,
      });
    });

    const users = (profiles || []).map((p) => {
      const auth = authMap.get(p.id);
      return {
        ...p,
        email: auth?.email || '',
        provider: auth?.provider || 'email',
        last_sign_in: auth?.last_sign_in || null,
      };
    });

    return NextResponse.json({
      users,
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[Admin Users GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { userId, field, value } = body;

    if (!userId || !field) {
      return NextResponse.json({ error: 'Missing userId or field' }, { status: 400 });
    }

    const allowedFields = ['is_premium', 'is_admin'];
    if (!allowedFields.includes(field)) {
      return NextResponse.json({ error: 'Field not allowed' }, { status: 400 });
    }

    const service = getServiceClient();
    const { error } = await service
      .from('profiles')
      .update({ [field]: value })
      .eq('id', userId);

    if (error) {
      console.error('[Admin Users PATCH]', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Users PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Don't allow self-deletion
    if (userId === admin.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    const service = getServiceClient();

    // Delete from auth (cascades to profiles via FK)
    const { error } = await service.auth.admin.deleteUser(userId);
    if (error) {
      console.error('[Admin Users DELETE]', error);
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Users DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
