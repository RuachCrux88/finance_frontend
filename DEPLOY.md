# Guía de Despliegue - Frontend

## Requisitos Previos

1. Backend desplegado y funcionando
2. URL del backend disponible

## Variables de Entorno

Configura la siguiente variable de entorno:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

**Importante**: 
- Actualiza esta URL con la URL real del backend
- Las variables que empiezan con `NEXT_PUBLIC_` son accesibles en el cliente
- No incluyas la barra final (`/`) en la URL

## Build y Ejecución

```bash
npm run build
npm start
```

## Verificación

1. Visita la URL del frontend
2. Verifica que el logo se muestre correctamente
3. Prueba iniciar sesión con Google
4. Verifica que las peticiones al backend funcionen

## Notas Importantes

- **Imagen del logo**: Asegúrate de que `public/coin-f.png` esté en el repositorio
- **Variables de entorno**: Solo las variables con prefijo `NEXT_PUBLIC_` son accesibles en el cliente
- **Build optimizado**: Next.js optimiza automáticamente las imágenes y el código
