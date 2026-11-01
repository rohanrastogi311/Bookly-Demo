import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Bookly — A little help. A happy ending.',description:'Meet Bea: Bookly’s voice and chat support agent. Delivery-aware recommendations, thoughtful resolutions, and clear confirmations.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
