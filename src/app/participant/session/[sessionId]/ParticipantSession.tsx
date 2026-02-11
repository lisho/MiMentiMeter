
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Session, Activity, ActivityType } from '@/types'
import { registerParticipant, submitResponse, checkSessionStatus, checkParticipantResponse } from '../../actions'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import styles from './session.module.css'

interface ParticipantSessionProps {
    session: Session
    presentationTitle: string
    initialActivities: Activity[]
}

export function ParticipantSession({ session, presentationTitle, initialActivities }: ParticipantSessionProps) {
    const router = useRouter()
    const supabase = createClient()

    const [step, setStep] = useState<'name' | 'waiting' | 'activity' | 'submitted' | 'ended'>('name')
    const [participantId, setParticipantId] = useState<string | null>(null)
    const [participantName, setParticipantName] = useState('')
    const [currentActivityIndex, setCurrentActivityIndex] = useState(session.current_activity_index ?? 0)
    const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | number | boolean | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [submittedActivities, setSubmittedActivities] = useState<Set<string>>(new Set())
    const [responseCount, setResponseCount] = useState(0)
    const [maxResponses, setMaxResponses] = useState<number | null>(null)
    const [hasReachedLimit, setHasReachedLimit] = useState(false)

    const currentActivity = initialActivities[currentActivityIndex] || null

    // Refs for Realtime to avoid unnecessary re-subscriptions
    const currentIndexRef = useRef(currentActivityIndex)
    const participantIdRef = useRef(participantId)

    useEffect(() => {
        currentIndexRef.current = currentActivityIndex
    }, [currentActivityIndex])

    useEffect(() => {
        participantIdRef.current = participantId
    }, [participantId])

    // Function to fetch current session state
    const syncSessionState = async () => {
        const { data: sessionData } = await supabase
            .from('sessions')
            .select('is_live, current_activity_index')
            .eq('id', session.id)
            .single()

        if (sessionData) {
            if (!sessionData.is_live) {
                setStep('ended')
                return
            }

            const newIndex = sessionData.current_activity_index ?? 0
            if (newIndex !== currentIndexRef.current) {
                console.log('[syncSessionState] Activity index changed:', currentIndexRef.current, '->', newIndex)
                setCurrentActivityIndex(newIndex)
                setSelectedAnswer(null)

                // Check response status for new activity
                const activityId = initialActivities[newIndex]?.id
                if (activityId && participantIdRef.current) {
                    const result = await checkParticipantResponse(activityId, participantIdRef.current)
                    setResponseCount(result.responseCount)
                    setMaxResponses(result.maxResponses)
                    setHasReachedLimit(result.hasReachedLimit)

                    if (result.hasReachedLimit) {
                        setStep('submitted')
                    } else {
                        setStep('activity')
                    }
                }
            }
        }
    }

    useEffect(() => {
        // Check if participant is already registered in this session
        const storedParticipantId = sessionStorage.getItem(`participant_${session.id}`)
        if (storedParticipantId) {
            setParticipantId(storedParticipantId)

            // Verificar si ya ha respondido a la actividad actual
            if (currentActivity) {
                checkParticipantResponse(currentActivity.id, storedParticipantId).then((result) => {
                    setResponseCount(result.responseCount)
                    setMaxResponses(result.maxResponses)
                    setHasReachedLimit(result.hasReachedLimit)

                    if (result.hasReachedLimit) {
                        setStep('submitted')
                        setSubmittedActivities(prev => new Set(prev).add(currentActivity.id))
                    } else {
                        // Solo cambiar a 'activity' si no estamos ya en 'submitted'
                        setStep(current => current === 'submitted' ? 'submitted' : 'activity')
                    }
                })
            } else {
                setStep('waiting')
            }
        }

        // Subscribe to session changes via Realtime
        console.log('[ParticipantSession] Connecting to Realtime for session:', session.id)
        const channel = supabase
            .channel(`participant-session-${session.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'sessions',
                    filter: `id=eq.${session.id}`
                },
                (payload) => {
                    console.log('[ParticipantSession] Realtime update:', payload.new)
                    if (payload.new.is_live === false) {
                        setStep('ended')
                        return
                    }

                    const newIndex = payload.new.current_activity_index ?? 0
                    if (newIndex !== currentIndexRef.current) {
                        console.log('[ParticipantSession] Activity changed via Realtime:', currentIndexRef.current, '->', newIndex)

                        // Optimistic transition
                        setCurrentActivityIndex(newIndex)
                        setSelectedAnswer(null)
                        setError(null)

                        const activityId = initialActivities[newIndex]?.id
                        if (activityId && participantIdRef.current) {
                            checkParticipantResponse(activityId, participantIdRef.current).then(result => {
                                setResponseCount(result.responseCount)
                                setMaxResponses(result.maxResponses)
                                setHasReachedLimit(result.hasReachedLimit)

                                if (result.hasReachedLimit) {
                                    setStep('submitted')
                                } else {
                                    setStep('activity')
                                }
                            })
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log(`[ParticipantSession] Realtime status: ${status}`)
                if (status === 'SUBSCRIBED') {
                    // Sync immediately on successful subscription to catch any missed updates
                    syncSessionState()
                }
            })

        // Polling fallback every 2 seconds (increased frequency)
        const interval = setInterval(() => {
            syncSessionState()
        }, 2000)

        return () => {
            console.log('[ParticipantSession] Cleaning up Realtime and polling')
            supabase.removeChannel(channel).catch(err => console.error('Error removing channel:', err))
            clearInterval(interval)
        }
    }, [session.id, supabase, initialActivities]) // Stable dependencies


    const handleRegister = async () => {
        setSubmitting(true)
        setError(null)

        const result = await registerParticipant(session.id, participantName || undefined)

        if (result.error) {
            setError(result.error)
            setSubmitting(false)
            return
        }

        if (result.data) {
            setParticipantId(result.data.id)
            sessionStorage.setItem(`participant_${session.id}`, result.data.id)

            // Check the activity's response settings so the participant knows limits
            if (currentActivity) {
                const check = await checkParticipantResponse(currentActivity.id, result.data.id)
                setResponseCount(check.responseCount)
                setMaxResponses(check.maxResponses)
                setHasReachedLimit(check.hasReachedLimit)
                setStep('activity')
            } else {
                setStep('waiting')
            }
        }
        setSubmitting(false)
    }

    const handleSubmitResponse = async () => {
        if (!currentActivity || !participantId || selectedAnswer === null) return

        setSubmitting(true)
        setError(null)

        let answer: object
        switch (currentActivity.type) {
            case 'multiple_choice':
                answer = { type: 'multiple_choice', choice_ids: Array.isArray(selectedAnswer) ? selectedAnswer : [selectedAnswer] }
                break
            case 'word_cloud':
                answer = { type: 'word_cloud', words: Array.isArray(selectedAnswer) ? selectedAnswer : [selectedAnswer] }
                break
            case 'open_text':
                answer = { type: 'open_text', text: selectedAnswer as string }
                break
            case 'scale':
                answer = { type: 'scale', value: selectedAnswer as number }
                break
            case 'quiz':
                answer = { type: 'quiz', choice_id: selectedAnswer as string, time_taken: 0 }
                break
            case 'true_false':
                answer = { type: 'true_false', answer: selectedAnswer as boolean, time_taken: 0 }
                break
            case 'image_choice':
                answer = { type: 'image_choice', choice_ids: Array.isArray(selectedAnswer) ? selectedAnswer : [selectedAnswer as string] }
                break
            default:
                answer = { type: currentActivity.type, value: selectedAnswer }
        }

        const result = await submitResponse(currentActivity.id, session.id, participantId, answer)

        if (result.error) {
            setError(result.error)
            setSubmitting(false)
            return
        }

        // Track this activity as submitted
        setSubmittedActivities(prev => new Set(prev).add(currentActivity.id))
        setResponseCount(prev => prev + 1)

        // Check if we've reached the limit
        if (maxResponses !== null && responseCount + 1 >= maxResponses) {
            setHasReachedLimit(true)
        }

        setStep('submitted')
        setSubmitting(false)
    }

    const renderActivityInput = () => {
        if (!currentActivity) return null

        switch (currentActivity.type) {
            case 'multiple_choice':
            case 'quiz':
                const choices = 'choices' in currentActivity.options
                    ? (currentActivity.options as { choices: { id: string; text: string }[] }).choices
                    : []
                const isMultiple = 'allow_multiple' in currentActivity.options && (currentActivity.options as any).allow_multiple

                const toggleSelection = (id: string) => {
                    if (isMultiple) {
                        const current = Array.isArray(selectedAnswer) ? selectedAnswer : []
                        if (current.includes(id)) {
                            setSelectedAnswer(current.filter(item => item !== id))
                        } else {
                            setSelectedAnswer([...current, id])
                        }
                    } else {
                        setSelectedAnswer(id)
                    }
                }

                const isSelected = (id: string) => {
                    if (isMultiple) {
                        return Array.isArray(selectedAnswer) && selectedAnswer.includes(id)
                    }
                    return selectedAnswer === id
                }

                return (
                    <div className={styles.choicesGrid}>
                        {choices.map((choice, i) => (
                            <button
                                key={choice.id}
                                className={`${styles.choiceButton} ${isSelected(choice.id) ? styles.selected : ''}`}
                                onClick={() => toggleSelection(choice.id)}
                            >
                                <div className={styles.choiceHeader}>
                                    <span className={styles.choiceLetter}>{String.fromCharCode(65 + i)}</span>
                                    {isMultiple && (
                                        <div className={`${styles.checkbox} ${isSelected(choice.id) ? styles.checked : ''}`}>
                                            {isSelected(choice.id) && '✓'}
                                        </div>
                                    )}
                                </div>
                                <span className={styles.choiceText}>{choice.text}</span>
                            </button>
                        ))}
                    </div>
                )

            case 'image_choice':
                const imgChoices = 'choices' in currentActivity.options
                    ? (currentActivity.options as { choices: { id: string; text: string; image_url: string }[] }).choices
                    : []
                const isMultipleImg = 'allow_multiple' in currentActivity.options && (currentActivity.options as any).allow_multiple

                const toggleImgSelection = (id: string) => {
                    if (isMultipleImg) {
                        const current = Array.isArray(selectedAnswer) ? selectedAnswer : []
                        if (current.includes(id)) {
                            setSelectedAnswer(current.filter(item => item !== id))
                        } else {
                            setSelectedAnswer([...current, id])
                        }
                    } else {
                        setSelectedAnswer(id)
                    }
                }

                const isImgSelected = (id: string) => {
                    if (isMultipleImg) {
                        return Array.isArray(selectedAnswer) && selectedAnswer.includes(id)
                    }
                    return selectedAnswer === id
                }

                return (
                    <div className={styles.imageChoicesGrid}>
                        {imgChoices.map((choice) => (
                            <button
                                key={choice.id}
                                className={`${styles.imageChoiceCard} ${isImgSelected(choice.id) ? styles.selected : ''}`}
                                onClick={() => toggleImgSelection(choice.id)}
                            >
                                <div className={styles.imageChoiceWrapper}>
                                    {choice.image_url && <img src={choice.image_url} alt={choice.text} />}
                                    <div className={`${styles.imageCheck} ${isImgSelected(choice.id) ? styles.checked : ''}`}>
                                        {isImgSelected(choice.id) && '✓'}
                                    </div>
                                </div>
                                <span className={styles.imageChoiceText}>{choice.text}</span>
                            </button>
                        ))}
                    </div>
                )

            case 'true_false':
                return (
                    <div className={styles.trueFalseGrid}>
                        <button
                            className={`${styles.trueFalseButton} ${selectedAnswer === true ? styles.selected : ''}`}
                            onClick={() => setSelectedAnswer(true)}
                        >
                            <span className={styles.tfIcon}>✅</span>
                            <span>Verdadero</span>
                        </button>
                        <button
                            className={`${styles.trueFalseButton} ${selectedAnswer === false ? styles.selected : ''}`}
                            onClick={() => setSelectedAnswer(false)}
                        >
                            <span className={styles.tfIcon}>❌</span>
                            <span>Falso</span>
                        </button>
                    </div>
                )

            case 'scale':
                const scaleOptions = currentActivity.options as { min: number; max: number; min_label: string; max_label: string }
                const min = scaleOptions.min || 1
                const max = scaleOptions.max || 10
                return (
                    <div className={styles.scaleContainer}>
                        <div className={styles.scaleLabels}>
                            <span>{scaleOptions.min_label || min}</span>
                            <span>{scaleOptions.max_label || max}</span>
                        </div>
                        <div className={styles.scaleButtons}>
                            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(n => (
                                <button
                                    key={n}
                                    className={`${styles.scaleButton} ${selectedAnswer === n ? styles.selected : ''}`}
                                    onClick={() => setSelectedAnswer(n)}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                )

            case 'open_text':
                return (
                    <textarea
                        className={`input ${styles.textInput}`}
                        placeholder="Escribe tu respuesta..."
                        value={selectedAnswer as string || ''}
                        onChange={(e) => setSelectedAnswer(e.target.value)}
                        rows={4}
                    />
                )

            case 'word_cloud':
                return (
                    <Input
                        placeholder="Escribe una palabra..."
                        value={selectedAnswer as string || ''}
                        onChange={(e) => setSelectedAnswer(e.target.value)}
                        className={styles.wordInput}
                    />
                )

            default:
                return null
        }
    }

    // Name input step
    if (step === 'name') {
        return (
            <div className={styles.container}>
                <Card className={styles.card} shouldGlass>
                    <div className={styles.header}>
                        <span className={styles.code}>{session.access_code}</span>
                        <h1>{presentationTitle}</h1>
                    </div>

                    <div className={styles.nameForm}>
                        <div className={styles.icon}>👋</div>
                        <h2>¡Bienvenido!</h2>
                        <p>Introduce tu nombre para participar (opcional)</p>

                        <Input
                            placeholder="Tu nombre"
                            value={participantName}
                            onChange={(e) => setParticipantName(e.target.value)}
                            className={styles.nameInput}
                        />

                        {error && <p className={styles.error}>{error}</p>}

                        <Button
                            onClick={handleRegister}
                            isLoading={submitting}
                            className={styles.joinButton}
                        >
                            Unirse a la sesión
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    // Waiting for activity
    if (step === 'waiting') {
        return (
            <div className={styles.container}>
                <Card className={styles.card} shouldGlass>
                    <div className={styles.header}>
                        <span className={styles.code}>{session.access_code}</span>
                        <h1>{presentationTitle}</h1>
                    </div>

                    <div className={styles.waiting}>
                        <div className={styles.waitingIcon}>⏳</div>
                        <h2>Esperando al presentador...</h2>
                        <p>La actividad comenzará pronto</p>
                        <div className={styles.dots}>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </Card>
            </div>
        )
    }

    // Activity voting
    if (step === 'activity' && currentActivity) {
        return (
            <div className={styles.container}>
                <Card className={styles.card} shouldGlass>
                    <div className={styles.header}>
                        <span className={styles.code}>{session.access_code}</span>
                    </div>

                    <div className={styles.activity}>
                        <h2 className={styles.question}>{currentActivity.question}</h2>

                        {renderActivityInput()}

                        {error && <p className={styles.error}>{error}</p>}

                        <Button
                            onClick={handleSubmitResponse}
                            isLoading={submitting}
                            disabled={selectedAnswer === null || (Array.isArray(selectedAnswer) && selectedAnswer.length === 0) || submitting}
                            className={styles.submitButton}
                        >
                            Enviar respuesta
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    // Response submitted
    if (step === 'submitted') {
        return (
            <div className={styles.container}>
                <Card className={styles.card} shouldGlass>
                    <div className={styles.submitted}>
                        <div className={styles.successIcon}>✅</div>
                        <h2>¡Respuesta Registrada!</h2>
                        {maxResponses !== null && (
                            <p className={styles.responseInfo}>
                                Has respondido {responseCount} de {maxResponses} {maxResponses === 1 ? 'vez' : 'veces'}
                            </p>
                        )}
                        {maxResponses === null && (
                            <p className={styles.responseInfo}>
                                Has enviado {responseCount} {responseCount === 1 ? 'respuesta' : 'respuestas'}
                            </p>
                        )}
                        {hasReachedLimit ? (
                            <>
                                <p>Has alcanzado el límite de respuestas para esta actividad.</p>
                                <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Espera a la siguiente pregunta.</p>
                                <div className={styles.dots}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </>
                        ) : (
                            <>
                                <p>Puedes enviar otra respuesta si lo deseas.</p>
                                <Button
                                    onClick={() => {
                                        setSelectedAnswer(null)
                                        setError(null)
                                        setStep('activity')
                                    }}
                                    className={styles.submitButton}
                                >
                                    🔄 Responder de nuevo
                                </Button>
                            </>
                        )}
                    </div>
                </Card>
            </div>
        )
    }

    // Session ended
    if (step === 'ended') {
        return (
            <div className={styles.container}>
                <Card className={styles.card} shouldGlass>
                    <div className={styles.ended}>
                        <div className={styles.endedIcon}>👏</div>
                        <h2>Sesión finalizada</h2>
                        <p>¡Gracias por participar!</p>
                        <Button onClick={() => router.push('/')}>
                            Volver al inicio
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    return null
}
