# ShowMe

Collaboratively pin locations on a map. Built for crisis response, community mapping, and real-time location sharing.

## Features

### Core Functionality
- **Real-time Collaborative Mapping**: Multiple users can add pins simultaneously with live updates
- **Offline-First**: Works offline with automatic sync when connection is restored
- **No Sign-In Required**: Anonymous, link-based sharing
- **Private Maps**: Optional access tokens for sensitive data
- **Mobile-Optimized**: Responsive design with large touch targets for mobile devices

### Pin Management
- **Quick Pin Presets**: One-tap pin creation for common types (Medical, Water, Checkpoint, Shelter, Food, Danger)
- **Detailed Pins**: Full pin creation with tags, descriptions, and photo URLs
- **Pin Filtering**: Filter pins by type to focus on specific resources
- **Pin Clustering**: Automatic clustering for large datasets (10+ pins)
- **Pin TTL (Time-To-Live)**: Auto-expiration based on pin type:
  - Medical: 24h, Checkpoint: 2h, Shelter: 24h, Food: 12h, Danger: 6h, Other: 24h
  - Water: no expiry

### Security & Privacy
- **Encrypted Local Database**: AES-GCM encryption for sensitive data stored locally
- **Field-Level Encryption**: Encrypts pin descriptions, tags, photo URLs, and map names
- **Location Fuzzing**: Optional coordinate obfuscation to protect exact locations (configurable per map)
- **Panic Wipe**: Emergency data deletion that removes all local and remote data

### User Experience
- **Map Templates**: Quick map creation with templates (Custom, Crisis Response, Community, Event, Private)
- **Share Maps**: Generate shareable links with optional access tokens
- **Sync Status**: Real-time sync status indicator with operation queue visibility
- **Pin Popups**: Rich pin details with timestamps, type labels, and descriptions
- **New Map Button**: Easy navigation to create additional maps

## Getting Started

### Local Development

**Prerequisites:**
- Docker and Docker Compose
- Node.js 22+ (for local development)

**Start the stack:**
```bash
make up
```

Application runs at `http://localhost:3012`

**Other commands:**
```bash
make down      # Stop all services
make logs      # View logs
make ps        # Check service status
```

### Deploy to Fly.io

ShowMe deploys as a single all-in-one container on [Fly.io](https://fly.io). PostgreSQL, ElectricSQL, the Express API, and Nginx all run inside one machine managed by supervisord.

**Prerequisites:**
- [Fly CLI](https://fly.io/docs/flyctl/install/) installed
- A Fly.io account (`fly auth signup`)

**1. Fork and clone:**
```bash
git clone https://github.com/<your-username>/showme.git
cd showme
```

**2. Create the app and storage volume:**
```bash
fly launch --no-deploy            # Creates the app (accept defaults or pick your region)
fly volumes create showme_db_data --region <your-region> --size 1
```

**3. (Optional) Set a strong database password:**
```bash
fly secrets set POSTGRES_PASSWORD=<your-password>
```
If you skip this, the default from `Dockerfile.allinone` is used — fine for testing but change it for production.

**4. Deploy:**
```bash
fly deploy
```

The first deploy takes a few minutes to build. Once done, your app is live at `https://<your-app-name>.fly.dev`.

**5. (Optional) Photo uploads — configure Cloudinary:**
```bash
fly secrets set VITE_CLOUDINARY_CLOUD_NAME=<your-cloud-name>
fly secrets set VITE_CLOUDINARY_UPLOAD_PRESET=<your-upload-preset>
fly deploy   # Rebuild to bake env vars into the frontend
```

**Useful commands:**
```bash
fly logs              # Tail production logs
fly status            # Check machine status
fly ssh console       # SSH into the running machine
fly deploy            # Deploy latest changes
```

**What's inside the container:**

| Service       | Port | Role                                   |
|---------------|------|----------------------------------------|
| PostgreSQL 17 | 5432 | Database with PostGIS + logical replication |
| ElectricSQL   | 3000 | Real-time sync engine                  |
| Express API   | 4000 | REST API for maps/pins                 |
| Nginx         | 8080 | Reverse proxy (the external port)      |

All managed by supervisord. Database data persists on the Fly volume.

## Architecture

### Technology Stack

**Frontend:** Svelte 4, TypeScript, MapLibre GL JS, PGLite, ElectricSQL, Vite

**Backend:** PostgreSQL + PostGIS, ElectricSQL, Express.js API, Nginx

### How It Works

1. **Local Database**: Each client runs PGLite (PostgreSQL in the browser) for offline-first operation
2. **Hybrid Sync**:
    - **Optimistic UI**: Local PGLite writes for instant feedback
    - **Polling**: Express API polls every 4s for consistency
    - **Replication**: ElectricSQL streams changes in real-time (best-effort)
3. **Offline Support**: Operation queue retries failed operations when connection is restored
4. **Encryption**: Sensitive data is encrypted at rest in IndexedDB using Web Crypto API

### Data Flow

```
User Action → Local PGLite → Express API → PostgreSQL
                                              ↓
                                      ElectricSQL Sync
                                              ↓
                                      Other Clients
```

## Project Structure

```
showme/
├── client/                  # Frontend Svelte app
│   ├── src/
│   │   ├── lib/             # Components, API, utilities
│   │   │   ├── db/          # Database and encryption
│   │   │   ├── *.svelte     # UI components
│   │   │   └── *.ts         # API, models, utils
│   │   └── main.ts
│   └── package.json
├── api/                     # Express.js REST API
│   ├── index.js
│   └── index.test.js
├── migrations/              # PostgreSQL schema migrations
├── compose.yaml             # Docker Compose (local dev)
├── Dockerfile.allinone      # Production all-in-one container
├── fly.toml                 # Fly.io configuration
├── supervisord.conf         # Process manager for production
├── docker-entrypoint.sh     # Container initialization script
└── nginx.conf               # Reverse proxy config
```

## Testing

```bash
cd client
pnpm test              # Run tests in watch mode
pnpm run test:run      # Run tests once
pnpm run test:coverage # Generate coverage report

cd ../api
npm test               # Run API endpoint tests
```

## Security & Privacy

- **AES-GCM 256-bit encryption** for sensitive fields (descriptions, tags, photo URLs, map names)
- **Location Fuzzing**: Obfuscate exact coordinates (configurable radius per map)
- **Panic Wipe**: Emergency deletion of all local and remote data
- **No User Accounts**: Anonymous, link-based access
- **Private Maps**: Optional access tokens

See [ENCRYPTION_TESTING.md](./ENCRYPTION_TESTING.md) for testing encryption.

## Development

### Adding New Features

1. Write tests first
2. Add migrations in `migrations/`
3. Update types in `client/src/lib/models.ts`
4. Implement in `client/src/lib/`
5. Run tests, verify with `make up`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

See [LICENSE.md](./LICENSE.md) for details.
