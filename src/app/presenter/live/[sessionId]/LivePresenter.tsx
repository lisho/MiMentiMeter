'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Session, Presentation, Activity, ActivityType } from '@/types'
import { endSession, updateCurrentActivity } from '../../actions'
import { getSessionResults, exportSessionData } from '../../results/actions'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { QRCodeSVG } from 'qrcode.react'
import { ResultsVisualization } from '@/components/presenter/ResultsVisualization'
import styles from './live.module.css'

interface LivePresenterProps {
    session: Session
    presentation: Presentation
    activities: Activity[]
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

export function LivePresenter({ session, presentation, activities }: LivePresenterProps) {
    const router = useRouter()
    const supabase = createClient()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [responses, setResponses] = useState<Record<string, number>>({})
    const [participantCount, setParticipantCount] = useState(0)
    const [showQR, setShowQR] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [showExportMenu, setShowExportMenu] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting')
    const [mounted, setMounted] = useState(false)
    const fullscreenRef = useRef<HTMLDivElement>(null)

    const currentActivity = activities[currentIndex] || null
    const joinUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/participant/join?code=${session.access_code}`
        : ''

    const loadData = async () => {
        setIsRefreshing(true)
        console.log('🔄 Sincronizando datos desde servidor...')
        try {
            // Usar Server Action para evitar problemas de RLS en cliente
            const result = await getSessionResults(session.id)

            if (result.error || !result.data) {
                console.error('Error al obtener resultados:', result.error)
                setConnectionStatus('error')
                return
            }

            const { participants, responses: allResponses } = result.data

            setParticipantCount(participants ? participants.length : 0)

            // Procesar conteos localmente
            const newResponses: Record<string, number> = {}
            activities.forEach(a => newResponses[a.id] = 0)

            if (allResponses) {
                // Tipado seguro para la respuesta
                const typedResponses = allResponses as Array<{ activity_id: string }>
                typedResponses.forEach(r => {
                    if (newResponses[r.activity_id] !== undefined) {
                        newResponses[r.activity_id]++
                    }
                })
            }

            setResponses(newResponses)
            setLastUpdated(new Date())
            console.log('✅ Datos actualizados correctamente vía Server Action')
            if (connectionStatus === 'error') setConnectionStatus('connected') // Si funciona la server action, estamos "conectados" funcionalmente
        } catch (err) {
            console.error('❌ Error al sincronizar:', err)
            setConnectionStatus('error')
        } finally {
            setIsRefreshing(false)
        }
    }

    useEffect(() => {
        setMounted(true)
        // Subscribe to real-time responses
        setConnectionStatus('connecting')

        const channel = supabase
            .channel(`live_session_${session.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'responses',
                    filter: `session_id=eq.${session.id}`
                },
                (payload) => {
                    console.log('⚡ Nueva respuesta detectada:', payload.new)
                    const newResponse = payload.new as { activity_id: string }

                    // Incrementar el contador de la actividad específica
                    setResponses(prev => ({
                        ...prev,
                        [newResponse.activity_id]: (prev[newResponse.activity_id] || 0) + 1
                    }))
                    setLastUpdated(new Date())
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'participants',
                    filter: `session_id=eq.${session.id}`
                },
                () => loadData()
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setConnectionStatus('connected')
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setConnectionStatus('error')
                }
            })

        loadData()

        // Fallback: Si no hay realtime, refrescar cada 3 segundos (Modo Polling)
        const fallbackInterval = setInterval(() => {
            if (connectionStatus !== 'connected') {
                loadData()
            }
        }, 3000)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(fallbackInterval)
        }
    }, [session.id, activities, supabase, connectionStatus])

    const handleEndSession = async () => {
        if (confirm('¿Estás seguro de que deseas finalizar la sesión?')) {
            await endSession(session.id)
            router.push('/presenter/dashboard')
        }
    }

    const goToNext = async () => {
        if (currentIndex < activities.length - 1) {
            const newIndex = currentIndex + 1
            const prevIndex = currentIndex
            setCurrentIndex(newIndex)
            setShowResults(false)
            const result = await updateCurrentActivity(session.id, newIndex)
            if (result.error) {
                console.error('Error updating activity:', result.error)
                setCurrentIndex(prevIndex) // Revert on failure
            }
        }
    }

    const goToPrev = async () => {
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1
            const prevIndex = currentIndex
            setCurrentIndex(newIndex)
            setShowResults(false)
            const result = await updateCurrentActivity(session.id, newIndex)
            if (result.error) {
                console.error('Error updating activity:', result.error)
                setCurrentIndex(prevIndex) // Revert on failure
            }
        }
    }

    const handleExport = async (format: 'json' | 'csv') => {
        const result = await exportSessionData(session.id, format)

        if (result.error || !result.data) {
            alert('Error al exportar datos')
            return
        }

        const blob = new Blob([result.data], {
            type: format === 'json' ? 'application/json' : 'text/csv'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `session-${session.access_code}-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setShowExportMenu(false)
    }

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            fullscreenRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    return (
        <div ref={fullscreenRef} className={styles.container}>
            {/* Top Bar */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.liveIndicator}>
                        <span className={styles.liveDot}></span>
                        EN VIVO
                    </div>
                    <h1 className={styles.title}>{presentation.title}</h1>
                </div>
                <div className={styles.headerCenter}>
                    <div className={styles.codeDisplay}>
                        <span className={styles.codeLabel}>Código:</span>
                        <span className={styles.code}>{session.access_code}</span>
                    </div>
                    <div className={styles.participants}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span>{participantCount}</span>
                    </div>
                    <div className={styles.syncInfo}>
                        <div className={`${styles.statusIndicator} ${styles[connectionStatus]}`} title={`Conexión: ${connectionStatus}`}></div>
                        <span className={styles.lastUpdate}>
                            {mounted && lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                        </span>
                        <button
                            className={`${styles.refreshButton} ${isRefreshing ? styles.spinning : ''}`}
                            onClick={loadData}
                            title="Sincronizar ahora"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 4v6h-6" />
                                <path d="M1 20v-6h6" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.exportWrapper}>
                        <button
                            className={styles.exportButton}
                            onClick={() => setShowExportMenu(!showExportMenu)}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Exportar
                        </button>
                        {showExportMenu && (
                            <div className={styles.exportMenu}>
                                <button onClick={() => handleExport('json')}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    Exportar JSON
                                </button>
                                <button onClick={() => handleExport('csv')}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    Exportar CSV
                                </button>
                            </div>
                        )}
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={toggleFullscreen}
                        title="Pantalla Completa"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                        Presentar
                    </Button>
                    <Button variant="secondary" onClick={handleEndSession}>
                        Finalizar Sesión
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                {activities.length === 0 ? (
                    <Card className={styles.emptyState} shouldGlass>
                        <div className={styles.emptyIcon}>📝</div>
                        <h2>No hay actividades</h2>
                        <p>Esta presentación no tiene actividades configuradas.</p>
                    </Card>
                ) : currentActivity ? (
                    <div className={styles.activityDisplay}>
                        <div className={styles.activityHeader}>
                            <span className={styles.activityType}>
                                {activityTypeIcons[currentActivity.type]} {currentActivity.type.replace('_', ' ').toUpperCase()}
                            </span>
                            <div className={styles.headerActions}>
                                <button
                                    className={`${styles.viewToggle} ${!showResults ? styles.active : ''}`}
                                    onClick={() => setShowResults(false)}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <polyline points="10 9 9 9 8 9" />
                                    </svg>
                                    Pregunta
                                </button>
                                <button
                                    className={`${styles.viewToggle} ${showResults ? styles.active : ''}`}
                                    onClick={() => setShowResults(true)}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="20" x2="12" y2="10" />
                                        <line x1="18" y1="20" x2="18" y2="4" />
                                        <line x1="6" y1="20" x2="6" y2="16" />
                                    </svg>
                                    Resultados
                                </button>
                                <span className={styles.activityProgress}>
                                    {currentIndex + 1} / {activities.length}
                                </span>
                            </div>
                        </div>

                        {!showResults ? (
                            <>
                                <h2 className={styles.question}>{currentActivity.question}</h2>

                                {currentActivity.type === 'multiple_choice' && 'choices' in currentActivity.options && (
                                    <div className={styles.choicesGrid}>
                                        {(currentActivity.options as { choices: { id: string; text: string }[] }).choices.map((choice, i) => (
                                            <div key={choice.id} className={styles.choiceCard}>
                                                <span className={styles.choiceLetter}>
                                                    {String.fromCharCode(65 + i)}
                                                </span>
                                                <span className={styles.choiceText}>{choice.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className={styles.responseCounter}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                    <span>{responses[currentActivity.id] || 0} respuestas</span>
                                </div>
                            </>
                        ) : (
                            <ResultsVisualization
                                activity={currentActivity}
                                sessionId={session.id}
                            />
                        )}
                    </div>
                ) : null}
            </main>

            {/* Navigation */}
            {activities.length > 0 && (
                <footer className={styles.footer}>
                    <Button
                        variant="secondary"
                        onClick={goToPrev}
                        disabled={currentIndex === 0}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Anterior
                    </Button>

                    <div className={styles.progressDots}>
                        {activities.map((_, i) => (
                            <button
                                key={i}
                                className={`${styles.dot} ${i === currentIndex ? styles.active : ''}`}
                                onClick={() => setCurrentIndex(i)}
                                aria-label={`Ir a actividad ${i + 1}`}
                            />
                        ))}
                    </div>

                    <Button
                        variant="primary"
                        onClick={goToNext}
                        disabled={currentIndex === activities.length - 1}
                    >
                        Siguiente
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </Button>
                </footer>
            )}

            {/* QR Code Toggle Button */}
            <button
                className={styles.qrToggle}
                onClick={() => setShowQR(!showQR)}
                aria-label="Mostrar código QR"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                </svg>
            </button>

            {/* QR Code Modal */}
            {showQR && (
                <div className={styles.qrOverlay} onClick={() => setShowQR(false)}>
                    <div className={styles.qrModal} onClick={(e) => e.stopPropagation()}>
                        <h3>Escanea para unirte</h3>
                        <div className={styles.qrCode}>
                            <QRCodeSVG
                                value={joinUrl}
                                size={200}
                                level="H"
                                includeMargin={true}
                            />
                        </div>
                        <p className={styles.qrUrl}>{joinUrl}</p>
                        <p className={styles.qrCodeText}>Código: <strong>{session.access_code}</strong></p>
                    </div>
                </div>
            )}
        </div>
    )
}
