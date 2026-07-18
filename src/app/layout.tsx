import "./globals.css";
import ToasterClient from "@/components/ToasterClient";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <ToasterClient />
      </body>
    </html>
  );
}


