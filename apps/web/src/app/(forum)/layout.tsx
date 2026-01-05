import { Header } from "@/components/layout/header";
import type { ReactNode } from "react";

interface ForumLayoutProps {
  children: ReactNode;
}

export default function ForumLayout({ children }: ForumLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
