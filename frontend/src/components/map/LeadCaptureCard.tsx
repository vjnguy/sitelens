"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Mail,
  Phone,
  Send,
  Check,
  Loader2,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { captureLead, updateLeadContact } from '@/lib/supabase/leads';
import type { DevelopmentPotential } from '@/lib/api/development-potential';
import type { SiteAnalysis } from '@/lib/api/qld-identify';

interface LeadCaptureCardProps {
  lotPlan: string;
  address?: string;
  coordinates: [number, number];
  developmentPotential: DevelopmentPotential;
  siteAnalysis?: SiteAnalysis | null;
  onLeadCaptured?: (leadId: string) => void;
  className?: string;
}

export function LeadCaptureCard({
  lotPlan,
  address,
  coordinates,
  developmentPotential,
  siteAnalysis,
  onLeadCaptured,
  className,
}: LeadCaptureCardProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Determine the "hook" - what makes this property valuable
  const subdivisionPotential = developmentPotential.subdivision?.practicalLots || 0;
  const hasSubdivisionPotential = subdivisionPotential > 1;
  const hasConstraints = siteAnalysis && siteAnalysis.constraints.length > 0;
  const highSeverityCount = siteAnalysis?.constraints.filter(c => c.severity === 'high').length || 0;

  // Don't show for single lots with no value
  if (!hasSubdivisionPotential && !hasConstraints) {
    return null;
  }

  const handleSubmit = async () => {
    if (!email && !phone) {
      setError('Please enter your email or phone');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // If we already have a lead ID, just update the contact info
      if (leadId) {
        const result = await updateLeadContact(leadId, {
          email: email || undefined,
          phone: phone || undefined,
          reportRequested: true,
        });

        if (!result.success) {
          setError(result.error || 'Failed to submit');
          return;
        }
      } else {
        // Create new lead with contact info
        const result = await captureLead({
          lotPlan,
          address,
          coordinates,
          developmentPotential,
          siteAnalysis,
          contactEmail: email || undefined,
          contactPhone: phone || undefined,
          reportRequested: true,
        });

        if (!result.success) {
          setError(result.error || 'Failed to submit');
          return;
        }

        setLeadId(result.leadId || null);
        onLeadCaptured?.(result.leadId!);
      }

      setIsSubmitted(true);
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Capture lead silently in background (anonymous, no contact info)
  const captureAnonymousLead = async () => {
    if (leadId) return; // Already captured

    try {
      const result = await captureLead({
        lotPlan,
        address,
        coordinates,
        developmentPotential,
        siteAnalysis,
        reportRequested: false,
      });

      if (result.success && result.leadId) {
        setLeadId(result.leadId);
      }
    } catch (err) {
      // Silent fail for anonymous capture
      console.error('Anonymous lead capture failed:', err);
    }
  };

  // Capture anonymous lead when card mounts
  useState(() => {
    captureAnonymousLead();
  });

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "bg-green-500/10 border border-green-500/30 rounded-lg p-4",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-green-500/20">
            <Check className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-600">Report Requested!</p>
            <p className="text-xs text-muted-foreground">
              We'll send your detailed analysis report shortly.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-lg p-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-full bg-blue-500/20">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            Get Detailed Report
            <Badge className="bg-blue-500 text-white text-[10px]">Free</Badge>
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasSubdivisionPotential
              ? `Full subdivision feasibility analysis for ${subdivisionPotential}-lot development`
              : 'Complete constraint analysis and development assessment'}
          </p>
        </div>
      </div>

      {/* Value Proposition */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {hasSubdivisionPotential && (
          <div className="bg-background/50 rounded p-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium">{subdivisionPotential} lot potential</span>
          </div>
        )}
        {hasConstraints && (
          <div className="bg-background/50 rounded p-2 flex items-center gap-2">
            <AlertTriangle className={cn("h-4 w-4", highSeverityCount > 0 ? "text-red-500" : "text-amber-500")} />
            <span className="text-xs font-medium">{siteAnalysis!.constraints.length} constraints</span>
          </div>
        )}
        <div className="bg-background/50 rounded p-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-medium">AI insights</span>
        </div>
        <div className="bg-background/50 rounded p-2 flex items-center gap-2">
          <Download className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-medium">PDF export</span>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-2">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
        </div>

        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="tel"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-9 text-sm bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Get Free Report
            </>
          )}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          No spam. We'll only contact you about this property.
        </p>
      </div>
    </motion.div>
  );
}

export default LeadCaptureCard;
