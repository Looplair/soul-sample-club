import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Users | Soul Sample Club Admin",
};

// ------------------------------
// TYPE DEFINITIONS
// ------------------------------
interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
  subscription: Array<{
    status: string;
    current_period_end: string;
  }> | null;
}

// ------------------------------
// DATA FETCHING
// ------------------------------
async function getUsers(): Promise<UserRow[]> {
  const supabase = await createClient();

  const result = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      full_name,
      is_admin,
      created_at,
      subscription:subscriptions(status, current_period_end)
    `
    )
    .order("created_at", { ascending: false });

  const profiles = result.data as UserRow[] | null;

  if (!profiles) {
    return [];
  }

  return profiles;
}

async function getDownloadCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();

  const { data } = await supabase.from("downloads").select("user_id");

  if (!data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    const userId = row.user_id as string;
    counts[userId] = (counts[userId] || 0) + 1;
  }

  return counts;
}

// ------------------------------
// PAGE COMPONENT
// ------------------------------
export default async function AdminUsersPage() {
  const [users, downloadCounts] = await Promise.all([
    getUsers(),
    getDownloadCounts(),
  ]);

  return (
    <div className="space-y-32">
      <div>
        <h1 className="text-h1 text-snow mb-8">Users</h1>
        <p className="text-body-lg text-snow/60">
          Manage platform users and their subscriptions
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {users.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Subscription</th>
                    <th>Downloads</th>
                    <th>Joined</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const subscription = user.subscription?.[0];
                    const isActive =
                      subscription?.status === "active" ||
                      subscription?.status === "trialing";

                    return (
                      <tr key={user.id}>
                        <td>
                          <div>
                            <p className="text-snow font-medium">
                              {user.full_name || "No name"}
                            </p>
                            <p className="text-caption text-snow/50">
                              {user.email}
                            </p>
                          </div>
                        </td>
                        <td>
                          {subscription ? (
                            <div>
                              <Badge
                                variant={
                                  subscription.status === "active"
                                    ? "success"
                                    : subscription.status === "trialing"
                                    ? "primary"
                                    : "warning"
                                }
                              >
                                {subscription.status}
                              </Badge>
                              {isActive && (
                                <p className="text-caption text-snow/50 mt-4">
                                  Until {formatDate(subscription.current_period_end)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-snow/50">No subscription</span>
                          )}
                        </td>
                        <td className="text-snow/70">
                          {downloadCounts[user.id] || 0}
                        </td>
                        <td className="text-snow/50 text-caption">
                          {formatDate(user.created_at)}
                        </td>
                        <td>
                          {user.is_admin ? (
                            <Badge variant="primary">Admin</Badge>
                          ) : (
                            <span className="text-snow/50">User</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-48">
              <p className="text-body text-snow/60">No users yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
