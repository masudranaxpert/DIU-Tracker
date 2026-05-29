# Frontend source layout

Feature-first structure (2025+ React/TypeScript convention):

```
src/
├── app/              # App shell, global providers
├── pages/            # Route-level pages (thin)
├── features/         # Domain modules (admin, …)
├── shared/           # Cross-feature UI, API, utils, types
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── theme/
├── assets/           # Static images bundled with app
└── styles/           # Global CSS
```

Import aliases (see `vite.config.ts`):

- `@/app/*` — application bootstrap
- `@/pages/*` — pages
- `@/features/*` — feature modules
- `@/shared/*` — shared code
