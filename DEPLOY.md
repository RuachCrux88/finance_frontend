# Guía de Despliegue - Frontend

## Despliegue en Vercel (Recomendado)

### 1. Preparación

1. Asegúrate de que el código esté en GitHub
2. El proyecto Next.js está listo para desplegarse

### 2. Crear Proyecto en Vercel

1. Ve a https://vercel.com e inicia sesión con GitHub
2. Click en "Add New Project"
3. Selecciona el repositorio `finance_frontend`
4. Vercel detectará automáticamente Next.js
5. Configuración (debería ser automática):
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build` (automático)
   - **Output Directory**: `.next` (automático)
   - **Install Command**: `npm install`

### 3. Variables de Entorno

En la sección "Environment Variables" de Vercel, agrega:

```
NEXT_PUBLIC_API_BASE_URL=https://tu-backend.vercel.app
```

**Importante**: 
- Actualiza esta URL después de desplegar el backend
- Las variables que empiezan con `NEXT_PUBLIC_` son accesibles en el cliente
- No incluyas la barra final (`/`) en la URL

### 4. Desplegar

1. Click en "Deploy"
2. Espera a que termine el build
3. Vercel te dará una URL como: `https://tu-proyecto.vercel.app`

### 5. Actualizar Backend

Después de obtener la URL del frontend:
1. Ve al proyecto del backend en Vercel
2. Actualiza la variable `FRONTEND_URL` con la URL del frontend
3. Esto permite que el backend acepte peticiones del frontend

## Despliegue en Netlify (Alternativa)

### 1. Preparación

El archivo `netlify.toml` ya está configurado en el proyecto.

### 2. Crear Proyecto en Netlify

1. Ve a https://app.netlify.com e inicia sesión con GitHub
2. Click en "Add new site" → "Import an existing project"
3. Selecciona el repositorio `finance_frontend`
4. Netlify detectará automáticamente la configuración de `netlify.toml`

### 3. Variables de Entorno

En "Site settings" → "Environment variables", agrega:

```
NEXT_PUBLIC_API_BASE_URL=https://tu-backend.vercel.app
```

### 4. Desplegar

1. Click en "Deploy site"
2. Espera a que termine el build
3. Netlify te dará una URL como: `https://tu-proyecto.netlify.app`

## Verificación Post-Despliegue

1. Visita la URL del frontend
2. Verifica que el logo se muestre correctamente
3. Prueba iniciar sesión con Google
4. Verifica que las peticiones al backend funcionen

## Notas Importantes

- **Imagen del logo**: Asegúrate de que `public/coin-f.png` esté en el repositorio
- **Variables de entorno**: Solo las variables con prefijo `NEXT_PUBLIC_` son accesibles en el cliente
- **Build optimizado**: Next.js optimiza automáticamente las imágenes y el código
- **Actualización de backend**: Si cambias la URL del backend, actualiza `NEXT_PUBLIC_API_BASE_URL` y vuelve a desplegar

## Troubleshooting

**Error: "Failed to fetch"**
- Verifica que `NEXT_PUBLIC_API_BASE_URL` esté configurada correctamente
- Asegúrate de que el backend esté desplegado y funcionando
- Verifica que el backend tenga configurado `FRONTEND_URL` correctamente

**Error de CORS**
- Verifica que el backend tenga la URL correcta del frontend en `FRONTEND_URL`
- Asegúrate de que ambas URLs usen el mismo protocolo (https)

**Imagen no se muestra**
- Verifica que `public/coin-f.png` esté en el repositorio
- Asegúrate de que la imagen tenga el nombre correcto
- Verifica que la imagen esté en la carpeta `public/` (no en `src/`)

