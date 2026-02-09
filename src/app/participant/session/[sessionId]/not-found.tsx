
import Link from 'next/link'
import styles from './not-found.module.css'

export default function SessionNotFound() {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.icon}>🔍</div>
                <h1>Sesión no encontrada</h1>
                <p>
                    El código de sesión que ingresaste no es válido o la sesión ha finalizado.
                </p>
                <Link href="/participant/join" className="btn btn-primary">
                    Intentar de nuevo
                </Link>
            </div>
        </div>
    )
}
