
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Presentation } from '@/types'
import styles from './PresentationCard.module.css'

interface PresentationCardProps {
    presentation: Presentation
    onDelete: (id: string) => void
    onStartSession: (id: string) => void
}

export function PresentationCard({ presentation, onDelete, onStartSession }: PresentationCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    }

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <Link href={`/presenter/presentation/${presentation.id}`} className={styles.title}>
                    {presentation.title}
                </Link>
                <div className={styles.menuWrapper}>
                    <button
                        className={styles.menuButton}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Opciones"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                        </svg>
                    </button>
                    {isMenuOpen && (
                        <div className={styles.menu}>
                            <Link
                                href={`/presenter/presentation/${presentation.id}`}
                                className={styles.menuItem}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Editar
                            </Link>
                            <button
                                className={styles.menuItem}
                                onClick={() => {
                                    onStartSession(presentation.id)
                                    setIsMenuOpen(false)
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                Iniciar Sesión
                            </button>
                            <button
                                className={`${styles.menuItem} ${styles.danger}`}
                                onClick={() => {
                                    if (confirm('¿Estás seguro de eliminar esta presentación?')) {
                                        onDelete(presentation.id)
                                    }
                                    setIsMenuOpen(false)
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Eliminar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {presentation.description && (
                <p className={styles.description}>{presentation.description}</p>
            )}

            <div className={styles.footer}>
                <span className={styles.date}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {formatDate(presentation.updated_at)}
                </span>
                <span className={`${styles.status} ${presentation.is_active ? styles.active : styles.inactive}`}>
                    {presentation.is_active ? 'Activa' : 'Inactiva'}
                </span>
            </div>
        </div>
    )
}
