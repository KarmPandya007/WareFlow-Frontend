import "./globals.css";
import ToasterClient from "@/components/ToasterClient";
import { ThemeProvider } from "@/components/ThemeProvider";
import { StoreProvider } from "@/redux/provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-background text-foreground transition-colors duration-200">
        <StoreProvider>
          <ThemeProvider>
            {children}
            <ToasterClient />
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}


