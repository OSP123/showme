# Analysis and Next Steps

## Executive Summary

Based on the conversation with Sam Woodcock, the project is moving forward with a **community mapping MVP first**, then crisis-specific features later. The focus is on getting core functionality (map creation, pin creation, offline sync) working reliably before adding security hardening and UX optimizations.

## Key Decisions Made

### ✅ Architecture Decisions
1. **Keep ElectricSQL** - Continue using for sync, plan for peer-to-peer/mesh in future
2. **Dual Map Types** - Support both:
   - Pre-configured crisis maps (e.g., "Gaza Safe Points")
   - Community-created maps with verification
3. **Configurable Pin Fuzzing** - Per map/pin type (not global setting)
4. **Development Priority** - Community mapping → Crisis features (v2)

### ⚠️ Open Questions (Need Decisions)
1. **Pin TTL Defaults** - No decision yet on:
   - Default expiration time (6h? 24h?)
   - Should checkpoints expire faster than medical facilities?
   - Configurable per pin type?
2. **Development Priority Order** - No decision on:
   - Security hardening first (encryption, fuzzing, TTL)?
   - UX simplification first (one-tap presets, big icons)?
   - Or parallel development?

### 🔄 Technical Considerations
- **TanStack/db** - Sam recommends for future, but IndexedDB backend still in development
- **RxDB Connector** - Alternative for immediate offline writes
- **ElectricSQL Maturity** - Confirmed it's production-ready, used in many systems
- **Multiple Builds** - Option for prototyping different implementations

## Current State Analysis

### ✅ What's Working
- Basic map creation with PGLite (offline-first)
- Pin creation and display on map
- ElectricSQL sync infrastructure (partially implemented)
- MapLibre GL rendering
- Local database storage

### ❌ Current Gaps (MVP Requirements)
1. **Offline Sync Reliability** - Sync mechanism needs refinement
2. **Pin Metadata** - No tags, descriptions, or photo support yet
3. **Map Sharing** - No link sharing or access control
4. **Real-time Updates** - Currently using polling, should use ElectricSQL streams
5. **Error Handling** - Limited offline/online state handling

### 🔒 Security Features (Deferred to v2)
- Encrypted local DB
- Pin fuzzing
- Pin TTL/auto-expire
- Panic wipe
- One-tap pin presets

## Recommended Next Steps

### Phase 1: Core Functionality (Current Sprint)

#### 1.1 Stabilize Offline Sync
**Priority: HIGH**
- [ ] Fix ElectricSQL sync to properly detect local changes
- [ ] Implement proper sync state management (online/offline indicators)
- [ ] Add retry logic for failed syncs
- [ ] Test sync behavior when going offline/online

**Files to modify:**
- `client/src/lib/api.ts` - Improve sync triggering
- `client/src/lib/db/pglite.ts` - Ensure proper ElectricSQL setup
- `client/src/lib/PinLayer.svelte` - Replace polling with proper sync

#### 1.2 Enhance Pin Creation
**Priority: HIGH**
- [ ] Add pin metadata fields (tags, description)
- [ ] Support photo uploads (store URLs in `photo_urls` JSON field)
- [ ] Add pin type/category selection
- [ ] Improve pin creation UX (form/modal)

**Files to modify:**
- `client/src/lib/models.ts` - Ensure types match schema
- `client/src/lib/api.ts` - Update `addPin` to accept metadata
- `client/src/App.svelte` - Add pin creation form
- `client/src/lib/PinLayer.svelte` - Display pin metadata on click

#### 1.3 Map Sharing & Access
**Priority: MEDIUM**
- [ ] Generate shareable links with map ID
- [ ] Implement access token validation for private maps
- [ ] Add "Copy Link" functionality
- [ ] Handle URL parameters for map loading

**Files to modify:**
- `client/src/App.svelte` - Already has URL param handling, enhance it
- `client/src/lib/api.ts` - Add map access validation
- Add new component: `client/src/lib/ShareMap.svelte`

#### 1.4 Real-time Updates
**Priority: MEDIUM**
- [ ] Replace polling with ElectricSQL reactive streams
- [ ] Use TanStack Query or similar for reactive data
- [ ] Implement optimistic updates for better UX

**Files to modify:**
- `client/src/lib/PinLayer.svelte` - Replace polling with reactive queries
- Consider adding TanStack Query for data management

### Phase 2: UX Improvements (Next Sprint)

#### 2.1 Pin Display & Interaction
- [ ] Add pin clustering for large datasets
- [ ] Create pin detail popup/modal
- [ ] Add pin filtering by type/tags
- [ ] Improve marker styling (different colors/icons per type)

#### 2.2 Map Creation Flow
- [ ] Simplify map creation UI
- [ ] Add map templates (pre-configured crisis maps)
- [ ] Add map verification workflow for community maps
- [ ] Map settings/configuration panel

#### 2.3 Offline Experience
- [ ] Add offline indicator
- [ ] Show sync status
- [ ] Queue failed operations for retry
- [ ] Add offline mode testing

### Phase 3: Crisis Features (v2)

#### 3.1 Security Hardening
- [ ] Implement encrypted local DB (IndexedDB encryption)
- [ ] Add configurable pin fuzzing per map/pin type
- [ ] Implement pin TTL with auto-expiration
- [ ] Add panic wipe functionality

#### 3.2 Crisis-Specific UX
- [ ] One-tap pin presets (medical, water, checkpoint, etc.)
- [ ] Large touch targets for stressed users
- [ ] Minimal text, icon-heavy interface
- [ ] Accessibility improvements

#### 3.3 Advanced Features
- [ ] Peer-to-peer/mesh networking
- [ ] End-to-end encryption for sensitive data
- [ ] Map verification system
- [ ] Community moderation tools

## Technical Recommendations

### Immediate Actions

1. **Fix Sync Mechanism**
   - The current polling approach in `PinLayer.svelte` is a temporary solution
   - Should be replaced with proper ElectricSQL reactive queries
   - Consider using TanStack Query for better state management

2. **Database Schema Review**
   - Verify schema matches models in `models.ts`
   - Ensure all fields are properly typed
   - Add indexes for performance (map_id, created_at)

3. **Error Handling**
   - Add comprehensive error boundaries
   - Handle offline/online transitions gracefully
   - Provide user feedback for sync failures

### Future Considerations

1. **TanStack/db Integration**
   - Monitor IndexedDB backend development: https://github.com/TanStack/db/discussions/554
   - Consider RxDB connector as interim solution
   - Plan migration path when ready

2. **Multiple Builds/Prototyping**
   - Create feature branches for different implementations
   - Test TanStack/db vs current approach
   - Keep main branch stable

3. **Testing Strategy**
   - Add unit tests for core functions
   - Integration tests for sync behavior
   - Manual testing with engineers in conflict zones (as mentioned)

## Questions to Resolve

### 1. Pin TTL Defaults
**Recommendation:**
- Default: 24 hours for most pins
- Checkpoints: 6 hours (more dynamic)
- Medical facilities: 48 hours (more stable)
- Make configurable per map and pin type

**Action:** Discuss with team and document decision

### 2. Development Priority
**Recommendation:**
- **Start with UX improvements** (Phase 2) alongside core fixes
- Security hardening can wait until v2 since data is public
- Focus on making the app usable and reliable first

**Reasoning:**
- Public data = lower immediate security risk
- Better UX = more adoption = more testing
- Security features need careful design, better to do after core is stable

**Action:** Confirm with team

### 3. TanStack/db Timeline
**Recommendation:**
- Continue with current PGLite + ElectricSQL approach
- Monitor TanStack/db IndexedDB backend progress
- Plan migration when stable (estimate: 2-3 months)

**Action:** Set up monitoring/notifications for TanStack/db updates

## Implementation Checklist

### Week 1-2: Core Stability
- [ ] Fix ElectricSQL sync mechanism
- [ ] Add pin metadata support (tags, description, photos)
- [ ] Improve error handling and offline detection
- [ ] Test sync reliability

### Week 3-4: UX & Features
- [ ] Map sharing functionality
- [ ] Pin detail views
- [ ] Pin filtering and clustering
- [ ] Improved map creation flow

### Week 5-6: Polish & Testing
- [ ] Comprehensive testing (including conflict zone testing)
- [ ] Performance optimization
- [ ] Documentation
- [ ] Prepare for v2 planning

## Success Metrics

- **Offline Reliability**: App works fully offline, syncs when online
- **Sync Latency**: Real-time updates within 1-2 seconds
- **User Experience**: Create map + add pin in < 30 seconds
- **Stability**: No data loss during offline/online transitions

## Notes

- Keep security features in backlog for v2
- Focus on community mapping use case first
- Test with real users in conflict zones when possible
- Maintain flexibility for future architecture changes (peer-to-peer, etc.)

