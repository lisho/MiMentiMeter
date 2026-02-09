
'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { login, signup } from '../actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export default function LoginPage() {
    const searchParams = useSearchParams()
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(searchParams.get('message'))

    const toggleMode = () => {
        setIsLogin(!isLogin)
        setMessage(null)
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setMessage(null)

        const formData = new FormData(event.currentTarget)

        try {
            let result;
            if (isLogin) {
                result = await login(formData)
            } else {
                result = await signup(formData)
            }

            if (result?.error) {
                setMessage(result.error)
            }
        } catch (error) {
            console.error(error)
            setMessage('Ocurrió un error. Por favor intenta de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-dark)]">
            <Card className="w-full max-w-md p-8 space-y-6" shouldGlass>
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                        {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta'}
                    </h1>
                    <p className="text-[var(--text-muted)]">
                        {isLogin
                            ? 'Ingresa tus credenciales para acceder a tu cuenta'
                            : 'Regístrate para comenzar a crear presentaciones interactivas'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="space-y-2">
                            <label htmlFor="full_name" className="text-sm font-medium text-[var(--text-primary)]">
                                Nombre Completo
                            </label>
                            <Input
                                id="full_name"
                                name="full_name"
                                placeholder="Juan Pérez"
                                required={!isLogin}
                                className="bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-[var(--text-primary)]">
                            Correo Electrónico
                        </label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="nombre@ejemplo.com"
                            required
                            className="bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-[var(--text-primary)]">
                            Contraseña
                        </label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            minLength={6}
                            className="bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]"
                        />
                    </div>

                    {message && (
                        <p className="text-sm text-red-500 text-center">{message}</p>
                    )}

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                        isLoading={loading}
                    >
                        {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
                    </Button>
                </form>

                <div className="text-center text-sm">
                    <span className="text-[var(--text-muted)]">
                        {isLogin ? '¿No tienes una cuenta? ' : '¿Ya tienes una cuenta? '}
                    </span>
                    <button
                        onClick={toggleMode}
                        className="font-medium text-[var(--primary)] hover:text-[var(--primary-light)] underline underline-offset-4"
                    >
                        {isLogin ? 'Regístrate' : 'Inicia Sesión'}
                    </button>
                </div>
            </Card>
        </div>
    )
}
