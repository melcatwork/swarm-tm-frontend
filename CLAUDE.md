# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Swarm TM Frontend (Unified with CVE Intelligence)

React 19 + Vite threat intelligence and modeling dashboard with integrated CVE search.

**Repository**: https://github.com/redcountryroad/swarm-tm-frontend (split from monorepo 2026-04-23)  
**Backend**: https://github.com/redcountryroad/swarm-tm-backend

## Project Structure

Unified frontend repository:
- `src/` — React application (components, pages, API client, utilities)
  - `pages/CveSearchPage.jsx` — **NEW**: CVE intelligence page
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

## CVE Search Page (NEW)

### Overview

**Component**: `src/pages/CveSearchPage.jsx` (631 lines)

Provides CVE vulnerability intelligence with MITRE ATT&CK kill chain mapping and visualization.

### Features

1. **CVE Search**
   - Search by product name (e.g., "log4j", "exchange")
   - Direct CVE ID lookup (e.g., "CVE-2021-44228")
   - Results sorted by CVSS score (highest first)

2. **Kill Chain Visualization**
   - Mermaid flowchart diagrams
   - Color-coded MITRE ATT&CK tactics (12 phases)
   - Technique ID mapping (T-numbers)

3. **Vulnerability Intelligence**
   - Patches and vendor advisories
   - Mitigation recommendations
   - Detection methods (YARA, Splunk, Snort rules)
   - Recovery and remediation steps

4. **CISA KEV Tab**
   - Known Exploited Vulnerabilities list
   - Latest 20 entries with dates
   - Vendor and product information

### Dependencies

- **mermaid** (^10.6.1) - Kill chain diagram rendering
- **React 19** - Component framework
- **fetch API** - Direct HTTP calls to `/api/cve/*` endpoints

### API Integration

Uses direct `fetch()` calls instead of axios for CVE endpoints:

```javascript
import { API_BASE_URL } from '../api/client'
const CVE_API_BASE = `${API_BASE_URL}/cve`

// Search CVEs
fetch(`${CVE_API_BASE}/search?product=log4j&limit=10`)

// Get ATT&CK mapping
fetch(`${CVE_API_BASE}/attack/CVE-2021-44228`)

// Get CISA KEV list
fetch(`${CVE_API_BASE}/cisa-kev/list?limit=20`)
```

### Mermaid Integration

Diagram rendering with `mermaid.render()`:

```javascript
const { svg } = await mermaid.render('mermaid-graph', graphDefinition)
mermaidRef.current.innerHTML = svg
```

### Styling

- Inline styles for dark theme consistency
- Gradient backgrounds (`#00d4ff` to `#7c3aed`)
- Color-coded CVSS severity badges
- Responsive two-column layout

### Known Issues

1. **Mermaid security**: Uses permissive security settings for custom styling
2. **No pagination**: Search results limited to 10 CVEs
3. **Rate limits**: NVD API has 5 requests per 30 seconds without API key

## Known Limitations

1. **No streaming progress**: Long-running operations (14-30 min) show loading spinner without real-time updates.
2. **Environment variables at build time**: Vite requires env vars set before `npm run build`, not at runtime.
3. **Large component files**: ThreatModelPage and CveSearchPage could be split into smaller, focused components for better maintainability.
4. **No state management library**: Uses local state with props drilling. Could benefit from Context API or Zustand for complex state.
