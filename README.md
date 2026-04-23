# Swarm TM Frontend

React 19 + Vite dashboard for AI-powered threat modeling with interactive attack path visualization.

**Repository**: https://github.com/redcountryroad/swarm-tm-frontend  
**Backend**: https://github.com/redcountryroad/swarm-tm-backend  
**Status**: Production Ready ✅

---

## Overview

The Swarm TM frontend is a modern React single-page application that provides an intuitive interface for threat modeling AWS infrastructure. It connects to the Swarm TM backend API to run multi-agent threat analysis and displays results with interactive visualizations.

### Key Features

- **Interactive Attack Path Visualization**: React Flow-based graphs with swim lanes and path traversal animation
- **Threat Model Summary**: High-level overview with total paths, risk distribution, and coverage percentage
- **Mitigation Selection**: Checkbox-based mitigation application with real-time residual risk calculation
- **4 Pipeline Modes**: Full Swarm, Quick Run, Single Agent, Stigmergic Swarm
- **Dynamic Model Selection**: Choose from any locally installed Ollama model via dropdown
- **Threat Intelligence Dashboard**: Real-time feeds from 13 sources with normalized scoring
- **Archive System**: Save and load previous threat models with GMT+8 timestamps
- **Long-Running Operation UI**: Elapsed timer, backend health indicators, cancel functionality

---

## Quick Start

### Prerequisites

- Node.js 20+
- Backend API running at configured URL (default: `http://localhost:8000`)

### Installation

```bash
# Clone repository
git clone https://github.com/redcountryroad/swarm-tm-frontend.git
cd swarm-tm-frontend

# Install dependencies
npm install

# Configure backend URL
cp .env.example .env
# Edit .env: VITE_API_BASE_URL=http://localhost:8000

# Run development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

### Docker Deployment

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Frontend will be available at `http://localhost:3000`

---

## Configuration

### Environment Variables

Create a `.env` file with backend API configuration:

```bash
# Backend API URL (required)
VITE_API_BASE_URL=http://localhost:8000

# For production deployment
# VITE_API_BASE_URL=https://api.yourdomain.com
```

### Backend Setup

This frontend requires the Swarm TM backend API to be running:

- **Repository**: https://github.com/redcountryroad/swarm-tm-backend
- **Default URL**: `http://localhost:8000`
- **CORS**: Backend must allow frontend origin in `CORS_ORIGINS` env var

**Start backend:**
```bash
cd swarm-tm-backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

---

## Development

### Project Structure

```
swarm-tm-frontend/
├── src/
│   ├── api/client.js              # Backend API client (axios)
│   ├── components/                # React components
│   │   ├── BackendStatusBanner.jsx
│   │   ├── SharedAttackGraph.jsx
│   │   ├── ThreatModelSummary.jsx
│   │   └── ...
│   ├── pages/                     # Page components
│   │   ├── ThreatIntelPage.jsx
│   │   └── ThreatModelPage.jsx
│   └── utils/formatters.js        # Utility functions
├── public/                        # Static assets
├── docs/                          # Documentation and diagrams
├── package.json                   # Dependencies
├── vite.config.js                 # Vite configuration
└── docker-compose.yml             # Container orchestration
```

### Available Scripts

```bash
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Production build (outputs to dist/)
npm run lint         # Lint check with ESLint
npm run preview      # Preview production build locally
```

### Technology Stack

- **React 19**: UI framework with hooks and StrictMode
- **Vite 8**: Fast build tool and dev server
- **React Router 7**: SPA navigation
- **React Flow 11**: Interactive graph visualization
- **Axios 1.15**: HTTP client with cancellation support
- **Lucide React**: Icon library
- **Date-fns**: Date formatting with GMT+8 timezone support

---

## Key Components

### API Client (`src/api/client.js`)

Centralized axios client with:
- Configurable base URL via environment variable
- 30-minute timeout for long-running operations
- Request cancellation support
- Consistent error handling and user-friendly messages

### Threat Model Page (`src/pages/ThreatModelPage.jsx`)

Main dashboard for threat modeling with:
- IaC file upload
- Pipeline mode selection (Full Swarm, Quick Run, Single Agent, Stigmergic)
- Model selection dropdown
- Real-time progress tracking with elapsed timer
- Attack path cards with MITRE ATT&CK techniques
- Mitigation selection and residual risk analysis
- Archive management

### Shared Attack Graph (`src/components/SharedAttackGraph.jsx`)

Interactive React Flow visualization featuring:
- Swim lane layout (5 kill chain phases)
- Path traversal animation on node click
- Reinforced technique nodes (multi-agent validation)
- Zoom, pan, minimap controls
- Coverage gap identification

### Threat Intelligence Page (`src/pages/ThreatIntelPage.jsx`)

Real-time threat intel dashboard with:
- 13 integrated sources (NVD, SecurityWeek, BleepingComputer, etc.)
- Normalized citation scoring (0-10 scale)
- Category filtering (CVE, News, Framework)
- Source management interface

---

## Deployment

### Production Build

```bash
# Build optimized production bundle
npm run build

# Output directory: dist/
# Serve with nginx, Apache, or static hosting
```

### Docker Production Deployment

```bash
# Build Docker image
docker build -t swarm-tm-frontend .

# Run container
docker run -p 3000:80 \
  -e VITE_API_BASE_URL=https://api.yourdomain.com \
  swarm-tm-frontend
```

### Environment Variable Injection

Vite environment variables must be set at **build time**, not runtime:

```bash
# Set before build
export VITE_API_BASE_URL=https://api.yourdomain.com
npm run build

# Or inline
VITE_API_BASE_URL=https://api.yourdomain.com npm run build
```

---

## Troubleshooting

### Backend Connection Issues

**Issue**: Red "Backend Unreachable" banner appears

**Solutions**:
1. Verify backend is running: `curl http://localhost:8000/api/health`
2. Check VITE_API_BASE_URL in .env matches backend URL
3. Ensure backend CORS_ORIGINS includes frontend origin
4. Check browser console for specific error messages

### Build Failures

**Issue**: `npm run build` fails

**Solutions**:
1. Clear cache: `rm -rf node_modules package-lock.json && npm install`
2. Check Node.js version: `node --version` (requires 20+)
3. Verify all dependencies installed: `npm install`

### Docker Issues

**Issue**: Container fails to start

**Solutions**:
1. Check Dockerfile build: `docker build -t test .`
2. Verify nginx.conf syntax
3. Check container logs: `docker logs swarm-tm-frontend`

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally: `npm run dev`
5. Build: `npm run build`
6. Lint: `npm run lint`
7. Submit a pull request

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

**Copyright (c) 2026 redcountryroad**

---

## Acknowledgments

- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [React Flow](https://reactflow.dev/) - Graph visualization
- [Lucide](https://lucide.dev/) - Icon library

---

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/redcountryroad/swarm-tm-frontend/issues)
- **Backend Repository**: https://github.com/redcountryroad/swarm-tm-backend
