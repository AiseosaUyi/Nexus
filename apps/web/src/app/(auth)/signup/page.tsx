import Link from 'next/link';
import { signUp } from '../actions';

export const metadata = {
  title: 'Sign up — Nexus',
  description: 'Create your Nexus account',
};

interface SignupPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#37352f] text-center mb-1">
        Create your account
      </h1>
      <p className="text-sm text-[#37352f]/60 text-center mb-6">
        Start building your knowledge base today.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={signUp} className="space-y-3">
        <div>
          <label
            htmlFor="full_name"
            className="block text-sm font-medium text-[#37352f]/80 mb-1"
          >
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            autoComplete="name"
            placeholder="Alex Johnson"
            className="w-full px-3 py-2 text-sm rounded-md border border-[#37352f]/20 bg-white text-[#37352f] placeholder:text-[#37352f]/30 outline-none focus:ring-2 focus:ring-[#37352f]/20 focus:border-[#37352f]/40 transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#37352f]/80 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-3 py-2 text-sm rounded-md border border-[#37352f]/20 bg-white text-[#37352f] placeholder:text-[#37352f]/30 outline-none focus:ring-2 focus:ring-[#37352f]/20 focus:border-[#37352f]/40 transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#37352f]/80 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            className="w-full px-3 py-2 text-sm rounded-md border border-[#37352f]/20 bg-white text-[#37352f] placeholder:text-[#37352f]/30 outline-none focus:ring-2 focus:ring-[#37352f]/20 focus:border-[#37352f]/40 transition-all"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 px-4 mt-2 bg-[#37352f] hover:bg-[#37352f]/90 text-white text-sm font-medium rounded-md transition-colors cursor-pointer"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#37352f]/50">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-[#37352f]/80 font-medium hover:underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
