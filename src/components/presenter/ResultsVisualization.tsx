
'use client'

import { useState, useEffect } from 'react'
import { Activity, ActivityType } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import styles from './ResultsVisualization.module.css'

interface ResultsVisualizationProps {
    activity: Activity
    sessionId?: string
    initialResponses?: Response[]
}

interface Response {
    id: string
    answer: {
        type: string
        choice_ids?: string[]
        choice_id?: string
        value?: number
        answer?: boolean
        text?: string
        words?: string[]
    }
}

export function ResultsVisualization({ activity, sessionId, initialResponses }: ResultsVisualizationProps) {
    const supabase = createClient()
    const [responses, setResponses] = useState<Response[]>(initialResponses || [])
    const [totalResponses, setTotalResponses] = useState(initialResponses?.length || 0)

    useEffect(() => {
        // If initialResponses provided, use them and update on change
        if (initialResponses) {
            setResponses(initialResponses)
            setTotalResponses(initialResponses.length)
            return
        }

        if (!sessionId) return

        loadResponses()

        // Subscribe to new responses
        const channel = supabase
            .channel(`results-${activity.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'responses',
                    filter: `activity_id=eq.${activity.id}`
                },
                (payload) => {
                    setResponses(prev => [...prev, payload.new as Response])
                    setTotalResponses(prev => prev + 1)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [activity.id, sessionId, supabase, initialResponses])

    const loadResponses = async () => {
        const { data, count } = await supabase
            .from('responses')
            .select('id, answer', { count: 'exact' })
            .eq('activity_id', activity.id)
            .eq('session_id', sessionId)

        if (data) {
            setResponses(data as Response[])
            setTotalResponses(count || 0)
        }
    }

    const renderVisualization = () => {
        switch (activity.type) {
            case 'multiple_choice':
            case 'quiz':
                return <MultipleChoiceResults activity={activity} responses={responses} total={totalResponses} />

            case 'true_false':
                return <TrueFalseResults responses={responses} total={totalResponses} />

            case 'scale':
                return <ScaleResults activity={activity} responses={responses} total={totalResponses} />

            case 'word_cloud':
                return <WordCloudResults responses={responses} total={totalResponses} />

            case 'open_text':
                return <OpenTextResults responses={responses} total={totalResponses} />

            case 'image_choice':
                return <ImageChoiceResults activity={activity} responses={responses} total={totalResponses} />

            default:
                return <div className={styles.noResults}>No hay visualización disponible para este tipo de actividad</div>
        }
    }

    return (
        <Card className={styles.container}>
            <div className={styles.header}>
                <h3>Resultados en Tiempo Real</h3>
                <div className={styles.counter}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>{totalResponses} respuestas</span>
                </div>
            </div>

            {totalResponses === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📊</div>
                    <p>Esperando respuestas...</p>
                </div>
            ) : (
                renderVisualization()
            )}
        </Card>
    )
}

// Multiple Choice & Quiz Results
function MultipleChoiceResults({ activity, responses, total }: { activity: Activity; responses: Response[]; total: number }) {
    const choices = 'choices' in activity.options
        ? (activity.options as { choices: { id: string; text: string; is_correct?: boolean }[] }).choices
        : []

    const counts = choices.map(choice => {
        const count = responses.filter(r =>
            r.answer.choice_ids?.includes(choice.id) || r.answer.choice_id === choice.id
        ).length
        return { ...choice, count, percentage: total > 0 ? (count / total) * 100 : 0 }
    })

    const maxCount = Math.max(...counts.map(c => c.count), 1)

    return (
        <div className={styles.barChart}>
            {counts.map((choice, i) => (
                <div key={choice.id} className={styles.barRow}>
                    <div className={styles.barLabel}>
                        <span className={styles.barLetter}>{String.fromCharCode(65 + i)}</span>
                        <span className={styles.barText}>{choice.text}</span>
                        {choice.is_correct && <span className={styles.correctBadge}>✓</span>}
                    </div>
                    <div className={styles.barContainer}>
                        <div
                            className={`${styles.bar} ${choice.is_correct ? styles.correctBar : ''}`}
                            style={{ width: `${(choice.count / maxCount) * 100}%` }}
                        >
                            <span className={styles.barValue}>{choice.count}</span>
                        </div>
                    </div>
                    <span className={styles.barPercentage}>{choice.percentage.toFixed(0)}%</span>
                </div>
            ))}
        </div>
    )
}

// True/False Results
function TrueFalseResults({ responses, total }: { responses: Response[]; total: number }) {
    const trueCount = responses.filter(r => r.answer.answer === true).length
    const falseCount = responses.filter(r => r.answer.answer === false).length
    const truePercentage = total > 0 ? (trueCount / total) * 100 : 0
    const falsePercentage = total > 0 ? (falseCount / total) * 100 : 0

    return (
        <div className={styles.tfResults}>
            <div className={styles.tfOption}>
                <div className={styles.tfIcon}>✅</div>
                <div className={styles.tfLabel}>Verdadero</div>
                <div className={styles.tfBar}>
                    <div className={styles.tfBarFill} style={{ width: `${truePercentage}%` }}></div>
                </div>
                <div className={styles.tfStats}>
                    <span className={styles.tfCount}>{trueCount}</span>
                    <span className={styles.tfPercent}>{truePercentage.toFixed(0)}%</span>
                </div>
            </div>
            <div className={styles.tfOption}>
                <div className={styles.tfIcon}>❌</div>
                <div className={styles.tfLabel}>Falso</div>
                <div className={styles.tfBar}>
                    <div className={styles.tfBarFill} style={{ width: `${falsePercentage}%` }}></div>
                </div>
                <div className={styles.tfStats}>
                    <span className={styles.tfCount}>{falseCount}</span>
                    <span className={styles.tfPercent}>{falsePercentage.toFixed(0)}%</span>
                </div>
            </div>
        </div>
    )
}

// Scale Results
function ScaleResults({ activity, responses, total }: { activity: Activity; responses: Response[]; total: number }) {
    const scaleOptions = activity.options as { min: number; max: number; min_label: string; max_label: string }
    const min = scaleOptions.min || 1
    const max = scaleOptions.max || 10

    const counts = Array.from({ length: max - min + 1 }, (_, i) => {
        const value = min + i
        const count = responses.filter(r => r.answer.value === value).length
        return { value, count }
    })

    const maxCount = Math.max(...counts.map(c => c.count), 1)
    const average = responses.length > 0
        ? responses.reduce((sum, r) => sum + (r.answer.value || 0), 0) / responses.length
        : 0

    return (
        <div className={styles.scaleResults}>
            <div className={styles.scaleAverage}>
                <span className={styles.averageLabel}>Promedio</span>
                <span className={styles.averageValue}>{average.toFixed(1)}</span>
            </div>
            <div className={styles.scaleChart}>
                {counts.map(({ value, count }) => (
                    <div key={value} className={styles.scaleBar}>
                        <div
                            className={styles.scaleBarFill}
                            style={{ height: `${(count / maxCount) * 100}%` }}
                        >
                            {count > 0 && <span className={styles.scaleBarValue}>{count}</span>}
                        </div>
                        <span className={styles.scaleBarLabel}>{value}</span>
                    </div>
                ))}
            </div>
            <div className={styles.scaleLabels}>
                <span>{scaleOptions.min_label || min}</span>
                <span>{scaleOptions.max_label || max}</span>
            </div>
        </div>
    )
}

// Word Cloud Results
function WordCloudResults({ responses, total }: { responses: Response[]; total: number }) {
    const wordCounts = new Map<string, number>()

    responses.forEach(r => {
        const words = r.answer.words || []
        words.forEach(word => {
            const normalized = word.toLowerCase().trim()
            if (normalized) {
                wordCounts.set(normalized, (wordCounts.get(normalized) || 0) + 1)
            }
        })
    })

    const sortedWords = Array.from(wordCounts.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)

    const maxCount = Math.max(...sortedWords.map(w => w.count), 1)

    return (
        <div className={styles.wordCloud}>
            {sortedWords.map(({ word, count }) => {
                const size = 0.8 + (count / maxCount) * 2.2 // 0.8rem to 3rem
                return (
                    <span
                        key={word}
                        className={styles.word}
                        style={{ fontSize: `${size}rem` }}
                        title={`${count} veces`}
                    >
                        {word}
                    </span>
                )
            })}
        </div>
    )
}

// Open Text Results
function OpenTextResults({ responses, total }: { responses: Response[]; total: number }) {
    return (
        <div className={styles.textResponses}>
            {responses.map((r, i) => (
                <div key={r.id} className={styles.textResponse}>
                    <span className={styles.responseNumber}>#{i + 1}</span>
                    <p>{r.answer.text}</p>
                </div>
            ))}
        </div>
    )
}
// Image Choice Results
function ImageChoiceResults({ activity, responses, total }: { activity: Activity; responses: Response[]; total: number }) {
    const choices = 'choices' in activity.options
        ? (activity.options as { choices: { id: string; text: string; image_url: string }[] }).choices
        : []

    const counts = choices.map(choice => {
        const count = responses.filter(r =>
            r.answer.choice_ids?.includes(choice.id) || r.answer.choice_id === choice.id
        ).length
        return { ...choice, count, percentage: total > 0 ? (count / total) * 100 : 0 }
    })

    const maxCount = Math.max(...counts.map(c => c.count), 1)

    return (
        <div className={styles.imageGridResults}>
            {counts.map((choice) => (
                <div key={choice.id} className={styles.imageResultCard}>
                    <div className={styles.imageWrapper}>
                        {choice.image_url && <img src={choice.image_url} alt={choice.text} />}
                        <div className={styles.imageVoteBadge}>
                            {choice.count}
                        </div>
                    </div>
                    <div className={styles.imageResultInfo}>
                        <span className={styles.imageResultText}>{choice.text}</span>
                        <div className={styles.imageResultBar}>
                            <div
                                className={styles.imageResultBarFill}
                                style={{ width: `${(choice.count / maxCount) * 100}%` }}
                            ></div>
                        </div>
                        <span className={styles.imageResultPercent}>{choice.percentage.toFixed(0)}%</span>
                    </div>
                </div>
            ))}
        </div>
    )
}
