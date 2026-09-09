'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, SectionHeader, Button, Card, CardContent, EmptyState, Tabs, TabsList, TabsTrigger, TabsContent } from '@hapcargo/ui';
import { User, Settings as SettingsIcon, Globe, Bell, Shield, Building, MapPin, Plug, Hash, Zap, LayoutTemplate, History } from '@hapcargo/ui';
import { NAMESPACES } from '@/i18n';

const settingsTabs = [
  { key: 'profile', label: 'Profile', icon: User, description: 'Manage your personal information and preferences.' },
  { key: 'preferences', label: 'Preferences', icon: SettingsIcon, description: 'Configure your interface and behavior preferences.' },
  { key: 'language', label: 'Language', icon: Globe, description: 'Set your preferred interface language.' },
  { key: 'notifications', label: 'Notifications', icon: Bell, description: 'Manage notification preferences and channels.' },
  { key: 'security', label: 'Security', icon: Shield, description: 'Password, two-factor authentication, and sessions.' },
  { key: 'company', label: 'Company', icon: Building, description: 'Company details, branding, and organization.' },
  { key: 'branch', label: 'Branch', icon: MapPin, description: 'Branch/Depot configuration and settings:' },
  { key: 'integrations', label: 'Integrations', icon: Plug, description: 'Third-party system connections and APIs.' },
  { key: 'numbering', label: 'Numbering', icon: Hash, description: 'Document and entity numbering sequences.' },
  { key: 'documents', label: 'Documents', icon: LayoutTemplate, description: 'Document templates and output configuration.' },
  { key: 'automation', label: 'Automation', icon: Zap, description: 'Workflow automation and business rules.' },
  { key: 'system', label: 'System', icon: SettingsIcon, description: 'Global system configuration and maintenance.' },
  { key: 'audit', label: 'Audit Log', icon: History, description: 'View system audit trail and change history.' },
];

export default function SettingsPage() {
  const { t } = useTranslation(NAMESPACES);
  const [activeTab, setActiveTab] = React.useState('profile');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('settings:title')}
        description={t('settings:profile')}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1">
          {settingsTabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="flex flex-col items-start gap-1 p-3 text-left h-auto">
              <tab.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {settingsTabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="mt-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <tab.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{tab.label}</h3>
                <p className="text-muted-foreground mt-1">{tab.description}</p>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {tab.key === 'profile' && (
                    <>
                      <SectionHeader title="Personal Information" />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium mb-1">Full Name</label>
                          <input type="text" className="w-full h-9 px-3 border rounded-md" placeholder="John Doe" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Email</label>
                          <input type="email" className="w-full h-9 px-3 border rounded-md" placeholder="john@company.com" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Phone</label>
                          <input type="tel" className="w-full h-9 px-3 border rounded-md" placeholder="+40 7xx xxx xxx" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Title / Role</label>
                          <input type="text" className="w-full h-9 px-3 border rounded-md" placeholder="Operations Manager" />
                        </div>
                      </div>
                      <Button>Save Changes</Button>
                    </>
                  )}

                  {tab.key === 'preferences' && (
                    <>
                      <SectionHeader title="Interface Preferences" />
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Compact Mode</p>
                            <p className="text-sm text-muted-foreground">Use tighter spacing for higher information density</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:bg-white after:rounded-full after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Animations</p>
                            <p className="text-sm text-muted-foreground">Enable UI transitions and animations</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:bg-white after:rounded-full after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Reduce Motion</p>
                            <p className="text-sm text-muted-foreground">Minimize animations for accessibility</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:bg-white after:rounded-full after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {tab.key === 'language' && (
                    <>
                      <SectionHeader title="Interface Language" />
                      <p className="text-muted-foreground mb-4">Select your preferred language for the application interface.</p>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {['en', 'ro', 'nl', 'pl', 'fr', 'es'].map((locale) => {
                          const names: Record<string, string> = { en: 'English', ro: 'Română', nl: 'Nederlands', pl: 'Polski', fr: 'Français', es: 'Español' };
                          return (
                            <Button
                              key={locale}
                              variant="outline"
                              className="w-full justify-start gap-3"
                              onClick={() => {}}
                            >
                              <span className="w-8 h-5 rounded border bg-muted flex items-center justify-center text-xs font-medium">
                                {locale.toUpperCase()}
                              </span>
                              <span>{names[locale]}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {tab.key === 'notifications' && (
                    <>
                      <SectionHeader title="Notification Preferences" />
                      <div className="space-y-4">
                        {['Email', 'Push', 'In-App', 'SMS'].map((channel) => (
                          <div key={channel} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <span className="text-lg">??</span>
                              </div>
                              <div>
                                <p className="font-medium">{channel} Notifications</p>
                                <p className="text-sm text-muted-foreground">Receive {channel.toLowerCase()} notifications for updates</p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" defaultChecked={channel !== 'SMS'} className="sr-only peer" />
                              <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:bg-white after:rounded-full after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {tab.key === 'security' && (
                    <>
                      <SectionHeader title="Password" />
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Current Password</label>
                          <input type="password" className="w-full h-9 px-3 border rounded-md" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">New Password</label>
                          <input type="password" className="w-full h-9 px-3 border rounded-md" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                          <input type="password" className="w-full h-9 px-3 border rounded-md" />
                        </div>
                        <Button variant="outline">Update Password</Button>
                      </div>
                      <SectionHeader title="Two-Factor Authentication" />
                      <p className="text-muted-foreground mb-4">Add an extra layer of security to your account.</p>
                      <Button variant="outline">Enable 2FA</Button>
                    </>
                  )}

                  {['company', 'branch', 'integrations', 'numbering', 'documents', 'automation', 'system', 'audit'].includes(tab.key) && (
                    <EmptyState
                      title={`${tab.label} Settings`}
                      description="This settings section will be implemented in a future release."
                      icon={<tab.icon className="h-8 w-8" />}
                      size="md"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

