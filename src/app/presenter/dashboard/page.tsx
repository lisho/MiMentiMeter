import Link from 'next/link'
import styles from './dashboard.module.css'

export default function PresenterDashboard() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <Link href="/" className={styles.logo}>
                        <span className={styles.logoGradient}>MiMentiMeter</span>
                    </Link>
                    <nav className={styles.nav}>
                        <button className="btn btn-ghost">Mi Cuenta</button>
                    </nav>
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.welcome}>
                    <h1>Panel del Presentador</h1>
                    <p className="text-secondary">Gestiona tus presentaciones interactivas</p>
                </div>

                <div className={styles.actions}>
                    <button className="btn btn-primary btn-lg">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Nueva Presentación
                    </button>
                </div>

                <div className={styles.presentations}>
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📊</div>
                        <h3>No tienes presentaciones aún</h3>
                        <p className="text-muted">
                            Crea tu primera presentación interactiva para comenzar
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}
