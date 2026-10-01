<p align="center">
  <img src="public/rsnl_logo_horizontal.png" alt="Arsenal Logo" width="400">
</p>

A production-ready boilerplate for building desktop applications with Electron, React, TypeScript, and SQLite.

## Quick Start

```bash
npm install
npm run dev
```

## Project Structure

```
├── electron/               # Main process (backend)
│   ├── main/
│   │   ├── controllers/    # IPC handlers (routes)
│   │   ├── services/       # Business logic
│   │   ├── repositories/   # Data Access Layer
│   │   ├── models/         # Entity definitions
│   │   ├── database/       # SQLite setup & migrations
│   │   ├── managers/       # Window management
│   │   └── helpers/        # Utilities (logger, etc.)
│   └── preload.ts          # Context bridge
├── src/                    # Renderer process (frontend)
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── services/ipc/       # IPC client services
│   └── pages/              # Page components
└── shared/                 # Shared types & constants
    ├── types/              # TypeScript interfaces
    └── ipc/                # IPC channel definitions
```

## Architecture

### Backend (Main Process)

The backend follows a layered architecture:

- **Controller** > Handles IPC communication, routes requests
- **Service** > Contains business logic and validation
- **Repository** > Direct database access (CRUD operations)
- **Model** > Entity class with serialization methods

### Frontend (Renderer Process)

- **IpcClient** > Base class for communicating with main process
- **Services** > Extend IpcClient for entity-specific operations
- **Hooks** > React hooks wrapping services with state management

### Preload Script

The preload script (`electron/preload.ts`) creates a secure bridge between the renderer and main processes. It exposes the `window.electron` API with methods:

- `invoke(channel, ...args)` > Send request, await response
- `send(channel, ...args)` > Fire and forget
- `on(channel, callback)` > Subscribe to events
- `once(channel, callback)` > One-time subscription
- `off(channel, callback)` > Unsubscribe

This keeps the renderer isolated from Node.js APIs while allowing controlled IPC communication.

## Adding a New Entity

1. **Define types** in `shared/types/entities.ts`
2. **Add IPC channels** in `shared/ipc/channels.ts`
3. **Create migration** in `electron/main/database/Database.ts`
4. **Create Model** extending `BaseModel`
5. **Create Repository** extending `BaseRepository`
6. **Create Service** extending `BaseService`
7. **Create Controller** extending `BaseController`
8. **Register controller** in `electron/main/ipc/index.ts`
9. **Create IpcService** in `src/services/ipc/`
10. **Create hook** in `src/hooks/`

## Scripts

```bash
npm run dev          # Start development
npm run build        # Build for production
npm run preview      # Preview production build
```

## Tech Stack

- **Electron** - Desktop framework
- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **SQL.js** - SQLite in JavaScript
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
