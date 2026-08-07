import "./globals.css";
import ToasterClient from "@/components/ToasterClient";
import { ThemeProvider } from "@/components/ThemeProvider";
import { StoreProvider } from "@/redux/provider";
import PageTitle from "@/components/PageTitle";
import type { Metadata } from "next";
import wareFlowLogo from "@/logo/image.png";

export const metadata: Metadata = {
  title: "WareFlow",
  description: "WareFlow billing and inventory management",
  applicationName: "WareFlow",
  icons: {
    icon: [{ url: wareFlowLogo.src, type: "image/png" }],
    shortcut: wareFlowLogo.src,
    apple: wareFlowLogo.src,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light'}}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="bg-background text-foreground transition-colors duration-200">
        <StoreProvider>
          <ThemeProvider>
            <PageTitle />
            {children}
            <ToasterClient />
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
