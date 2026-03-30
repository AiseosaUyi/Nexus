'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    return redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/', 'layout');

  // If email confirmation is enabled, session will be null
  if (data.session) {
    redirect('/dashboard');
  } else {
    redirect('/signup?message=Success! Please check your email to confirm your account.');
  }
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function createBusiness(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;

  const { data, error } = await supabase
    .from('businesses')
    .insert([{ name, slug, owner_id: user.id }])
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { data };
}

export async function getUserBusinesses() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('business_members')
    .select('businesses (*)')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching businesses:', error);
    return [];
  }

  return data.map((item: any) => item.businesses);
}
