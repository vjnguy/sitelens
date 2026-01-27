"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

const OCCUPATIONS = [
  { value: "property-developer", label: "Property Developer" },
  { value: "town-planner", label: "Town Planner / Urban Planner" },
  { value: "architect", label: "Architect" },
  { value: "real-estate-agent", label: "Real Estate Agent" },
  { value: "surveyor", label: "Surveyor" },
  { value: "builder", label: "Builder / Construction Manager" },
  { value: "property-investor", label: "Property Investor" },
  { value: "council-government", label: "Council / Government" },
  { value: "environmental-consultant", label: "Environmental Consultant" },
  { value: "civil-engineer", label: "Civil Engineer" },
  { value: "property-lawyer", label: "Property Lawyer / Conveyancer" },
  { value: "valuer", label: "Valuer" },
  { value: "other", label: "Other" },
];

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [occupation, setOccupation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!occupation) {
      setError("Please select your occupation");
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: name,
          user_type: occupation,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      // Email confirmation required
      setSuccess("Account created! Please check your email to confirm your account.");
      setLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to home</span>
        </Link>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Logo size="md" />
              <span className="text-2xl font-semibold text-white">Siteora</span>
            </Link>
          </div>

          {/* Form card */}
          <div className="bg-zinc-900 rounded-2xl border border-white/10 p-8">
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold text-white mb-2">Create an account</h1>
              <p className="text-sm text-zinc-400">
                Get started with Siteora for free
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-3 rounded-lg">
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-orange-500 focus:ring-orange-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-orange-500 focus:ring-orange-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-orange-500 focus:ring-orange-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation" className="text-zinc-300">Occupation</Label>
                <Select value={occupation} onValueChange={setOccupation} required>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:border-orange-500 focus:ring-orange-500/20 [&>span]:text-zinc-500 [&[data-state=open]>span]:text-white [&>span[data-placeholder]]:text-zinc-500">
                    <SelectValue placeholder="Select your occupation" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {OCCUPATIONS.map((occ) => (
                      <SelectItem
                        key={occ.value}
                        value={occ.value}
                        className="text-zinc-300 focus:bg-zinc-700 focus:text-white"
                      >
                        {occ.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-11 font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
              <p className="text-sm text-zinc-500">
                Already have an account?{" "}
                <Link href="/login" className="text-orange-400 hover:text-orange-300">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
