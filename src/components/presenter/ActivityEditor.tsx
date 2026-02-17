'use client'

import { useState, useEffect } from 'react'
import { Activity, ActivityType, ScaleOptions, QuizOptions } from '@/types'
import { updateActivity } from '@/app/presenter/actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
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
    image_choice: 'Opción con Imágenes',
}

const activityTypeIcons: Record<ActivityType, string> = {
    multiple_choice: '📊',
    word_cloud: '☁️',
    open_text: '✏️',
    scale: '📏',
    quiz: '🎯',
    true_false: '✅',
    image_choice: '🖼️',
}

export function ActivityEditor({ activity, onUpdate, onDelete }: ActivityEditorProps) {
    const [question, setQuestion] = useState(activity.question)
    const [options, setOptions] = useState<string[]>(
        'choices' in activity.options
            ? (activity.options as { choices: { text: string }[] }).choices.map(c => c.text)
            : ['', '']
    )
    const [imageUrls, setImageUrls] = useState<string[]>(
        'choices' in activity.options && activity.type === 'image_choice'
            ? (activity.options as any).choices.map((c: any) => c.image_url || '')
            : options.map(() => '')
    )
    const [allowMultiple, setAllowMultiple] = useState<boolean>(
        'allow_multiple' in activity.options ? (activity.options as any).allow_multiple : false
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

    // Settings states — use explicit undefined check so null (unlimited) is preserved
    const [maxResponsesPerParticipant, setMaxResponsesPerParticipant] = useState<number | null>(
        activity.settings.max_responses_per_participant === undefined ? 1 : activity.settings.max_responses_per_participant
    )

    // Word Cloud state
    const [palette, setPalette] = useState<string>(
        'palette' in activity.options ? (activity.options as any).palette : 'autumn'
    )

    const [saving, setSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    const { showToast } = useToast()

    // Sync state with activity prop changes (crucial for when switching activities or after update)
    useEffect(() => {
        setMaxResponsesPerParticipant(activity.settings.max_responses_per_participant === undefined ? 1 : activity.settings.max_responses_per_participant)
        setQuestion(activity.question)
        if (activity.type === 'word_cloud') {
            setPalette('palette' in activity.options ? (activity.options as any).palette : 'autumn')
        }
        // Note: Resetting options/images state on activity switch usually happens via key prop on component
    }, [activity.id, activity.settings.max_responses_per_participant, activity.question, activity.options, activity.type])

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

    const handleImageUrlChange = (index: number, value: string) => {
        const newUrls = [...imageUrls]
        newUrls[index] = value
        setImageUrls(newUrls)
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
        setImageUrls([...imageUrls, ''])
        setHasChanges(true)
    }

    const removeOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index)
        const newUrls = imageUrls.filter((_, i) => i !== index)
        setOptions(newOptions)
        setImageUrls(newUrls)

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
        formData.append('presentation_id', activity.presentation_id)
        formData.append('question', question)

        let updatedOptions: any = activity.options
        if (activity.type === 'multiple_choice' || activity.type === 'quiz' || activity.type === 'image_choice') {
            const isQuiz = activity.type === 'quiz'
            const isImage = activity.type === 'image_choice'
            const baseOptions = activity.options as any
            updatedOptions = {
                ...baseOptions,
                choices: options.filter(o => o.trim()).map((text, i) => ({
                    id: String(i),
                    text,
                    ...(isQuiz ? { is_correct: i === correctIndex } : {}),
                    ...(isImage ? { image_url: imageUrls[i] } : {})
                })),
                ...(activity.type === 'multiple_choice' || isImage ? { allow_multiple: allowMultiple } : {})
            }
        } else if (activity.type === 'scale') {
            updatedOptions = {
                ...activity.options,
                min,
                max,
                min_label: minLabel,
                max_label: maxLabel
            } as ScaleOptions
        } else if (activity.type === 'word_cloud') {
            updatedOptions = {
                ...activity.options,
                palette
            }
        }

        formData.append('options', JSON.stringify(updatedOptions))

        // Build settings
        const updatedSettings = {
            ...activity.settings,
            max_responses_per_participant: maxResponsesPerParticipant
        }
        formData.append('settings', JSON.stringify(updatedSettings))

        console.log('[ActivityEditor] Saving settings:', JSON.stringify(updatedSettings))

        const result = await updateActivity(formData)

        console.log('[ActivityEditor] Server result:', JSON.stringify(result))

        if (!result.error) {
            // Use the data returned from the server as the source of truth
            const serverData = (result as any).data
            const confirmedSettings = serverData?.settings || updatedSettings

            console.log('[ActivityEditor] Confirmed settings from server:', JSON.stringify(confirmedSettings))

            onUpdate({
                ...activity,
                question,
                options: serverData?.options || updatedOptions,
                settings: confirmedSettings
            })
            setHasChanges(false)
            showToast('✅ Cambios guardados correctamente', 'success')
        } else {
            console.error('[ActivityEditor] Save error:', result.error)
            showToast(`Error: ${result.error}`, 'error')
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

            {(activity.type === 'multiple_choice' || activity.type === 'quiz' || activity.type === 'image_choice') && (
                <div className={styles.field}>
                    <div className={styles.fieldHeader}>
                        <label>Opciones de respuesta</label>
                        {(activity.type === 'multiple_choice' || activity.type === 'image_choice') && (
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={allowMultiple}
                                    onChange={(e) => { setAllowMultiple(e.target.checked); setHasChanges(true); }}
                                />
                                Permitir seleccionar varias
                            </label>
                        )}
                    </div>
                    <div className={styles.optionsList}>
                        {options.map((option, index) => (
                            <div key={index} className={styles.optionContainer}>
                                <div className={styles.optionRow}>
                                    <div className={styles.optionIndex}>{index + 1}</div>
                                    <Input
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        placeholder={`Etiqueta de la opción ${index + 1}`}
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
                                {activity.type === 'image_choice' && (
                                    <div className={styles.imageInputRow}>
                                        <Input
                                            value={imageUrls[index]}
                                            onChange={(e) => handleImageUrlChange(index, e.target.value)}
                                            placeholder="URL de la imagen (e.g. https://...)"
                                        />
                                        {imageUrls[index] && (
                                            <div className={styles.imagePreviewSmall}>
                                                <img src={imageUrls[index]} alt="Preview" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={addOption}>
                            + Añadir opción
                        </Button>
                    </div>
                </div>
            )}

            {activity.type === 'word_cloud' && (
                <div className={styles.field}>
                    <label>Paleta de Color</label>
                    <select
                        className="input"
                        value={palette}
                        onChange={(e) => { setPalette(e.target.value); setHasChanges(true); }}
                        style={{ height: '40px' }}
                    >
                        <option value="autumn">🍂 Otoño (Cálido)</option>
                        <option value="ocean">🌊 Océano (Azules)</option>
                        <option value="vibrant">🌈 Vibrante (Multicolor)</option>
                        <option value="professional">🏢 Profesional (Grises/Azul)</option>
                    </select>
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

            {/* Settings Section */}
            <div className={styles.settingsSection}>
                <h3 className={styles.settingsTitle}>⚙️ Configuración</h3>
                <div className={styles.field}>
                    <label>Máximo de respuestas por participante</label>
                    <div className={styles.responseLimit}>
                        <Input
                            type="number"
                            min="1"
                            value={maxResponsesPerParticipant || ''}
                            onChange={(e) => {
                                const val = e.target.value === '' ? null : Number(e.target.value)
                                setMaxResponsesPerParticipant(val)
                                setHasChanges(true)
                            }}
                            placeholder="Ilimitado"
                        />
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={maxResponsesPerParticipant === null}
                                onChange={(e) => {
                                    setMaxResponsesPerParticipant(e.target.checked ? null : 1)
                                    setHasChanges(true)
                                }}
                            />
                            Ilimitado
                        </label>
                    </div>
                    <p className={styles.helpText}>
                        {maxResponsesPerParticipant === null
                            ? 'Los participantes pueden responder múltiples veces'
                            : `Cada participante puede responder hasta ${maxResponsesPerParticipant} ${maxResponsesPerParticipant === 1 ? 'vez' : 'veces'}`
                        }
                    </p>
                </div>
            </div>

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
