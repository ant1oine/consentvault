import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata = {
  title: "ConsentVault",
  description: "Enterprise-grade consent management API",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-800 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
