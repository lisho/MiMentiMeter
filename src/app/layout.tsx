import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/components/ui/Toast'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ThemeToggle } from '@/components/ThemeToggle'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'MiMentiMeter - Participación Interactiva en Tiempo Real',
    description: 'Aplicación para participación interactiva del público en ponencias y formaciones masivas',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="es">
            <body className={inter.className}>
                <ThemeProvider>
                    <ToastProvider>
                        {children}
                        <ThemeToggle />
                    </ToastProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
