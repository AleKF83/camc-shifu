# CAMC — Centro de Artes Marciales Chinas

Sistema de gestión de presentismo y pagos para el kwoon de Shifu José Demarco.

## Stack

- **Frontend:** HTML estático + CSS + JS vanilla (ES modules)
- **Backend:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Fonts:** Cinzel (display) + Nunito (body)
- **Icons:** Lucide

## Estructura

```
camc-shifu/
├── app/
│   ├── asistencia.html    ← Vista de marcar asistencia
│   └── admin.html         ← Panel de administración
├── js/
│   ├── supabase-config.js ← Config compartida + helpers
│   └── api.js             ← Todas las operaciones de BD
├── css/
│   └── styles.css         ← Design system completo
├── sql/
│   └── schema.sql         ← Schema de Supabase
├── env.example.js         ← Template de variables
├── vercel.json            ← Rewrites de Vercel
└── manifest.json          ← PWA manifest
```

## Setup

1. Crear proyecto en [Supabase](https://supabase.com) (región São Paulo)
2. Ejecutar `sql/schema.sql` en el SQL Editor
3. Copiar `env.example.js` → `env.js` con tus keys
4. Deploy en Vercel o servir localmente

## Variables de entorno (Vercel)

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

## Estilos del kwoon

- Kung Fu (Bei Shaolin)
- Tai Chi
- Clase sabatina
