# MiMentiMeter

Aplicación web para participación interactiva del público en ponencias y formaciones masivas, similar a Mentimeter.

## 🚀 Características

- ✅ **Resultados en Tiempo Real**: Visualiza las respuestas al instante con gráficos animados
- ✅ **Acceso Móvil**: Los participantes votan desde sus smartphones sin necesidad de apps
- ✅ **Múltiples Tipos de Actividades**: 
  - Encuestas de opción múltiple
  - Nubes de palabras
  - Preguntas abiertas
  - Escalas de valoración
  - Quiz con ranking
  - Verdadero/Falso
- ✅ **Diseño Premium**: Interfaz moderna con glassmorphism y animaciones fluidas
- ✅ **Sin Registro para Participantes**: Acceso rápido mediante código

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14 + React 18 + TypeScript
- **Estilos**: CSS Modules + Variables CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Tiempo Real**: Supabase Realtime (WebSockets)
- **Hosting**: Vercel (recomendado)

## 📦 Instalación

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd MiMentiMeter

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Ejecutar en desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🗂️ Estructura del Proyecto

```
MiMentiMeter/
├── src/
│   ├── app/                    # App Router de Next.js
│   │   ├── (presenter)/       # Rutas del presentador
│   │   │   └── dashboard/
│   │   ├── (participant)/     # Rutas del participante
│   │   │   └── join/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Landing page
│   │   └── globals.css        # Estilos globales
│   ├── components/            # Componentes reutilizables
│   ├── lib/                   # Utilidades y helpers
│   └── types/                 # Definiciones TypeScript
├── public/                    # Archivos estáticos
└── package.json
```

## 🎨 Sistema de Diseño

El proyecto utiliza un sistema de diseño basado en variables CSS:

- **Colores**: Paleta vibrante con violeta y rosa como colores principales
- **Modo Oscuro**: Por defecto para mejor proyección
- **Glassmorphism**: Efectos de vidrio en cards y modales
- **Animaciones**: Transiciones fluidas y micro-animaciones
- **Responsive**: Mobile-first design

## 🔧 Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
```

## 📝 Roadmap

### ✅ Fase 1: Infraestructura Base (Completada)
- [x] Configuración de Next.js + TypeScript
- [x] Sistema de diseño y estilos globales
- [x] Estructura de rutas
- [x] Definiciones TypeScript

### 🚧 Fase 2: Base de Datos y Autenticación (En progreso)
- [ ] Configuración de Supabase
- [ ] Tablas de base de datos
- [ ] Sistema de autenticación
- [ ] Gestión de sesiones

### 📋 Fase 3: Panel del Presentador
- [ ] CRUD de presentaciones
- [ ] Editor de actividades
- [ ] Vista de control en vivo
- [ ] Generación de códigos QR

### 📋 Fase 4: Interfaz del Participante
- [ ] Sistema de unión por código
- [ ] Interfaz de votación móvil
- [ ] Feedback visual

### 📋 Fase 5: Tipos de Actividades
- [ ] Encuestas de opción múltiple
- [ ] Nubes de palabras
- [ ] Preguntas abiertas
- [ ] Escalas de valoración
- [ ] Quiz con ranking
- [ ] Verdadero/Falso

### 📋 Fase 6: Visualización en Tiempo Real
- [ ] WebSockets con Supabase Realtime
- [ ] Gráficos animados
- [ ] Actualización automática de resultados

### 📋 Fase 7: Testing y Optimización
- [ ] Tests unitarios
- [ ] Tests E2E
- [ ] Optimización de rendimiento

### 📋 Fase 8: Despliegue
- [ ] Configuración de Vercel
- [ ] Dominio personalizado
- [ ] Documentación de usuario

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

## 📧 Contacto

Para preguntas o sugerencias, abre un issue en GitHub.
