# 🔧 Configuración Completa de Vercel - Frontend

## 📋 Variables de Entorno Requeridas

Configura esta variable en **Vercel → Settings → Environment Variables** para el proyecto **finance-frontend**:

### Variable Obligatoria

```
NEXT_PUBLIC_API_BASE_URL = https://financebackend-ecru.vercel.app
```

## ⚠️ Importante

- **Sin barra final (`/`)** en la URL
- **Usa `https://`** (no `http://`)
- **Debe empezar con `NEXT_PUBLIC_`** para que Next.js la exponga al cliente
- **Marca la variable** para Production, Preview y Development
- **Re-despliega** después de agregar/modificar la variable

## 🔗 URLs de Referencia

- **Frontend en Vercel**: `https://financefrontend-pink.vercel.app`
- **Backend en Vercel**: `https://financebackend-ecru.vercel.app`

## ✅ Verificación

Después de configurar:

1. Abre: `https://financefrontend-pink.vercel.app`
2. Abre la consola del navegador (F12)
3. Ejecuta: `console.log(process.env.NEXT_PUBLIC_API_BASE_URL)`
4. Debería mostrar: `https://financebackend-ecru.vercel.app`

Si muestra `undefined`, la variable no está configurada correctamente.

