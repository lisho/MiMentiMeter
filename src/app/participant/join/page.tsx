'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './join.module.css'

export default function ParticipantJoin() {
    const [code, setCode] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (code.trim()) {
            // TODO: Validar código y redirigir a la sesión
            window.location.href = `/participant/session/${code.toUpperCase()}`
        }
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
                            className={`input ${styles.codeInput}`}
                            placeholder="Ej: ABC123"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={code.length < 3}
                        >
                            Unirse
                        </button>
                    </form>

                    <div className={styles.divider}>
                        <span>o</span>
                    </div>

                    <button className="btn btn-secondary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <path d="M9 9h6v6H9z" />
                        </svg>
                        Escanear Código QR
                    </button>
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
