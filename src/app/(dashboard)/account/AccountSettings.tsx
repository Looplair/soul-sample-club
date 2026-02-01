"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  CreditCard,
  Key,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Link2,
  Unlink,
  LogOut,
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
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 sm:gap-2 border-b border-grey-700 overflow-x-auto">
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
      <div className="max-w-2xl">
        {activeTab === "profile" && <ProfileTab profile={profile} />}
        {activeTab === "billing" && <BillingTab subscription={subscription} patreonLink={patreonLink} />}
        {activeTab === "password" && <PasswordTab />}
      </div>
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
        flex items-center gap-2 px-3 sm:px-4 py-3 text-sm sm:text-base whitespace-nowrap transition-all
        border-b-2 -mb-[2px]
        ${
          active
            ? "border-white text-white"
            : "border-transparent text-text-muted hover:text-white"
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-error/10 border border-error/50 rounded-lg p-3 text-error text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-success/10 border border-success/50 rounded-lg p-3 text-success text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
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

  const isStripeActive = subscription?.status === "active" || subscription?.status === "trialing";
  const hasPatreonAccess = patreonLink?.is_active;
  const hasDualSubscription = isStripeActive && hasPatreonAccess;

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/create-portal-session", {
        method: "POST",
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        console.error("Portal session error:", data.error);
        alert("Unable to open billing portal. Please try again or contact support.");
      }
    } catch (error) {
      console.error("Error opening billing portal:", error);
      alert("Unable to open billing portal. Please try again.");
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

  const hasNoAccess = !isStripeActive && !hasPatreonAccess;

  return (
    <div className="space-y-6">
      {/* No subscription info nudge */}
      {hasNoAccess && (
        <div className="bg-grey-800/50 border border-grey-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-white/70 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium mb-1">Choose how to subscribe</p>
              <p className="text-sm text-text-muted">
                You only need <span className="text-white">one</span> subscription method to access downloads.
                Either subscribe directly below, or connect your existing Patreon membership.
                No need to do both.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dual Subscription Warning */}
      {hasDualSubscription && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-warning font-medium mb-1">You have both subscriptions active</p>
              <p className="text-sm text-text-muted">
                You&apos;re currently paying for both a direct Stripe subscription and Patreon membership.
                You only need one to access downloads. Consider canceling one to avoid double billing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-grey-800 rounded-lg">
                <div>
                  <p className="text-xs text-text-muted mb-1">Status</p>
                  <div className="flex items-center gap-2">
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
                    {subscription.cancel_at_period_end && subscription.status === "trialing" && (
                      <span className="text-xs text-warning">
                        Trial canceled
                      </span>
                    )}
                    {subscription.cancel_at_period_end && subscription.status !== "trialing" && (
                      <span className="text-xs text-warning">
                        Cancels at period end
                      </span>
                    )}
                  </div>
                </div>
                {isStripeActive && (
                  <div className="sm:text-right">
                    <p className="text-xs text-text-muted mb-1">
                      {subscription.status === "trialing" ? "Trial ends" : "Next billing date"}
                    </p>
                    <p className="text-sm text-white">
                      {formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                )}
              </div>

              {/* Canceled trial notice */}
              {subscription.status === "trialing" && subscription.cancel_at_period_end && (
                <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-warning font-medium mb-1">Your access ends on {formatDate(subscription.current_period_end)}</p>
                      <p className="text-sm text-text-muted">
                        Your trial has been canceled. You&apos;ll retain access until the trial period ends.
                        After that, you&apos;ll need to subscribe for continued access.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Canceled subscription (non-trial) notice */}
              {subscription.status !== "trialing" && subscription.cancel_at_period_end && (
                <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-warning font-medium mb-1">Your subscription ends on {formatDate(subscription.current_period_end)}</p>
                      <p className="text-sm text-text-muted">
                        You&apos;ll retain access until the end of your current billing period. You can resubscribe anytime.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Post-cancellation: status is canceled */}
              {subscription.status === "canceled" && (
                <div className="p-4 bg-grey-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-text-muted flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium mb-1">Subscription ended</p>
                      <p className="text-sm text-text-muted">
                        Your subscription has ended. Subscribe again to regain access to downloads.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-grey-800 rounded-lg">
                  <p className="text-xs text-text-muted mb-1">Current Period Start</p>
                  <p className="text-sm text-white">
                    {formatDate(subscription.current_period_start)}
                  </p>
                </div>
                <div className="p-4 bg-grey-800 rounded-lg">
                  <p className="text-xs text-text-muted mb-1">Current Period End</p>
                  <p className="text-sm text-white">
                    {formatDate(subscription.current_period_end)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleManageBilling}
                  isLoading={isLoading}
                  rightIcon={<ExternalLink className="w-4 h-4" />}
                >
                  Manage Billing
                </Button>
                {isStripeActive && !subscription.cancel_at_period_end && (
                  <Button
                    variant="ghost"
                    onClick={handleManageBilling}
                    className="text-text-muted hover:text-error"
                  >
                    Cancel Subscription
                  </Button>
                )}
                {!isStripeActive && (
                  <Button
                    onClick={handleSubscribe}
                    isLoading={isLoading}
                  >
                    Subscribe Again
                  </Button>
                )}
              </div>
              <p className="text-xs text-text-subtle mt-2">
                Manage billing, update payment method, or cancel your subscription through Stripe.
              </p>
            </div>
          ) : hasPatreonAccess ? (
            <div className="py-6">
              <div className="flex items-start gap-3 p-4 bg-success/10 border border-success/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium mb-1">You&apos;re subscribed via Patreon</p>
                  <p className="text-sm text-text-muted">
                    Your active Patreon pledge gives you full download access. No additional subscription needed.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-text-muted mb-4">
                You don&apos;t have an active subscription.
              </p>
              <Button onClick={handleSubscribe} isLoading={isLoading}>
                Subscribe to Download
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-grey-800 rounded-lg">
                <div className="min-w-0">
                  <p className="text-xs text-text-muted mb-1">Connected Account</p>
                  <p className="text-sm text-white truncate">{patreonLink.patreon_email}</p>
                </div>
                <Badge variant={patreonLink.is_active ? "success" : "warning"} className="flex-shrink-0">
                  {patreonLink.is_active ? "Active Patron" : "Not Active"}
                </Badge>
              </div>
              {!patreonLink.is_active && (
                <p className="text-sm text-text-muted">
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
              <p className="text-sm text-text-muted mb-4">
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
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
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

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-error/10 border border-error/50 rounded-lg p-3 text-error text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="bg-success/10 border border-success/50 rounded-lg p-3 text-success text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
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

      {/* Sign Out Section */}
      <Card>
        <CardHeader>
          <CardTitle>Sign Out</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted mb-4">
            Sign out of your account on this device.
          </p>
          <Button
            variant="danger"
            onClick={handleSignOut}
            isLoading={isSigningOut}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
