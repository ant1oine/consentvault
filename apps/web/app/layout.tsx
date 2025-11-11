import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata = {
  title: "ConsentVault",
  description: "Enterprise-grade consent management API",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
