# Security Policy

## Reporting Vulnerabilities

If you find a security vulnerability in Quetzalcoatl, please report it responsibly. Open an issue on GitHub with the label `security` or contact the maintainers directly.

## Security Architecture

### Authentication
- **JWT tokens** with configurable expiry (default 24 hours)
- **bcrypt** password hashing (cost factor 12)
- **SECRET_KEY** must be set via environment variable — the application refuses to start without it
- No default or fallback secret key

### Authorization
- Server membership is verified via database query (not in-memory set comparison)
- Channel access requires server membership
- DM access requires conversation participation
- Bot token generation restricted to server owners only

### Input Validation
- All REST endpoints use Pydantic models with field constraints
- Message content max 4000 characters (enforced on both REST and WebSocket)
- Username: 3-32 chars, alphanumeric + underscore only
- Password: minimum 8 characters
- Channel types validated against allowlist

### WebSocket Security
- JWT authentication on connection
- User membership verified per message
- Message length enforced (4000 char max)
- Dead connections cleaned up on broadcast failure

### Known Limitations
- **No rate limiting** on auth endpoints (planned)
- **No E2E encryption** — messages stored in plaintext (see Design Tensions in README)
- **No file upload validation** — attachment endpoints not yet implemented
- **CORS** defaults to `*` — should be restricted in production
- **No audit logging** — moderation actions are not logged
- **Invite codes** have no expiry or revocation yet

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | **Yes** | JWT signing key. Generate: `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `DATABASE_URL` | No | SQLite path (default: `sqlite:///./quetzalcoatl.db`) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `*`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Token expiry in minutes (default: 1440) |

### Production Checklist
- [ ] Set `SECRET_KEY` to a strong random value
- [ ] Set `CORS_ORIGINS` to your domain(s)
- [ ] Use a reverse proxy (nginx/caddy) with HTTPS
- [ ] Set `DATABASE_URL` to a persistent path
- [ ] Enable rate limiting (when available)
- [ ] Restrict file permissions on `.db` file