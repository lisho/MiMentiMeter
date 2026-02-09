
'use client'

import { useState } from 'react'
import { Activity, ActivityType, ScaleOptions, QuizOptions } from '@/types'
import { updateActivity } from '@/app/presenter/actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import styles from './ActivityEditor.module.css'

interface ActivityEditorProps {
    activity: Activity
    onUpdate: (activity: Activity) => void
    onDelete: () => void
}

const activityTypeLabels: Record<ActivityType, string> = {
    multiple_choice: 'Opción Múltiple',
    word_cloud: 'Nube de Palabras',
    open_text: 'Texto Abierto',
    scale: 'Escala',
    quiz: 'Quiz',
    true_false: 'Verdadero/Falso',
}

const activityTypeIcons: Record<ActivityType, string> = {
    multiple_choice: '📊',
    word_cloud: '☁️',
    open_text: '✏️',
    scale: '📏',
    quiz: '🎯',
    true_false: '✅',
}

export function ActivityEditor({ activity, onUpdate, onDelete }: ActivityEditorProps) {
    const [question, setQuestion] = useState(activity.question)
    const [options, setOptions] = useState<string[]>(
        'choices' in activity.options
            ? (activity.options as { choices: { text: string }[] }).choices.map(c => c.text)
            : ['', '']
    )

    // Scale states
    const initialScale = activity.type === 'scale' ? (activity.options as ScaleOptions) : null
    const [min, setMin] = useState(initialScale?.min ?? 1)
    const [max, setMax] = useState(initialScale?.max ?? 10)
    const [minLabel, setMinLabel] = useState(initialScale?.min_label ?? '')
    const [maxLabel, setMaxLabel] = useState(initialScale?.max_label ?? '')

    // Quiz states
    const initialQuiz = activity.type === 'quiz' ? (activity.options as QuizOptions) : null
    const [correctIndex, setCorrectIndex] = useState<number>(() => {
        if (!initialQuiz) return 0
        const index = initialQuiz.choices.findIndex(c => c.is_correct)
        return index !== -1 ? index : 0
    })

    const [saving, setSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    const handleQuestionChange = (value: string) => {
        setQuestion(value)
        setHasChanges(true)
    }

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options]
        newOptions[index] = value
        setOptions(newOptions)
        setHasChanges(true)
    }

    const handleSetCorrect = (index: number) => {
        if (activity.type === 'quiz') {
            setCorrectIndex(index)
            setHasChanges(true)
        }
    }

    const addOption = () => {
        setOptions([...options, ''])
        setHasChanges(true)
    }

    const removeOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index)
        setOptions(newOptions)

        // If we removed the correct option, reset to first
        if (correctIndex === index) {
            setCorrectIndex(0)
        } else if (correctIndex > index) {
            setCorrectIndex(correctIndex - 1)
        }

        setHasChanges(true)
    }

    const handleSave = async () => {
        setSaving(true)

        const formData = new FormData()
        formData.append('id', activity.id)
        formData.append('question', question)

        let updatedOptions = activity.options
        if (activity.type === 'multiple_choice' || activity.type === 'quiz') {
            const isQuiz = activity.type === 'quiz'
            const baseOptions = activity.options as any
            updatedOptions = {
                ...baseOptions,
                choices: options.filter(o => o.trim()).map((text, i) => ({
                    id: String(i),
                    text,
                    ...(isQuiz ? { is_correct: i === correctIndex } : {})
                }))
            }
        } else if (activity.type === 'scale') {
            updatedOptions = {
                ...activity.options,
                min,
                max,
                min_label: minLabel,
                max_label: maxLabel
            } as ScaleOptions
        }

        formData.append('options', JSON.stringify(updatedOptions))

        const result = await updateActivity(formData)

        if (!result.error) {
            onUpdate({
                ...activity,
                question,
                options: updatedOptions
            })
            setHasChanges(false)
        }

        setSaving(false)
    }

    return (
        <Card className={styles.editor}>
            <div className={styles.header}>
                <div className={styles.typeInfo}>
                    <span className={styles.typeIcon}>{activityTypeIcons[activity.type]}</span>
                    <span className={styles.typeLabel}>{activityTypeLabels[activity.type]}</span>
                </div>
                <button className={styles.deleteButton} onClick={onDelete} aria-label="Eliminar actividad">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            </div>

            <div className={styles.field}>
                <label>Pregunta</label>
                <textarea
                    className="input"
                    value={question}
                    onChange={(e) => handleQuestionChange(e.target.value)}
                    placeholder="Escribe tu pregunta..."
                    rows={3}
                />
            </div>

            {(activity.type === 'multiple_choice' || activity.type === 'quiz') && (
                <div className={styles.field}>
                    <label>Opciones de respuesta</label>
                    <div className={styles.optionsList}>
                        {options.map((option, index) => (
                            <div key={index} className={styles.optionRow}>
                                <div className={styles.optionIndex}>{index + 1}</div>
                                <Input
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    placeholder={`Opción ${index + 1}`}
                                />
                                {activity.type === 'quiz' && (
                                    <div
                                        className={`${styles.correctBadge} ${index === correctIndex ? styles.correct : ''}`}
                                        onClick={() => handleSetCorrect(index)}
                                        title="Marcar como respuesta correcta"
                                    >
                                        {index === correctIndex ? '✓' : ''}
                                    </div>
                                )}
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

            {activity.type === 'scale' && (
                <div className={styles.scaleConfig}>
                    <div className={styles.configGrid}>
                        <div className={styles.field}>
                            <label>Valor Mínimo</label>
                            <Input
                                type="number"
                                value={min}
                                onChange={(e) => { setMin(Number(e.target.value)); setHasChanges(true); }}
                            />
                        </div>
                        <div className={styles.field}>
                            <label>Valor Máximo</label>
                            <Input
                                type="number"
                                value={max}
                                onChange={(e) => { setMax(Number(e.target.value)); setHasChanges(true); }}
                            />
                        </div>
                        <div className={styles.field}>
                            <label>Etiqueta Mínimo</label>
                            <Input
                                value={minLabel}
                                onChange={(e) => { setMinLabel(e.target.value); setHasChanges(true); }}
                                placeholder="E.g. Nada probable"
                            />
                        </div>
                        <div className={styles.field}>
                            <label>Etiqueta Máximo</label>
                            <Input
                                value={maxLabel}
                                onChange={(e) => { setMaxLabel(e.target.value); setHasChanges(true); }}
                                placeholder="E.g. Muy probable"
                            />
                        </div>
                    </div>

                    <div className={styles.scalePreview}>
                        <p className={styles.previewLabel}>Vista previa:</p>
                        <div className={styles.scaleLabels}>
                            <span>{minLabel || min}</span>
                            <span>{maxLabel || max}</span>
                        </div>
                        <div className={styles.scaleContainer}>
                            {Array.from({ length: Math.min(max - min + 1, 10) }, (_, i) => min + i).map(n => (
                                <div key={n} className={styles.scaleItem}>{n}</div>
                            ))}
                            {(max - min + 1) > 10 && <div className={styles.scaleItem}>...</div>}
                        </div>
                    </div>
                </div>
            )}

            {activity.type === 'true_false' && (
                <div className={styles.trueFalsePreview}>
                    <p className={styles.previewLabel}>Vista previa:</p>
                    <div className={styles.trueFalseOptions}>
                        <div className={styles.trueFalseOption}>
                            <span>✅</span> Verdadero
                        </div>
                        <div className={styles.trueFalseOption}>
                            <span>❌</span> Falso
                        </div>
                    </div>
                </div>
            )}

            {hasChanges && (
                <div className={styles.saveBar}>
                    <span>Tienes cambios sin guardar</span>
                    <Button onClick={handleSave} isLoading={saving}>
                        Guardar cambios
                    </Button>
                </div>
            )}
        </Card>
    )
}
