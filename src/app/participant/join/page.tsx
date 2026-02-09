
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { joinSession } from '../actions'
import styles from './join.module.css'

export default function ParticipantJoin() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [code, setCode] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Check if code is provided in URL (from QR scan)
    useEffect(() => {
        const codeFromUrl = searchParams.get('code')
        if (codeFromUrl) {
            setCode(codeFromUrl.toUpperCase())
            // Auto-submit if code is provided
            handleJoinWithCode(codeFromUrl)
        }
    }, [searchParams])

    const handleJoinWithCode = async (accessCode: string) => {
        setLoading(true)
        setError(null)

        const result = await joinSession(accessCode)

        if (result.error) {
            setError(result.error)
            setLoading(false)
            return
        }

        if (result.data) {
            // Store session info and redirect
            sessionStorage.setItem('sessionId', result.data.sessionId)
            sessionStorage.setItem('presentationTitle', result.data.presentationTitle)
            router.push(`/participant/session/${result.data.sessionId}`)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (code.trim().length < 3) return
        await handleJoinWithCode(code)
    }

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoGradient}>MiMentiMeter</span>
                </Link>

                <div className={styles.card}>
                    <div className={styles.icon}>📱</div>
                    <h1>Unirse a una Sesión</h1>
                    <p className="text-secondary">
                        Introduce el código que aparece en la pantalla del presentador
                    </p>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <input
                            type="text"
                            className={`input ${styles.codeInput} ${error ? styles.inputError : ''}`}
                            placeholder="Ej: ABC123"
                            value={code}
                            onChange={(e) => {
                                setCode(e.target.value.toUpperCase())
                                setError(null)
                            }}
                            maxLength={6}
                            autoFocus
                            disabled={loading}
                        />

                        {error && <p className={styles.error}>{error}</p>}

                        <button
                            type="submit"
                            className={`btn btn-primary btn-lg ${loading ? 'opacity-70' : ''}`}
                            disabled={code.length < 3 || loading}
                        >
                            {loading ? (
                                <>
                                    <span className={styles.spinner}></span>
                                    Conectando...
                                </>
                            ) : (
                                'Unirse'
                            )}
                        </button>
                    </form>
                </div>

                <div className={styles.help}>
                    <p className="text-muted">
                        ¿Eres presentador? <Link href="/presenter/dashboard">Inicia sesión aquí</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
