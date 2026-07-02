import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 ml-64 overflow-auto">
          <div className="min-h-full">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
