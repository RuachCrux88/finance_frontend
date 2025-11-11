# 🚀 Guía de Configuración del Frontend en Vercel

## ✅ Cambios ya implementados

El frontend ya está configurado. Solo necesitas verificar las variables de entorno.

---

## 🔧 Paso 1: Configurar Variable de Entorno

### 1.1 Ir a Settings → Environment Variables

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto **finance-frontend**
3. Ve a **Settings** → **Environment Variables**

### 1.2 Agregar Variable

```
Nombre: NEXT_PUBLIC_API_BASE_URL
Valor: https://financebackend-ecru.vercel.app
Ambiente: Production, Preview, Development (marca todas)
```

**Importante**: 
- No debe tener barra final (`/`)
- Debe ser exactamente `https://financebackend-ecru.vercel.app`

---

## 🔄 Paso 2: Re-desplegar

1. Ve a **Deployments**
2. Click en los **3 puntos** (⋯) del último deployment
3. Selecciona **"Redeploy"**
4. Espera a que termine el build

---

## ✅ Paso 3: Verificar

1. Visita: `https://financefrontend-pink.vercel.app`
2. Intenta hacer login con Google
3. Deberías ser redirigido al backend y luego de vuelta al frontend

---

## 🐛 Troubleshooting

### Error: "Failed to fetch" o errores de CORS

**Solución:**
- Verifica que `NEXT_PUBLIC_API_BASE_URL` esté configurada correctamente
- Asegúrate de que el backend tenga `FRONTEND_URL` configurada con la URL del frontend

### El frontend no se conecta al backend

**Solución:**
- Verifica que ambas URLs estén correctas:
  - Frontend: `https://financefrontend-pink.vercel.app`
  - Backend: `https://financebackend-ecru.vercel.app`

