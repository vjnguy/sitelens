"use client";

import { useState } from "react";
import Link from "next/link";
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
import { MapPin, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

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

export default function RequestDemoPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [occupation, setOccupation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from("demo_requests")
        .insert([
          {
            name,
            email,
            occupation,
            created_at: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        throw insertError;
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setLoading(false);
    }
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
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-semibold text-white">Siteora</span>
            </Link>
          </div>

          {/* Form card */}
          <div className="bg-zinc-900 rounded-2xl border border-white/10 p-8">
            {submitted ? (
              <div className="text-center py-4">
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Request Submitted!</h2>
                <p className="text-sm text-zinc-400 mb-6">
                  Thanks for your interest in Siteora. We&apos;ll be in touch within 24-48 hours.
                </p>
                <Link href="/">
                  <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white h-11">
                    Back to Home
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-xl font-semibold text-white mb-2">Request a Demo</h1>
                  <p className="text-sm text-zinc-400">
                    Want a guided walkthrough? Fill out the form below.
                  </p>
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-400">
                      Or{" "}
                      <Link href="/register" className="text-green-300 underline font-medium">
                        create a free account
                      </Link>{" "}
                      and start exploring now!
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
                      {error}
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
                    <Label htmlFor="email" className="text-zinc-300">Work Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                        Submitting...
                      </>
                    ) : (
                      "Request Demo"
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
