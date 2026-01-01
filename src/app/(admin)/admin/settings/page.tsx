import { createClient } from "@/lib/supabase/server";
import {
  Settings,
  Database,
  CreditCard,
  Shield,
  Server,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Package,
  Users,
  Download,
  HardDrive,
  Plug,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import Link from "next/link";
import { KlaviyoSync } from "@/components/admin/KlaviyoSync";

export const metadata = {
  title: "Settings | Soul Sample Club Admin",
};

async function getSystemStats() {
  const supabase = await createClient();

  const [
    packsResult,
    samplesResult,
    usersResult,
    downloadsResult,
    subsResult,
  ] = await Promise.all([
    supabase.from("packs").select("id", { count: "exact", head: true }),
    supabase.from("samples").select("id, file_size", { count: "exact" }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("downloads").select("id", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing"]),
  ]);

  // Calculate total storage
  const samples = samplesResult.data as { id: string; file_size: number }[] || [];
  const totalStorage = samples.reduce((acc, s) => acc + (s.file_size || 0), 0);

  return {
    totalPacks: packsResult.count || 0,
    totalSamples: samplesResult.count || 0,
    totalUsers: usersResult.count || 0,
    totalDownloads: downloadsResult.count || 0,
    activeSubscriptions: subsResult.count || 0,
    totalStorage,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default async function SettingsPage() {
  const stats = await getSystemStats();

  // Environment checks
  const envChecks = {
    supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    siteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
    patreon: !!process.env.PATREON_CLIENT_ID,
    klaviyo: !!process.env.KLAVIYO_PRIVATE_API_KEY,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-h1 text-snow mb-2">Settings</h1>
        <p className="text-body-lg text-snow/60">
          System configuration and external services
        </p>
      </div>

      {/* System Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            <StatItem
              label="Sample Packs"
              value={stats.totalPacks}
              icon={<Package className="w-4 h-4" />}
            />
            <StatItem
              label="Total Samples"
              value={stats.totalSamples}
              icon={<HardDrive className="w-4 h-4" />}
            />
            <StatItem
              label="Storage Used"
              value={formatBytes(stats.totalStorage)}
              icon={<Server className="w-4 h-4" />}
            />
            <StatItem
              label="Registered Users"
              value={stats.totalUsers}
              icon={<Users className="w-4 h-4" />}
            />
            <StatItem
              label="Active Subscriptions"
              value={stats.activeSubscriptions}
              icon={<CreditCard className="w-4 h-4" />}
            />
            <StatItem
              label="Total Downloads"
              value={stats.totalDownloads}
              icon={<Download className="w-4 h-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Environment Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Environment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <EnvCheck
              label="Supabase"
              description="Database and authentication"
              configured={envChecks.supabase}
            />
            <EnvCheck
              label="Stripe"
              description="Payment processing"
              configured={envChecks.stripe}
            />
            <EnvCheck
              label="Site URL"
              description="Public site URL configured"
              configured={envChecks.siteUrl}
            />
            <EnvCheck
              label="Patreon"
              description="Patreon OAuth integration"
              configured={envChecks.patreon}
            />
            <EnvCheck
              label="Klaviyo"
              description="Email marketing integration"
              configured={envChecks.klaviyo}
            />
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="w-5 h-5" />
            Integrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <KlaviyoSync isConfigured={envChecks.klaviyo} />
        </CardContent>
      </Card>

      {/* External Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            External Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ServiceLink
              name="Supabase Dashboard"
              description="Manage database, auth, and storage"
              href="https://supabase.com/dashboard"
            />
            <ServiceLink
              name="Stripe Dashboard"
              description="Manage subscriptions and payments"
              href="https://dashboard.stripe.com"
            />
            <ServiceLink
              name="Vercel Dashboard"
              description="Deployments and environment variables"
              href="https://vercel.com/dashboard"
            />
            <ServiceLink
              name="Patreon Dashboard"
              description="Manage Patreon integration"
              href="https://www.patreon.com/portal"
            />
            <ServiceLink
              name="Google Cloud Console"
              description="OAuth credentials"
              href="https://console.cloud.google.com"
            />
            <ServiceLink
              name="Meta Developers"
              description="Facebook OAuth settings"
              href="https://developers.facebook.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ActionCard
              title="Create New Pack"
              description="Add a new sample pack"
              href="/admin/packs/new"
            />
            <ActionCard
              title="View All Packs"
              description="Manage existing packs"
              href="/admin/packs"
            />
            <ActionCard
              title="View Analytics"
              description="Download and user trends"
              href="/admin/analytics"
            />
            <ActionCard
              title="Manage Users"
              description="View and filter users"
              href="/admin/users"
            />
            <ActionCard
              title="View Live Site"
              description="Open the public site"
              href="/"
              external
            />
            <ActionCard
              title="View Feed"
              description="See what users see"
              href="/feed"
              external
            />
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="!bg-velvet/10 !border-velvet/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-velvet/20 flex items-center justify-center flex-shrink-0">
              <Settings className="w-5 h-5 text-velvet" />
            </div>
            <div>
              <h3 className="text-body font-medium text-velvet mb-2">
                Need to change settings?
              </h3>
              <p className="text-snow/60 text-sm">
                Environment variables and configuration are managed through Vercel.
                Visit the Vercel Dashboard to update environment variables, manage
                domains, or configure deployments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-grey-700 flex items-center justify-center text-snow/60">
        {icon}
      </div>
      <div>
        <p className="text-h4 text-snow">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-caption text-snow/50">{label}</p>
      </div>
    </div>
  );
}

function EnvCheck({
  label,
  description,
  configured,
}: {
  label: string;
  description: string;
  configured: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-grey-700 last:border-0">
      <div>
        <p className="text-snow font-medium">{label}</p>
        <p className="text-snow/50 text-sm">{description}</p>
      </div>
      {configured ? (
        <div className="flex items-center gap-2 text-mint">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm">Configured</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-amber-500">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">Not configured</span>
        </div>
      )}
    </div>
  );
}

function ServiceLink({
  name,
  description,
  href,
}: {
  name: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-4 bg-grey-800 rounded-lg hover:bg-grey-700 transition-colors group"
    >
      <div>
        <p className="text-snow font-medium group-hover:text-velvet transition-colors">
          {name}
        </p>
        <p className="text-snow/50 text-sm">{description}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-snow/40 group-hover:text-velvet transition-colors" />
    </a>
  );
}

function ActionCard({
  title,
  description,
  href,
  external,
}: {
  title: string;
  description: string;
  href: string;
  external?: boolean;
}) {
  const content = (
    <div className="p-4 bg-grey-800 rounded-lg hover:bg-grey-700 transition-colors cursor-pointer group">
      <div className="flex items-center justify-between mb-2">
        <p className="text-snow font-medium group-hover:text-velvet transition-colors">
          {title}
        </p>
        {external && (
          <ExternalLink className="w-4 h-4 text-snow/40" />
        )}
      </div>
      <p className="text-snow/50 text-sm">{description}</p>
    </div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link href={href}>{content}</Link>;
}
