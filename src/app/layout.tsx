import type { Metadata } from "next";
import { Space_Grotesk, Cinzel, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Web3Providers } from "@/components/providers/Web3Providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nox Assassin RWA Vault",
  description:
    "Confidential real-world asset vault powered by iExec Nox ERC-7984 on Arbitrum Sepolia. Strike. Vanish. Settle.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico?v=2" },
    ],
    shortcut: "/favicon.ico?v=2",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${cinzel.variable} ${jetbrainsMono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <Script id="wc-chain-error-suppressor" strategy="beforeInteractive">{`
(function(){
  window.addEventListener('unhandledrejection',function(e){
    var m=(e.reason&&e.reason.message)||String(e.reason||'');
    var s=(e.reason&&e.reason.stack)||'';
    if(m.indexOf('Cannot read properties of undefined')!==-1&&
       (s.indexOf('walletconnect')!==-1||s.indexOf('switchEthereumChain')!==-1||s.indexOf('setChainId')!==-1)){
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },true);
})();
`}</Script>
        <Web3Providers>{children}</Web3Providers>
      </body>
    </html>
  );
}
