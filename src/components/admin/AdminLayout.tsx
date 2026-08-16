import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { AdminSidebar, MobileNav } from "./AdminSidebar";
import { Topbar } from "./Topbar";
import { AdminAccessGate } from "./AdminAccessGate";

export function AdminLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen w-full px-3 py-4 sm:px-5">
      <div className="mx-auto flex w-full max-w-[1500px] gap-5">
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className="min-w-0 flex-1 pb-10">
          <MobileNav />
          <Topbar title={title} subtitle={subtitle} />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <AdminAccessGate>{children}</AdminAccessGate>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
