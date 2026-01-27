"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  MapPin,
  Building2,
  AlertTriangle,
  Phone,
  Mail,
  Eye,
  Lock,
  Loader2,
  Search,
  Filter,
  RefreshCw,
  Droplets,
  DollarSign,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Lead } from '@/lib/supabase/types';

export default function DeveloperDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    loadLeads();
    checkUserType();
  }, []);

  const checkUserType = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, subscription_status')
        .eq('id', user.id)
        .single();

      setUserType(profile?.user_type || 'buyer');
    }
  };

  const loadLeads = async () => {
    setIsLoading(true);
    const supabase = createClient();

    // For demo, show all leads with subdivision potential
    // In production, this would be filtered by subscription
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .gt('subdivision_potential', 1)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setLeads(data as Lead[]);
    }
    setIsLoading(false);
  };

  const filteredLeads = leads.filter(lead =>
    !searchQuery ||
    lead.locality?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.lga?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.lot_plan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Developer Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Properties with subdivision potential in your areas
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {leads.length} Active Leads
              </Badge>
              <Button variant="outline" size="sm" onClick={loadLeads}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex gap-3 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by suburb, LGA, or Lot/Plan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <h3 className="mt-4 font-semibold">No leads yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Leads will appear here when property buyers analyse sites in your subscribed areas.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isSelected={selectedLead?.id === lead.id}
                onClick={() => setSelectedLead(lead)}
                userType={userType}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          userType={userType}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}

function LeadCard({
  lead,
  isSelected,
  onClick,
  userType,
}: {
  lead: Lead;
  isSelected: boolean;
  onClick: () => void;
  userType: string | null;
}) {
  const hasContact = lead.contact_email || lead.contact_phone;
  const isUnlocked = userType === 'developer' || userType === 'admin';

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-lg border bg-card cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Property Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{lead.lot_plan}</h3>
            {lead.subdivision_potential && lead.subdivision_potential > 1 && (
              <Badge className="bg-green-500 text-white text-xs">
                {lead.subdivision_potential} lots
              </Badge>
            )}
            {lead.report_requested && (
              <Badge variant="secondary" className="text-xs">
                Report requested
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {lead.locality && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {lead.locality}
              </span>
            )}
            {lead.area_sqm && (
              <span>{Math.round(lead.area_sqm).toLocaleString()} m²</span>
            )}
            {lead.zoning_code && (
              <Badge variant="outline" className="text-xs">
                {lead.zoning_code}
              </Badge>
            )}
          </div>

          {/* Services info */}
          <div className="flex items-center gap-3 mt-2 text-xs">
            {lead.sewer_available !== null && (
              <span className={cn(
                "flex items-center gap-1",
                lead.sewer_available ? "text-green-600" : "text-red-500"
              )}>
                <Droplets className="h-3 w-3" />
                Sewer {lead.sewer_available ? `${lead.sewer_distance_m}m` : 'N/A'}
                {lead.sewer_location && lead.sewer_location !== 'frontage' && (
                  <span className="text-amber-500">({lead.sewer_location})</span>
                )}
              </span>
            )}
            {lead.constraint_count > 0 && (
              <span className={cn(
                "flex items-center gap-1",
                lead.high_severity_count > 0 ? "text-red-500" : "text-amber-500"
              )}>
                <AlertTriangle className="h-3 w-3" />
                {lead.constraint_count} constraints
              </span>
            )}
          </div>
        </div>

        {/* Right: Contact & Actions */}
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDate(lead.created_at)}
          </span>

          {hasContact ? (
            isUnlocked ? (
              <div className="text-right text-sm">
                {lead.contact_email && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{lead.contact_email}</span>
                  </div>
                )}
                {lead.contact_phone && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {lead.contact_phone}
                  </div>
                )}
              </div>
            ) : (
              <Button size="sm" className="gap-2">
                <Lock className="h-3 w-3" />
                Unlock Contact
              </Button>
            )
          ) : (
            <Badge variant="outline" className="text-xs">
              No contact yet
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function LeadDetailModal({
  lead,
  userType,
  onClose,
}: {
  lead: Lead;
  userType: string | null;
  onClose: () => void;
}) {
  const isUnlocked = userType === 'developer' || userType === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{lead.lot_plan}</h2>
              <p className="text-muted-foreground">{lead.locality}, {lead.lga}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{lead.subdivision_potential || 1}</p>
              <p className="text-xs text-muted-foreground">Lot Potential</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <Building2 className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{lead.area_sqm ? Math.round(lead.area_sqm).toLocaleString() : '-'}</p>
              <p className="text-xs text-muted-foreground">Area (m²)</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold">{lead.constraint_count}</p>
              <p className="text-xs text-muted-foreground">Constraints</p>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-3">Services Assessment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className={cn(
                "p-3 rounded-lg border",
                lead.water_available ? "bg-blue-500/10 border-blue-500/30" : "bg-muted/30"
              )}>
                <p className="text-sm font-medium">Water</p>
                <p className="text-xs text-muted-foreground">
                  {lead.water_available
                    ? `${lead.water_distance_m}m away`
                    : 'Not available within 150m'}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-lg border",
                lead.sewer_available
                  ? lead.sewer_location === 'rear' || lead.sewer_location === 'adjacent-lot'
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-green-500/10 border-green-500/30"
                  : "bg-muted/30"
              )}>
                <p className="text-sm font-medium">Sewer</p>
                <p className="text-xs text-muted-foreground">
                  {lead.sewer_available
                    ? `${lead.sewer_distance_m}m (${lead.sewer_location})`
                    : 'Not available within 150m'}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          {(lead.contact_email || lead.contact_phone) && (
            <div>
              <h3 className="font-semibold mb-3">Contact Information</h3>
              {isUnlocked ? (
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  {lead.contact_name && (
                    <p className="font-medium">{lead.contact_name}</p>
                  )}
                  {lead.contact_email && (
                    <p className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${lead.contact_email}`} className="text-blue-500 hover:underline">
                        {lead.contact_email}
                      </a>
                    </p>
                  )}
                  {lead.contact_phone && (
                    <p className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${lead.contact_phone}`} className="text-blue-500 hover:underline">
                        {lead.contact_phone}
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-6 text-center">
                  <Lock className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium">Contact info locked</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upgrade to Developer plan to unlock contact details
                  </p>
                  <Button className="gap-2">
                    <DollarSign className="h-4 w-4" />
                    Unlock for $49
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
