'use client'

import React from 'react'
import { useTheme } from '@/components/ThemeProvider'
import { Button } from '@/components/ui/Button'

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
            style={{
                position: 'fixed',
                bottom: '100px',
                left: '20px',
                zIndex: 9999,
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)'
            }}
        >
            {theme === 'light' ? '🌙' : '☀️'}
        </Button>
    )
}
