# Technical Debt: API Tests

## Issue
Jest configuration has ES module compatibility issues with the `uuid` package used in `api/index.js`.

## Status
- ✅ Test file created: `api/index.test.js`
- ✅ Test dependencies installed (Jest, supertest)
- ❌ Tests currently failing due to ES module transform issues
- ✅ **Functionality manually verified working** (local sync confirmed)

## Test Coverage Needed
- POST /api/maps with client-provided ID
- POST /api/maps without client-provided ID (fallback to generated)
- POST /api/pins with client-provided ID  
- POST /api/pins without client-provided ID (fallback to generated)
- Foreign key constraint violation handling

## Resolution Options
1. **Convert API to ES modules** (`"type": "module"` in package.json)
2. **Add Babel transform** for Jest
3. **Mock uuid** in tests
4. **Use different test runner** (Vitest handles ES modules better)

## Priority
Medium - Core functionality verified working manually, but automated tests needed for regression prevention.

## Manual Verification Steps (Completed)
```bash
# 1. Created map in Browser A
# 2. Verified map ID matches in PostgreSQL
docker exec showme-db-1 psql -U showme -d showme -c "SELECT id FROM maps ORDER BY created_at DESC LIMIT 1"

# 3. Created pin for that map
# 4. Verified pin saved with matching map_id (no foreign key error)
docker-compose logs api | grep "Created pin"

# 5. Confirmed sync between browsers ✅
```

## Next Steps
Add to backlog: Fix Jest ES module config or migrate to Vitest
