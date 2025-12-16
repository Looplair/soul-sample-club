"use client";

import { useState } from "react";
import {
  User,
  CreditCard,
  Key,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Link2,
  Unlink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Profile, Subscription, PatreonLink } from "@/types/database";

interface AccountSettingsProps {
  profile: Profile;
  subscription: Subscription | null;
  patreonLink?: PatreonLink | null;
}

export function AccountSettings({ profile, subscription, patreonLink }: AccountSettingsProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "billing" | "password">("profile");

  return (
    <div className="space-y-32">
      {/* Tab Navigation */}
      <div className="flex gap-8 border-b border-steel pb-2">
        <TabButton
          active={activeTab === "profile"}
          onClick={() => setActiveTab("profile")}
          icon={<User className="w-4 h-4" />}
        >
          Profile
        </TabButton>
        <TabButton
          active={activeTab === "billing"}
          onClick={() => setActiveTab("billing")}
          icon={<CreditCard className="w-4 h-4" />}
        >
          Billing
        </TabButton>
        <TabButton
          active={activeTab === "password"}
          onClick={() => setActiveTab("password")}
          icon={<Key className="w-4 h-4" />}
        >
          Password
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === "profile" && <ProfileTab profile={profile} />}
      {activeTab === "billing" && <BillingTab subscription={subscription} patreonLink={patreonLink} />}
      {activeTab === "password" && <PasswordTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-8 px-16 py-12 text-body transition-all
        border-b-2 -mb-[2px]
        ${
          active
            ? "border-velvet text-velvet-light"
            : "border-transparent text-snow/60 hover:text-snow"
        }
      `}
    >
      {icon}
      {children}
    </button>
  );
}

function ProfileTab({ profile }: { profile: Profile }) {
  const supabase = createClient();
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [username, setUsername] = useState(profile.username || "");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("profiles") as any)
        .update({ full_name: fullName, username: username || null })
        .eq("id", profile.id);

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-24">
          {error && (
            <div className="bg-error/10 border border-error/50 rounded-button p-12 text-error text-body flex items-center gap-8">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-success/10 border border-success/50 rounded-button p-12 text-success text-body flex items-center gap-8">
              <CheckCircle className="w-4 h-4" />
              Profile updated successfully
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={profile.email}
            disabled
            hint="Email cannot be changed"
          />

          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username for chat"
          />

          <Input
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
          />

          <Button type="submit" isLoading={isLoading}>
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function BillingTab({ subscription, patreonLink }: { subscription: Subscription | null; patreonLink?: PatreonLink | null }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPatreonLoading, setIsPatreonLoading] = useState(false);

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/create-portal-session", {
        method: "POST",
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error opening billing portal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectPatreon = () => {
    window.location.href = "/api/patreon/connect";
  };

  const handleDisconnectPatreon = async () => {
    setIsPatreonLoading(true);
    try {
      await fetch("/api/patreon/disconnect", { method: "POST" });
      window.location.reload();
    } catch (error) {
      console.error("Error disconnecting Patreon:", error);
    } finally {
      setIsPatreonLoading(false);
    }
  };

  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  const hasPatreonAccess = patreonLink?.is_active;

  return (
    <div className="space-y-6">
      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-24">
              {/* Status */}
              <div className="flex items-center justify-between p-16 bg-midnight rounded-card">
                <div>
                  <p className="text-label text-snow/50 mb-4">Status</p>
                  <div className="flex items-center gap-12">
                    <Badge
                      variant={
                        subscription.status === "active"
                          ? "success"
                          : subscription.status === "trialing"
                          ? "primary"
                          : "warning"
                      }
                    >
                      {subscription.status === "trialing" ? "Trial" : subscription.status}
                    </Badge>
                    {subscription.cancel_at_period_end && (
                      <span className="text-caption text-warning">
                        Cancels at period end
                      </span>
                    )}
                  </div>
                </div>
                {isActive && (
                  <div className="text-right">
                    <p className="text-label text-snow/50 mb-4">
                      {subscription.status === "trialing" ? "Trial ends" : "Next billing date"}
                    </p>
                    <p className="text-body text-snow">
                      {formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                )}
              </div>

              {/* Billing Period */}
              <div className="grid grid-cols-2 gap-16">
                <div className="p-16 bg-midnight rounded-card">
                  <p className="text-label text-snow/50 mb-4">Current Period Start</p>
                  <p className="text-body text-snow">
                    {formatDate(subscription.current_period_start)}
                  </p>
                </div>
                <div className="p-16 bg-midnight rounded-card">
                  <p className="text-label text-snow/50 mb-4">Current Period End</p>
                  <p className="text-body text-snow">
                    {formatDate(subscription.current_period_end)}
                  </p>
                </div>
              </div>

              {/* Manage Button */}
              <Button
                onClick={handleManageBilling}
                isLoading={isLoading}
                rightIcon={<ExternalLink className="w-4 h-4" />}
              >
                Manage Billing
              </Button>
            </div>
          ) : (
            <div className="text-center py-24">
              <p className="text-body text-snow/60 mb-24">
                You don&apos;t have an active subscription.
              </p>
              <Button onClick={handleSubscribe} isLoading={isLoading}>
                Start Free Trial
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patreon Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003"/>
            </svg>
            Patreon Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patreonLink ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-midnight rounded-card">
                <div>
                  <p className="text-label text-snow/50 mb-1">Connected Account</p>
                  <p className="text-body text-snow">{patreonLink.patreon_email}</p>
                </div>
                <Badge variant={hasPatreonAccess ? "success" : "warning"}>
                  {hasPatreonAccess ? "Active Patron" : "Not Active"}
                </Badge>
              </div>
              {!hasPatreonAccess && (
                <p className="text-body-sm text-text-muted">
                  Your Patreon account is connected but you don&apos;t have an active pledge.
                  Subscribe on Patreon to get access.
                </p>
              )}
              <Button
                variant="secondary"
                onClick={handleDisconnectPatreon}
                isLoading={isPatreonLoading}
                leftIcon={<Unlink className="w-4 h-4" />}
              >
                Disconnect Patreon
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-body text-snow/60 mb-4">
                Link your Patreon account to get access as an active patron.
              </p>
              <Button
                onClick={handleConnectPatreon}
                leftIcon={<Link2 className="w-4 h-4" />}
              >
                Connect Patreon
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordTab() {
  const supabase = createClient();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-24">
          {error && (
            <div className="bg-error/10 border border-error/50 rounded-button p-12 text-error text-body flex items-center gap-8">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-success/10 border border-success/50 rounded-button p-12 text-success text-body flex items-center gap-8">
              <CheckCircle className="w-4 h-4" />
              Password updated successfully
            </div>
          )}

          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
          />

          <Button type="submit" isLoading={isLoading}>
            Update Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
