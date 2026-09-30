import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/src/components/app-shell";

export const metadata: Metadata = {
  title: "MemoryDesk AI — Customer support that remembers",
  description: "An AI support agent that remembers every customer.",
  icons: { icon: "/memorydesk-mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
