
'use client'

import { useState } from 'react'
import { ActivityType } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import styles from './AddActivityModal.module.css'

interface AddActivityModalProps {
    isOpen: boolean
    onClose: () => void
    onAdd: (type: ActivityType, question: string, options: object) => Promise<void>
}

const activityTypes: { type: ActivityType; label: string; icon: string; description: string }[] = [
    {
        type: 'multiple_choice',
        label: 'Opción Múltiple',
        icon: '📊',
        description: 'Los participantes eligen una o más opciones'
    },
    {
        type: 'word_cloud',
        label: 'Nube de Palabras',
        icon: '☁️',
        description: 'Recopila palabras y muéstralas en una nube'
    },
    {
        type: 'open_text',
        label: 'Texto Abierto',
        icon: '✏️',
        description: 'Respuestas libres de texto'
    },
    {
        type: 'scale',
        label: 'Escala',
        icon: '📏',
        description: 'Valoración numérica en un rango'
    },
    {
        type: 'quiz',
        label: 'Quiz',
        icon: '🎯',
        description: 'Preguntas con respuesta correcta y puntuación'
    },
    {
        type: 'true_false',
        label: 'Verdadero/Falso',
        icon: '✅',
        description: 'Preguntas de verdadero o falso'
    },
]

export function AddActivityModal({ isOpen, onClose, onAdd }: AddActivityModalProps) {
    const [step, setStep] = useState<'type' | 'details'>('type')
    const [selectedType, setSelectedType] = useState<ActivityType | null>(null)
    const [question, setQuestion] = useState('')
    const [options, setOptions] = useState<string[]>(['', ''])
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSelectType = (type: ActivityType) => {
        setSelectedType(type)
        setStep('details')
    }

    const handleSubmit = async () => {
        if (!selectedType || !question.trim()) return

        setLoading(true)

        let activityOptions: object = {}

        switch (selectedType) {
            case 'multiple_choice':
                activityOptions = {
                    choices: options.filter(o => o.trim()).map((text, i) => ({ id: String(i), text })),
                    allow_multiple: false
                }
                break
            case 'word_cloud':
                activityOptions = { max_words: 3, min_length: 2, max_length: 30 }
                break
            case 'open_text':
                activityOptions = { max_length: 500, placeholder: 'Escribe tu respuesta...' }
                break
            case 'scale':
                activityOptions = { min: 1, max: 10, min_label: 'Mínimo', max_label: 'Máximo' }
                break
            case 'quiz':
                activityOptions = {
                    choices: options.filter(o => o.trim()).map((text, i) => ({ id: String(i), text, is_correct: i === 0 })),
                    time_limit: 30,
                    points: 100
                }
                break
            case 'true_false':
                activityOptions = { correct_answer: true, time_limit: 15, points: 100 }
                break
        }

        try {
            await onAdd(selectedType, question, activityOptions)
            resetForm()
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setStep('type')
        setSelectedType(null)
        setQuestion('')
        setOptions(['', ''])
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    const addOption = () => setOptions([...options, ''])
    const removeOption = (index: number) => setOptions(options.filter((_, i) => i !== index))
    const updateOption = (index: number, value: string) => {
        const newOptions = [...options]
        newOptions[index] = value
        setOptions(newOptions)
    }

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <Card className={styles.modal} shouldGlass onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>{step === 'type' ? 'Selecciona el tipo de actividad' : 'Configura la actividad'}</h2>
                    <button className={styles.closeButton} onClick={handleClose} aria-label="Cerrar">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {step === 'type' ? (
                    <div className={styles.typeGrid}>
                        {activityTypes.map(({ type, label, icon, description }) => (
                            <button
                                key={type}
                                className={styles.typeCard}
                                onClick={() => handleSelectType(type)}
                            >
                                <span className={styles.typeIcon}>{icon}</span>
                                <span className={styles.typeLabel}>{label}</span>
                                <span className={styles.typeDescription}>{description}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className={styles.detailsForm}>
                        <button className={styles.backLink} onClick={() => setStep('type')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Cambiar tipo
                        </button>

                        <div className={styles.selectedType}>
                            <span className={styles.selectedIcon}>
                                {activityTypes.find(t => t.type === selectedType)?.icon}
                            </span>
                            <span>{activityTypes.find(t => t.type === selectedType)?.label}</span>
                        </div>

                        <div className={styles.field}>
                            <label>Pregunta</label>
                            <Input
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="Escribe tu pregunta..."
                                autoFocus
                            />
                        </div>

                        {(selectedType === 'multiple_choice' || selectedType === 'quiz') && (
                            <div className={styles.field}>
                                <label>Opciones</label>
                                <div className={styles.optionsList}>
                                    {options.map((option, index) => (
                                        <div key={index} className={styles.optionRow}>
                                            <Input
                                                value={option}
                                                onChange={(e) => updateOption(index, e.target.value)}
                                                placeholder={`Opción ${index + 1}`}
                                            />
                                            {options.length > 2 && (
                                                <button
                                                    className={styles.removeOption}
                                                    onClick={() => removeOption(index)}
                                                    aria-label="Eliminar opción"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <Button variant="ghost" size="sm" onClick={addOption}>
                                        + Añadir opción
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className={styles.actions}>
                            <Button variant="ghost" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                isLoading={loading}
                                disabled={!question.trim()}
                            >
                                Crear Actividad
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}
