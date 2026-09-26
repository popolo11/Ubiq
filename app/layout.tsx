import "./globals.css";
export const metadata = { title: "UBIQ Location Intake", description: "Research intake for production locations" };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}