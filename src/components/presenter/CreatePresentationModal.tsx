
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import styles from './CreatePresentationModal.module.css'

interface CreatePresentationModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (formData: FormData) => Promise<void>
}

export function CreatePresentationModal({ isOpen, onClose, onSubmit }: CreatePresentationModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(event.currentTarget)

        try {
            await onSubmit(formData)
            onClose()
        } catch (err) {
            setError('Error al crear la presentación')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <Card
                className={styles.modal}
                shouldGlass
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.header}>
                    <h2>Nueva Presentación</h2>
                    <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="title">Título *</label>
                        <Input
                            id="title"
                            name="title"
                            placeholder="Ej: Encuesta de satisfacción"
                            required
                            autoFocus
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="description">Descripción (opcional)</label>
                        <textarea
                            id="description"
                            name="description"
                            className="input"
                            placeholder="Describe brevemente tu presentación..."
                            rows={3}
                        />
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <div className={styles.actions}>
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" isLoading={loading}>
                            Crear Presentación
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
