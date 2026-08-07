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
            {children}
            <ToasterClient />
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}

