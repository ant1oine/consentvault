import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "ConsentVault",
  description: "Data compliance made effortless.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
