import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { UsersTable } from "@/components/admin/UsersTable";
import { UserDrawer } from "@/components/admin/UserDrawer";
import { mockUsers, type AdminUser, type UserStatus } from "@/lib/data";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Пользователи — HunMaster Admin" },
      {
        name: "description",
        content: "Управление учениками HunMaster: статусы доступа, курсы и профили.",
      },
      { property: "og:title", content: "Пользователи — HunMaster Admin" },
      {
        property: "og:description",
        content: "Управление учениками HunMaster: статусы доступа, курсы и профили.",
      },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>(mockUsers);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const handleStatus = (id: string, status: UserStatus) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
    setSelected((s) => (s && s.id === id ? { ...s, status } : s));
  };

  return (
    <AdminLayout
      title="Пользователи"
      subtitle={`${users.length} учеников в базе — демонстрационные данные`}
    >
      <UsersTable users={users} onSelect={setSelected} />
      <UserDrawer
        user={selected}
        onClose={() => setSelected(null)}
        onStatusChange={handleStatus}
        onDelete={(id) => setUsers((prev) => prev.filter((u) => u.id !== id))}
      />
    </AdminLayout>
  );
}