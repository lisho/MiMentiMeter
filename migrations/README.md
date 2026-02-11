# Migraciones de Base de Datos

Este directorio contiene scripts SQL para migrar la base de datos de Supabase.

## 🚨 Migración Requerida: Habilitar Respuestas Múltiples

Para que la funcionalidad de respuestas múltiples funcione correctamente, **debes ejecutar** el siguiente script en tu base de datos de Supabase:

### Archivo: `enable_multiple_responses.sql`

Este script realiza dos cambios críticos:

1. **Elimina el constraint UNIQUE** en `(activity_id, participant_id)` de la tabla `responses`
   - Sin esto, los participantes no pueden enviar más de una respuesta por actividad
   
2. **Corrige la política RLS** para permitir inserts anónimos en la tabla `responses`
   - Los participantes no son usuarios autenticados de Supabase, solo tienen un `participant_id` en sessionStorage

### Cómo ejecutar la migración:

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **SQL Editor** en el menú lateral
3. Crea una nueva query
4. Copia y pega el contenido completo de `enable_multiple_responses.sql`
5. Haz clic en **Run** (o presiona `Ctrl+Enter`)
6. Verifica que veas el mensaje: `✓✓✓ MIGRATION COMPLETED SUCCESSFULLY ✓✓✓`

### Verificación

El script incluye verificación automática. Después de ejecutarlo, deberías ver:

```
✓ Dropped unique constraint: responses_activity_id_participant_id_key
✓ Created INSERT policy for anonymous responses

=== MIGRATION VERIFICATION ===
✓ UNIQUE constraint removed successfully
✓ INSERT policy exists and is active
==============================

✓✓✓ MIGRATION COMPLETED SUCCESSFULLY ✓✓✓
```

### ⚠️ Importante

- **No ejecutes** los scripts individuales (`remove_unique_response_constraint.sql` y `fix_responses_rls_policy.sql`) si ya ejecutaste `enable_multiple_responses.sql`
- El script consolidado es idempotente: puedes ejecutarlo múltiples veces sin problemas
- Si ves warnings, revisa los mensajes y contacta soporte si es necesario

## Otros archivos

- `remove_unique_response_constraint.sql` - Script individual para eliminar el constraint (incluido en el consolidado)
- `fix_responses_rls_policy.sql` - Script individual para arreglar RLS (incluido en el consolidado)

**Recomendación:** Usa siempre `enable_multiple_responses.sql` en lugar de los scripts individuales.
