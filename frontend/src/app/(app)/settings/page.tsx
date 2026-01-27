"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Settings,
  User,
  Bell,
  Map,
  Palette,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsSection = 'profile' | 'notifications' | 'map' | 'appearance' | 'privacy';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  const sections = [
    { id: 'profile' as const, label: 'Profile', icon: User },
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
