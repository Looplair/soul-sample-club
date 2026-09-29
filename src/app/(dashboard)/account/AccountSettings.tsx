"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  CreditCard,
  Key,
  ExternalLink,
  Link2,
  Unlink,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDate } from "@/lib/utils";
import { GlassBox } from "@/components/ssc/Glass";
import { ActionButton, Field, Notice, StatusChip } from "@/components/member/MemberUI";
import type { Profile, Subscription, PatreonLink } from "@/types/database";

interface AccountSettingsProps {
  profile: Profile;
  subscription: Subscription | null;
  patreonLink?: PatreonLink | null;
}

export function AccountSettings({ profile, subscription, patreonLink }: AccountSettingsProps) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") as "profile" | "billing" | "password" | null;
  const [activeTab, setActiveTab] = useState<"profile" | "billing" | "password">(
    initialTab && ["profile", "billing", "password"].includes(initialTab) ? initialTab : "profile"
  );

  // Update tab when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab") as "profile" | "billing" | "password" | null;
    if (tab && ["profile", "billing", "password"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex w-fit max-w-full overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-1" role="tablist">
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
      <div className="max-w-3xl">
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
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors sm:px-4",
        active ? "bg-white text-black" : "text-white/75 hover:text-white"
      )}
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
    <Panel title="Profile">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Notice tone="warning">{error}</Notice>}
        {success && <Notice tone="success">Profile updated</Notice>}

        <Field label="Email" type="email" value={profile.email} disabled hint="Email can't be changed" />

        <Field
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Choose a username for chat"
        />

        <Field
          label="Full name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Enter your full name"
        />

        <ActionButton type="submit" isLoading={isLoading}>
          Save changes
        </ActionButton>
      </form>
    </Panel>
  );
}

/** One idea per box: a glass panel with a small display heading */
function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <GlassBox plain className="rounded-[24px] p-5 sm:p-8">
      <h2 className="ssc-display flex items-center gap-2.5 text-[clamp(1.1rem,1.8vw,1.35rem)]">
        {icon}
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </GlassBox>
  );
}

/** Label over value, for dates and account details */
function Detail({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5", className)}>
      <p className="ssc-label">{label}</p>
      <div className="mt-1.5 text-[14px] text-white">{children}</div>
    </div>
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

  const handleSubscribe = async (plan: "monthly" | "yearly" = "monthly") => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
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
    <div className="space-y-5">
      {/* No subscription info nudge */}
      {hasNoAccess && (
        <Notice title="Choose how to subscribe">
          You only need <span className="font-semibold text-white">one</span> subscription method to access downloads.
          Either subscribe directly below, or connect your existing Patreon membership. No need to do both.
        </Notice>
      )}

      {/* Dual Subscription Warning */}
      {hasDualSubscription && (
        <Notice tone="warning" title="You have both subscriptions active">
          You&apos;re currently paying for both a direct Stripe subscription and a Patreon membership.
          You only need one to access downloads. Consider canceling one to avoid double billing.
        </Notice>
      )}

      {/* Subscription */}
      <Panel title="Subscription" icon={<CreditCard className="h-5 w-5" />}>
        {subscription ? (
          <div className="space-y-4">
            {/* Status */}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="ssc-label">Status</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusChip strong={subscription.status === "active" || subscription.status === "trialing"}>
                    {subscription.status === "trialing" ? "Trial" : subscription.status}
                  </StatusChip>
                  {subscription.cancel_at_period_end && subscription.status === "trialing" && (
                    <span className="text-[12px] text-white/75">Trial canceled</span>
                  )}
                  {subscription.cancel_at_period_end && subscription.status !== "trialing" && (
                    <span className="text-[12px] text-white/75">Cancels at period end</span>
                  )}
                </div>
              </div>
              {isStripeActive && (
                <div className="sm:text-right">
                  <p className="ssc-label">
                    {subscription.status === "trialing" ? "Trial ends" : "Next billing date"}
                  </p>
                  <p className="mt-1.5 text-[14px] text-white">{formatDate(subscription.current_period_end)}</p>
                </div>
              )}
            </div>

            {/* Canceled trial notice */}
            {subscription.status === "trialing" && subscription.cancel_at_period_end && (
              <Notice tone="warning" title={`Your access ends on ${formatDate(subscription.current_period_end)}`}>
                Your trial has been canceled. You&apos;ll keep access until the trial period ends.
                After that, you&apos;ll need to subscribe for continued access.
              </Notice>
            )}

            {/* Canceled subscription (non-trial) notice */}
            {subscription.status !== "trialing" && subscription.cancel_at_period_end && (
              <Notice tone="warning" title={`Your subscription ends on ${formatDate(subscription.current_period_end)}`}>
                You&apos;ll keep access until the end of your current billing period. You can resubscribe anytime.
              </Notice>
            )}

            {/* Post-cancellation: status is canceled */}
            {subscription.status === "canceled" && (
              <Notice title="Subscription ended">
                Your subscription has ended. Subscribe again to regain access to downloads.
              </Notice>
            )}

            {/* Billing Period */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Detail label="Current period start">{formatDate(subscription.current_period_start)}</Detail>
              <Detail label="Current period end">{formatDate(subscription.current_period_end)}</Detail>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <ActionButton
                variant={isStripeActive ? "primary" : "ghost"}
                onClick={handleManageBilling}
                isLoading={isLoading}
                icon={<ExternalLink className="h-4 w-4" />}
              >
                Manage billing
              </ActionButton>
              {!isStripeActive && (
                <ActionButton onClick={() => handleSubscribe("monthly")} isLoading={isLoading}>
                  Subscribe again
                </ActionButton>
              )}
            </div>
            <p className="text-[13px] text-white/55">
              Manage billing, update your payment method, or cancel your subscription through Stripe.
            </p>
          </div>
        ) : hasPatreonAccess ? (
          <Notice tone="success" title="You're subscribed via Patreon">
            Your active Patreon pledge gives you full download access. No additional subscription needed.
          </Notice>
        ) : (
          <div className="flex flex-col items-start gap-4">
            <p className="ssc-body text-[15px]">You don&apos;t have an active subscription.</p>
            <ActionButton onClick={() => handleSubscribe("monthly")} isLoading={isLoading}>
              Subscribe to download
            </ActionButton>
            <button
              type="button"
              onClick={() => handleSubscribe("yearly")}
              disabled={isLoading}
              className="text-[14px] text-white/75 underline underline-offset-4 transition-colors hover:text-white disabled:opacity-60"
            >
              or <s className="text-white/55">$49</s> <span className="font-semibold text-white">$35/year</span>, locked in for life
            </button>
          </div>
        )}
      </Panel>

      {/* Patreon */}
      <Panel
        title="Patreon access"
        icon={
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003"/>
          </svg>
        }
      >
        {patreonLink ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="ssc-label">Connected account</p>
                <p className="mt-1.5 truncate text-[14px] text-white">{patreonLink.patreon_email}</p>
              </div>
              <span className="flex-shrink-0">
                <StatusChip strong={!!patreonLink.is_active}>{patreonLink.is_active ? "Active patron" : "Not active"}</StatusChip>
              </span>
            </div>
            {!patreonLink.is_active && (
              <p className="ssc-body text-[14px]">
                Your Patreon account is connected but you don&apos;t have an active pledge.
                Subscribe on Patreon to get access.
              </p>
            )}
            <ActionButton
              variant="ghost"
              onClick={handleDisconnectPatreon}
              isLoading={isPatreonLoading}
              icon={<Unlink className="h-4 w-4" />}
            >
              Disconnect Patreon
            </ActionButton>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4">
            <p className="ssc-body text-[15px]">Link your Patreon account to get access as an active patron.</p>
            <ActionButton variant="ghost" onClick={handleConnectPatreon} icon={<Link2 className="h-4 w-4" />}>
              Connect Patreon
            </ActionButton>
          </div>
        )}
      </Panel>

      {/* Help Section */}
      <Panel title="Need help?">
        <div className="space-y-2">
          {[
            {
              q: "I've paid but don't have access",
              a: (
                <>
                  Sometimes it takes a moment for access to sync. Try refreshing the page. If you still don&apos;t have access, email us at{" "}
                  <a href="mailto:hello@soulsampleclub.com" className="font-medium text-white underline underline-offset-4">
                    hello@soulsampleclub.com
                  </a>{" "}
                  and we&apos;ll sort it out straight away.
                </>
              ),
            },
            {
              q: "Can I switch from Patreon to a direct subscription?",
              a: "Yes. Cancel your Patreon pledge, then subscribe directly here. You only need one active subscription for full access.",
            },
            {
              q: "My payment failed but I have funds available",
              a: (
                <>
                  This can happen with international cards or new subscriptions. Click &quot;Manage billing&quot; to update your payment method, or try a different card. Still having issues? Email{" "}
                  <a href="mailto:hello@soulsampleclub.com" className="font-medium text-white underline underline-offset-4">
                    hello@soulsampleclub.com
                  </a>
                </>
              ),
            },
          ].map((item) => (
            <details key={item.q} className="group rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 open:border-white/20">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-semibold text-white [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="text-[18px] leading-none text-white/55 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="ssc-body mt-3 text-[14px] leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </Panel>
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
    <div className="space-y-5">
      <Panel title="Change password" icon={<Key className="h-5 w-5" />}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Notice tone="warning">{error}</Notice>}
          {success && <Notice tone="success">Password updated</Notice>}

          <Field
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
          />

          <Field
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
          />

          <ActionButton type="submit" isLoading={isLoading}>
            Update password
          </ActionButton>
        </form>
      </Panel>

      {/* Sign Out Section */}
      <Panel title="Sign out" icon={<LogOut className="h-5 w-5" />}>
        <p className="ssc-body text-[15px]">Sign out of your account on this device.</p>
        <ActionButton
          variant="ghost"
          className="mt-5"
          onClick={handleSignOut}
          isLoading={isSigningOut}
          icon={<LogOut className="h-4 w-4" />}
        >
          Sign out
        </ActionButton>
      </Panel>
    </div>
  );
}
