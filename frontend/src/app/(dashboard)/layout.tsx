import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Mock user for development (auth disabled)
  const mockUser = {
    email: "dev@sitelens.com",
    user_metadata: {
      full_name: "Developer",
    },
  };

  return (
    <div className="flex h-screen">
      <Sidebar user={mockUser} />
      <main className="flex-1 overflow-auto bg-muted/30">{children}</main>
    </div>
  );
}
