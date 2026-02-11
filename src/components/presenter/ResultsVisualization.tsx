
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Activity, ActivityType } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import styles from './ResultsVisualization.module.css'
import cloud from 'd3-cloud'
import { select } from 'd3-selection'
import { scaleLinear } from 'd3-scale'
import { Button } from '@/components/ui/Button'

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
    const fullscreenRef = useRef<HTMLDivElement>(null)

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            fullscreenRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    // Load responses from server
    const loadResponses = async () => {
        if (!sessionId) return

        const { data, count } = await supabase
            .from('responses')
            .select('id, answer', { count: 'exact' })
            .eq('activity_id', activity.id)
            .eq('session_id', sessionId)

        if (data) {
            setResponses(data as Response[])
            setTotalResponses(count || data.length)
        }
    }

    useEffect(() => {
        // Set initial responses if provided
        if (initialResponses) {
            setResponses(initialResponses)
            setTotalResponses(initialResponses.length)
        } else if (sessionId) {
            // Load responses if not provided
            loadResponses()
        }

        // Subscribe to new responses for real-time updates
        const channelName = sessionId
            ? `results-${activity.id}-${sessionId}`
            : `results-${activity.id}`

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'responses',
                    filter: `activity_id=eq.${activity.id}`
                },
                (payload) => {
                    console.log('[ResultsVisualization] Realtime INSERT received:', payload.new)
                    const newResponse = payload.new as any
                    // If sessionId is specified, only add responses from that session
                    if (!sessionId || newResponse.session_id === sessionId) {
                        setResponses(prev => {
                            // Avoid duplicates
                            if (prev.some(r => r.id === newResponse.id)) return prev
                            return [...prev, newResponse as Response]
                        })
                        setTotalResponses(prev => prev + 1)
                    }
                }
            )
            .subscribe((status) => {
                console.log(`[ResultsVisualization] Realtime status for ${activity.id}:`, status)
            })

        // Polling fallback every 3 seconds to catch responses even if Realtime fails
        const pollingInterval = setInterval(() => {
            if (sessionId) {
                loadResponses()
            }
        }, 3000)

        return () => {
            supabase.removeChannel(channel).catch(err => console.error('Error removing channel:', err))
            clearInterval(pollingInterval)
        }
    }, [activity.id, sessionId])

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
        <div ref={fullscreenRef} className={styles.container} style={{ backgroundColor: 'white', borderRadius: '8px', height: '100%', overflowY: 'auto' }}>
            <div className={styles.header}>
                <h3>Resultados en Tiempo Real</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className={styles.counter}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span>{totalResponses} respuestas</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={toggleFullscreen} title="Pantalla Completa">
                        ⛶
                    </Button>
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
        </div>
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
// Word Cloud Results
function WordCloudResults({ responses, total }: { responses: Response[]; total: number }) {
    const svgRef = useRef<SVGSVGElement>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const containerRef = useRef<HTMLDivElement>(null)
    const previousWordsRef = useRef<string>('')
    const [refreshKey, setRefreshKey] = useState(0)

    // Process words
    const words = useMemo(() => {
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

        return Array.from(wordCounts.entries())
            .map(([text, value]) => ({ text, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 100) // Limit to top 100 words
    }, [responses])

    // Update dimensions on resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { width } = containerRef.current.getBoundingClientRect()
                // Height based on width but constrained
                const height = Math.min(500, width * 0.6)
                setDimensions({ width, height })
            }
        }

        updateDimensions()
        window.addEventListener('resize', updateDimensions)
        return () => window.removeEventListener('resize', updateDimensions)
    }, [])

    // Draw cloud
    useEffect(() => {
        if (!dimensions.width || !dimensions.height || words.length === 0 || !svgRef.current) return

        // Deep compare check: now includes refreshKey to allow force updates
        const currentDataHash = JSON.stringify(words) + `-${refreshKey}`
        if (currentDataHash === previousWordsRef.current && svgRef.current.hasChildNodes()) return
        previousWordsRef.current = currentDataHash

        const { width, height } = dimensions

        // Setup SVG group once
        const svg = select(svgRef.current)
        svg.attr('width', width).attr('height', height)

        let g = svg.select<SVGGElement>('g')
        if (g.empty()) {
            g = svg.append('g')
                .attr('transform', `translate(${width / 2},${height / 2})`)
        } else {
            g.attr('transform', `translate(${width / 2},${height / 2})`)
        }

        // Configure scale
        const maxVal = Math.max(...words.map(w => w.value), 1)
        const minVal = Math.min(...words.map(w => w.value), 1)

        const fontScale = scaleLinear()
            .domain([minVal, maxVal])
            .range([20, 80])

        // Colors - Autumn/Warm palette
        const colors = ['#8B0000', '#A52A2A', '#B22222', '#8B4513', '#D2691E', '#CD853F', '#B8860B', '#DAA520', '#556B2F', '#2F4F4F']

        // Deterministic rotation based on text hash + refreshKey for manual reload
        const getRotate = (text: string) => {
            let hash = 0
            for (let i = 0; i < text.length; i++) {
                hash = text.charCodeAt(i) + ((hash << 5) - hash) + refreshKey
            }
            return (Math.abs(hash) % 2 === 0) ? 0 : 90
        }

        const layout = cloud()
            .size([width, height])
            .words(words.map((d, index) => ({ text: d.text, size: fontScale(d.value), value: d.value, rank: index })))
            .padding(13) // Set to exactly 13px as requested
            .rotate((d: any) => (d.rank < 3 ? 0 : getRotate(d.text)))
            .font('Inter, sans-serif') // Keep synchronized font for accuracy
            .fontSize((d: any) => d.size)
            .on('end', draw)

        layout.start()

        function draw(layoutWords: any[]) {
            // Data Join
            const texts = g.selectAll<SVGTextElement, any>('text')
                .data(layoutWords, (d: any) => d.text);

            // EXIT - Remove old words
            texts.exit().remove();

            // UPDATE - Move existing words
            texts
                .style('font-size', (d: any) => `${d.size}px`)
                .style('fill', (d: any, i: number) => colors[i % colors.length])
                .attr('transform', (d: any) => `translate(${d.x},${d.y})rotate(${d.rotate})`)
                .style('opacity', 1);

            // ENTER - Add new words
            texts.enter()
                .append('text')
                .style('font-size', (d: any) => `${d.size}px`)
                .style('font-family', 'Inter, sans-serif')
                .style('fill', (d: any, i: number) => colors[i % colors.length])
                .attr('text-anchor', 'middle')
                .attr('transform', (d: any) => `translate(${d.x},${d.y})rotate(${d.rotate})`)
                .text((d: any) => d.text)
                .style('cursor', 'default')
                .style('opacity', 1);

            g.selectAll('text').select('title').remove()
            g.selectAll('text').append('title').text((d: any) => `${d.value} veces`)
        }

    }, [words, dimensions, refreshKey])

    return (
        <div className={styles.wordCloudContainer} style={{ position: 'relative', width: '100%' }}>
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    minHeight: '400px',
                    display: 'flex',
                    justifyContent: 'center',
                    backgroundColor: '#fafafa',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)',
                    border: '1px solid #eee'
                }}
            >
                <svg ref={svgRef} />
            </div>
            <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    title="Recargar nube"
                    style={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)' }}
                >
                    🔄
                </Button>
            </div>
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
