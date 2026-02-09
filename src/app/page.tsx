import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
    return (
        <main className={styles.main}>
            <div className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1 className={styles.title}>
                        <span className={styles.gradient}>MiMentiMeter</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Participación interactiva en tiempo real para tus presentaciones
                    </p>
                    <p className={styles.description}>
                        Crea encuestas, nubes de palabras, quiz y más.
                        Tu audiencia participa desde sus móviles y los resultados se muestran al instante.
                    </p>

                    <div className={styles.actions}>
                        <Link href="/presenter/dashboard" className="btn btn-primary btn-lg">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            Soy Presentador
                        </Link>
                        <Link href="/participant/join" className="btn btn-secondary btn-lg">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                <line x1="12" y1="18" x2="12.01" y2="18" />
                            </svg>
                            Soy Participante
                        </Link>
                    </div>
                </div>

                <div className={styles.features}>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>📊</div>
                        <h3>Resultados en Tiempo Real</h3>
                        <p>Visualiza las respuestas al instante con gráficos animados</p>
                    </div>

                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>📱</div>
                        <h3>Acceso Móvil</h3>
                        <p>Los participantes votan desde sus smartphones sin apps</p>
                    </div>

                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>🎯</div>
                        <h3>Múltiples Actividades</h3>
                        <p>Encuestas, quiz, nubes de palabras y más</p>
                    </div>

                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>⚡</div>
                        <h3>Fácil y Rápido</h3>
                        <p>Crea presentaciones interactivas en minutos</p>
                    </div>
                </div>
            </div>
        </main>
    )
}
