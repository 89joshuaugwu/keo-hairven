import {AdminRoleProvider} from "@/components/AdminRoleProvider";
import { redirect } from "next/navigation";
import { AdminWorkspaceShell } from "@/components/AdminWorkspaceShell";
import { getVerifiedAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminWorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getVerifiedAdminSession();
  if (!session?.role) redirect("/admin/login");

  return (
    <AdminWorkspaceShell email={session.email} role={session.role}>
      <AdminRoleProvider role={session.role}>{children}</AdminRoleProvider>
    </AdminWorkspaceShell>
  );
}
