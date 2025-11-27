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
  - Medical: 24h
  - Water: 12h
  - Checkpoint: 2h
  - Shelter: 24h
  - Food: 12h
  - Danger: 6h
  - Other: 24h

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

### Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for free hosting options including Railway, Render, and Fly.io.

## Architecture

### Technology Stack

**Frontend:**
- Svelte 4 with TypeScript
- MapLibre GL JS for map rendering
- PGLite (local PostgreSQL in browser)
- ElectricSQL for real-time sync
- Vite for build tooling

**Backend:**
- PostgreSQL with PostGIS
- ElectricSQL sync server
- PostgREST (HTTP API for PostgreSQL)
- Nginx (reverse proxy)

**Infrastructure:**
- Docker Compose for local development
- All services containerized

### How It Works

1. **Local Database**: Each client runs PGLite (PostgreSQL in the browser) for offline-first operation
2. **Sync Engine**: ElectricSQL syncs maps between server and clients in real-time
3. **Pin Sync**: PostgREST API handles pin writes with polling fallback for real-time updates
4. **Offline Support**: Operation queue retries failed operations when connection is restored
5. **Encryption**: Sensitive data is encrypted at rest in IndexedDB using Web Crypto API

### Data Flow

```
User Action → Local PGLite → PostgREST API → PostgreSQL
                ↓
         ElectricSQL Sync
                ↓
         Other Clients (Real-time)
```

## Project Structure

```
showme/
├── client/                 # Frontend Svelte application
│   ├── src/
│   │   ├── lib/           # Core components and utilities
│   │   │   ├── db/        # Database and encryption
│   │   │   ├── *.svelte   # UI components
│   │   │   └── *.ts       # Utilities and API
│   │   └── main.ts
│   └── package.json
├── migrations/            # Database schema migrations
├── compose.yaml           # Docker Compose configuration
├── Dockerfile             # Frontend build container
└── README.md
```

## Testing

Comprehensive test suite with Vitest:

```bash
cd client
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:ui       # Run tests with UI
npm run test:coverage # Generate coverage report
```

**Test Coverage:**
- API functions (createMap, addPin, getPins)
- Database operations (PGLite initialization, sync setup)
- Encryption utilities (key management, field encryption)
- Operation queue (retry logic, persistence)
- Pin utilities (colors, emojis, time formatting)
- Panic wipe functionality
- Expired pins cleanup
- Fuzzing utilities

## Security Features

### Encryption

- **AES-GCM 256-bit encryption** for sensitive fields
- **Key Management**: Auto-generated or passphrase-derived keys
- **Field-Level Encryption**: Encrypts descriptions, tags, photo URLs, map names
- **Backward Compatible**: Works with unencrypted data

See [ENCRYPTION_TESTING.md](./ENCRYPTION_TESTING.md) for testing encryption.

### Privacy

- **Location Fuzzing**: Obfuscate exact coordinates (configurable radius)
- **Panic Wipe**: Emergency deletion of all local and remote data
- **No User Accounts**: Anonymous, link-based access
- **Private Maps**: Optional access tokens for sensitive maps

## Development

### Adding New Features

1. **Write Tests First**: Follow test-first development approach
2. **Update Schema**: Add migrations in `migrations/` directory
3. **Update Types**: Modify `client/src/lib/models.ts`
4. **Implement Feature**: Add components/utilities in `client/src/lib/`
5. **Run Tests**: Ensure all tests pass
6. **Test Locally**: Verify with `make up`

### Code Style

- TypeScript strict mode
- Svelte components with TypeScript
- Vitest for testing
- Follow existing patterns and conventions

## Future Enhancements

### Planned Features
- **Notifications**: Email, Signal, Telegram, SMS notifications for new pins
- **Photo Uploads**: Direct photo upload and storage
- **User Accounts**: Optional authentication for persistent maps
- **Map Analytics**: Usage statistics and insights
- **Export/Import**: Map data export in various formats

### Notifications (Planned)

- **Email**: SMTP server integration
- **Signal**: [signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api)
- **Telegram**: Bot API integration
- **SMS**: Provider integration (complex, TBD)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

See [LICENSE.md](./LICENSE.md) for details.

## Support

For deployment help, see [DEPLOYMENT.md](./DEPLOYMENT.md).

For encryption testing, see [ENCRYPTION_TESTING.md](./ENCRYPTION_TESTING.md).
