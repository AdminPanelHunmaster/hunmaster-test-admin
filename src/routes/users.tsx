import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { UserDrawer } from "@/components/admin/UserDrawer";
import { UsersTable } from "@/components/admin/UsersTable";
import { useAdminUsers, useUserStatusMutation } from "@/hooks/useAdminBackend";
import type { UserStatus } from "@/lib/data";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Пользователи - HunMaster Admin" },
      {
        name: "description",
        content: "Управление учениками HunMaster через Supabase.",
      },
      { property: "og:title", content: "Пользователи - HunMaster Admin" },
      { property: "og:description", content: "Управление учениками HunMaster через Supabase." },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const usersQuery = useAdminUsers();
  const statusMutation = useUserStatusMutation();
  const users = usersQuery.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = users.find((user) => user.id === selectedId) ?? null;

  const handleStatus = (id: string, status: UserStatus) => {
    void statusMutation.mutateAsync({ userId: id, status });
  };

  return (
    <AdminLayout
      title="Пользователи"
      subtitle={users.length === 0 ? "Пользователей пока нет" : `${users.length} учеников в базе`}
    >
      {usersQuery.error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {usersQuery.error.message}
        </div>
      )}
      <UsersTable users={users} onSelect={(user) => setSelectedId(user.id)} />
      <UserDrawer
        user={selected}
        onClose={() => setSelectedId(null)}
        onStatusChange={handleStatus}
        onDelete={(id) => handleStatus(id, "blocked")}
      />
    </AdminLayout>
  );
}
