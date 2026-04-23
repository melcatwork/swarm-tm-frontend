# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Swarm TM Frontend

React 19 + Vite threat modeling dashboard.

**Repository**: https://github.com/redcountryroad/swarm-tm-frontend (split from monorepo 2026-04-23)  
**Backend**: https://github.com/redcountryroad/swarm-tm-backend

## Project Structure

Frontend-only repository:
- `src/` — React application (components, pages, API client, utilities)
- `public/` — Static assets
- `docs/` — Architecture diagrams and screenshots

## Commands

```bash
# Frontend development
npm run dev                       # start dev server on :5173
npm run build                    # production build
npm run lint                     # lint check

# Docker deployment
docker-compose up -d             # start frontend service
docker-compose logs -f           # view logs
docker-compose down              # stop service
```

## Backend API Configuration

Frontend connects to backend API via environment variable:
- **Development**: `VITE_API_BASE_URL=http://localhost:8000` (in `.env`)
- **Production**: Set `VITE_API_BASE_URL` to your backend URL before build

**Important**: Vite environment variables are injected at **build time**, not runtime.

## Code Style

- React: functional components with hooks. No class components (except ErrorBoundary).
- Destructured imports for clarity
- Use `useState()`, `useEffect()`, `useCallback()`, `useMemo()`, `useRef()` hooks
- API calls via `src/api/client.js` axios client
- Error handling with try/catch and user-friendly messages

## Security Considerations

1. **XSS Prevention**: Sanitize LLM-generated content before rendering. React escapes by default, but be cautious with `dangerouslySetInnerHTML`.
2. **Input Validation**: Validate file uploads (size, extension) before sending to backend.
3. **CORS**: Backend must allow frontend origin in `CORS_ORIGINS` env var.
4. **No Secrets**: Never store API keys or sensitive data in frontend code. Backend handles authentication.

## Component Patterns

- **ThreatModelPage**: Main dashboard (1,839 lines, could be split into smaller components)
- **SharedAttackGraph**: React Flow visualization with custom nodes and edges
- **BackendStatusBanner**: Health check polling with visual indicators
- **API Client**: Centralized axios instance with configurable base URL

## Development Workflow

### When Adding UI Features

1. **Create/modify components** in `src/components/` or `src/pages/`
2. **Update API client** if new backend endpoints needed (`src/api/client.js`)
3. **Test with local backend**: Ensure backend running at configured URL
4. **Check browser console**: No errors or warnings
5. **Test responsiveness**: Desktop and mobile views
6. **Lint**: `npm run lint` before committing

### When Fixing Bugs

1. **Reproduce issue**: Test in browser with dev tools open
2. **Check console**: Look for JavaScript errors or failed API calls
3. **Verify API responses**: Network tab in dev tools
4. **Test fix**: Reload page and verify issue resolved
5. **Check for regressions**: Test related features

## Backend Integration

This frontend requires backend API running:
- Repository: https://github.com/redcountryroad/swarm-tm-backend
- Default URL: http://localhost:8000
- API Documentation: http://localhost:8000/docs (Swagger UI)

**Start both services:**
```bash
# Terminal 1: Backend
cd swarm-tm-backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd swarm-tm-frontend
npm run dev
```

## Known Limitations

1. **No streaming progress**: Long-running operations (14-30 min) show loading spinner without real-time updates.
2. **Environment variables at build time**: Vite requires env vars set before `npm run build`, not at runtime.
3. **Large component files**: ThreatModelPage could be split into smaller, focused components for better maintainability.
4. **No state management library**: Uses local state with props drilling. Could benefit from Context API or Zustand for complex state.
