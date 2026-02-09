
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
    const supabase = createClient()
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        if (error.message.includes('Invalid login credentials')) {
            return { error: 'Credenciales inválidas. Por favor verifica tu email y contraseña.' }
        }
        if (error.message.includes('Email not confirmed')) {
            return { error: 'Debes confirmar tu email antes de iniciar sesión.' }
        }
        return { error: 'Error al iniciar sesión: ' + error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(formData: FormData) {
    const supabase = createClient()
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: {
            data: {
                full_name: formData.get('full_name') as string,
            }
        }
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        if (error.message.includes('User already registered')) {
            return { error: 'Ya existe un usuario con este email.' }
        }
        if (error.message.includes('Password should be at least')) {
            return { error: 'La contraseña debe tener al menos 6 caracteres.' }
        }
        return { error: 'Error al registrarse: ' + error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
