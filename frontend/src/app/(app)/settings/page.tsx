"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Settings,
  User,
  Bell,
  Map,
  Palette,
  Shield,
  HelpCircle,
  CreditCard,
  Crown,
  Check,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsSection = 'profile' | 'subscription' | 'notifications' | 'map' | 'appearance' | 'privacy';

interface SubscriptionInfo {
  tier: string;
  projectLimit: number;
  projectCount: number;
}

const TIER_FEATURES: Record<string, { name: string; price: string; features: string[]; highlighted?: boolean }> = {
  free: {
    name: 'Free',
    price: '$0',
    features: ['3 projects', 'Basic overlays', 'File imports', 'Community support'],
  },
  pro: {
    name: 'Pro',
    price: '$29/mo',
    features: ['25 projects', 'All overlays', 'Priority support', 'API access', 'Team sharing'],
    highlighted: true,
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    features: ['Unlimited projects', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'SSO/SAML'],
  },
};

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  // Load subscription info
  useEffect(() => {
    async function loadSubscription() {
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setSubscription({
            tier: data.tier || 'free',
            projectLimit: data.projectLimit || 3,
            projectCount: data.projects?.length || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load subscription info:', err);
      } finally {
        setIsLoadingSubscription(false);
      }
    }
    loadSubscription();
  }, []);

  const sections = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'subscription' as const, label: 'Subscription', icon: CreditCard },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'map' as const, label: 'Map Preferences', icon: Map },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'privacy' as const, label: 'Privacy', icon: Shield },
  ];

  return (
    <div className="h-full overflow-auto bg-muted/30">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/app">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Map
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Settings
            </h1>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === section.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 bg-background rounded-xl border p-6">
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Profile</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage your account details
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="Your name" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="your@email.com" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" placeholder="Company name" className="mt-1" />
                  </div>
                </div>

                <Button>Save Changes</Button>
              </div>
            )}

            {activeSection === 'subscription' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Subscription</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage your plan and billing
                  </p>
                </div>

                {isLoadingSubscription ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : subscription ? (
                  <>
                    {/* Current Plan */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Crown className={cn(
                            "h-5 w-5",
                            subscription.tier === 'free' ? "text-slate-500" :
                            subscription.tier === 'pro' ? "text-blue-500" : "text-purple-500"
                          )} />
                          <span className="font-semibold capitalize">{subscription.tier} Plan</span>
                        </div>
                        <Badge variant={subscription.tier === 'free' ? 'secondary' : 'default'}>
                          Current
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FolderOpen className="h-4 w-4" />
                        <span>
                          {subscription.projectCount} of {subscription.projectLimit === -1 ? '∞' : subscription.projectLimit} projects used
                        </span>
                      </div>
                      {subscription.projectLimit !== -1 && (
                        <div className="mt-2 w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all",
                              subscription.projectCount >= subscription.projectLimit ? "bg-destructive" : "bg-primary"
                            )}
                            style={{ width: `${Math.min(100, (subscription.projectCount / subscription.projectLimit) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Available Plans */}
                    <div>
                      <h3 className="font-medium mb-3">Available Plans</h3>
                      <div className="grid gap-4">
                        {Object.entries(TIER_FEATURES).map(([tierId, plan]) => (
                          <div
                            key={tierId}
                            className={cn(
                              "p-4 rounded-lg border-2 transition-colors",
                              subscription.tier === tierId
                                ? "border-primary bg-primary/5"
                                : plan.highlighted
                                ? "border-blue-200 bg-blue-50/50"
                                : "border-border"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{plan.name}</span>
                                {plan.highlighted && subscription.tier !== tierId && (
                                  <Badge variant="secondary" className="text-xs">Popular</Badge>
                                )}
                              </div>
                              <span className="font-bold">{plan.price}</span>
                            </div>
                            <ul className="space-y-1.5 mb-3">
                              {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                            {subscription.tier === tierId ? (
                              <Button variant="outline" size="sm" disabled className="w-full">
                                Current Plan
                              </Button>
                            ) : tierId === 'enterprise' ? (
                              <Button variant="outline" size="sm" className="w-full">
                                Contact Sales
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="w-full"
                                variant={plan.highlighted ? 'default' : 'outline'}
                              >
                                {tierId === 'free' ? 'Downgrade' : 'Upgrade'}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Unable to load subscription information.</p>
                )}
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Notifications</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure how you receive updates
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Property Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when saved properties have updates
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">DA Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Alerts for new development applications nearby
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Digest</p>
                      <p className="text-sm text-muted-foreground">
                        Summary of activity on your saved sites
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'map' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Map Preferences</h2>
                  <p className="text-sm text-muted-foreground">
                    Customize your map experience
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Remember Map Position</p>
                      <p className="text-sm text-muted-foreground">
                        Return to your last viewed location
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show Cadastre by Default</p>
                      <p className="text-sm text-muted-foreground">
                        Display property boundaries on load
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-load Constraints</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically query constraints when selecting properties
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Appearance</h2>
                  <p className="text-sm text-muted-foreground">
                    Customize the look and feel
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="font-medium mb-2">Theme</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Use the theme toggle in the toolbar to switch between light and dark modes.
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Compact UI</p>
                      <p className="text-sm text-muted-foreground">
                        Use smaller controls and panels
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Privacy</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage your data and privacy settings
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Analytics</p>
                      <p className="text-sm text-muted-foreground">
                        Help improve Siteora with usage data
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2 text-destructive">Danger Zone</h3>
                  <Button variant="destructive" size="sm">
                    Delete All Saved Data
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Help */}
        <div className="mt-8 p-4 bg-muted/50 rounded-xl flex items-center gap-4">
          <HelpCircle className="h-8 w-8 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium">Need Help?</p>
            <p className="text-sm text-muted-foreground">
              Check our documentation or contact support
            </p>
          </div>
          <Button variant="outline" size="sm">
            View Docs
          </Button>
        </div>
      </div>
    </div>
  );
}
