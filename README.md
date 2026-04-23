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

### Zeabur Deployment

Zeabur provides one-click deployment for React applications with automatic HTTPS and CDN.

#### Option 1: Deploy via GitHub Integration (Recommended)

1. **Push to GitHub** (already done):
   ```
   https://github.com/melcatwork/swarm-tm-frontend
   ```

2. **Create New Service on Zeabur**:
   - Go to https://dash.zeabur.com
   - Click "Create Project" or use existing project
   - Click "Deploy New Service"
   - Select "Deploy from GitHub"
   - Authorize Zeabur to access your GitHub account
   - Select repository: `melcatwork/swarm-tm-frontend`
   - Click "Deploy"

3. **Configure Build Settings**:
   Zeabur auto-detects Node.js projects, but verify these settings:
   
   **Build Command:** `npm run build`  
   **Output Directory:** `dist`  
   **Install Command:** `npm install`  

4. **Configure Environment Variables** (CRITICAL):
   In Zeabur dashboard → Your Service → Environment Variables, add:
   
   ```bash
   VITE_API_BASE_URL=https://your-backend.zeabur.app
   ```
   
   **Example:**
   ```bash
   # If your backend is deployed on Zeabur
   VITE_API_BASE_URL=https://swarm-tm-backend-xxx.zeabur.app
   
   # Or custom domain
   VITE_API_BASE_URL=https://api.yourdomain.com
   ```
   
   **⚠️ Important**: 
   - This must be set BEFORE deployment
   - Vite injects env vars at build time, not runtime
   - Changing this requires a rebuild/redeploy

5. **Deploy and Verify**:
   - Click "Deploy" or push to GitHub (triggers auto-deploy)
   - Wait for build to complete (2-5 minutes)
   - Zeabur provides URL like: `https://swarm-tm-frontend-xxx.zeabur.app`
   - Visit URL and check:
     - ✅ Frontend loads without errors
     - ✅ Green "Backend: Healthy" banner (not red)
     - ✅ Can upload IaC file and run threat modeling

6. **Update Backend CORS**:
   In your backend repository's Zeabur environment variables, update:
   ```bash
   CORS_ORIGINS=https://swarm-tm-frontend-xxx.zeabur.app
   ```
   Then redeploy backend or restart service.

7. **Enable Custom Domain** (Optional):
   - Go to Service → Domains
   - Add custom domain: `app.yourdomain.com`
   - Configure DNS CNAME record pointing to Zeabur
   - Update backend CORS to include custom domain

#### Option 2: Deploy via Zeabur CLI

```bash
# Install Zeabur CLI
npm i -g @zeabur/cli

# Login to Zeabur
zeabur auth login

# Navigate to frontend directory
cd swarm-tm-frontend

# Set environment variable BEFORE deploy
zeabur env set VITE_API_BASE_URL=https://your-backend.zeabur.app

# Deploy
zeabur deploy
```

#### Option 3: Deploy with Dockerfile (Current Setup)

The repository includes a Dockerfile for nginx-based deployment:

1. **On Zeabur Dashboard**:
   - Service Settings → Build Method → Docker
   - Zeabur will use the Dockerfile automatically

2. **Environment Variables** (set before build):
   ```bash
   VITE_API_BASE_URL=https://your-backend.zeabur.app
   ```

3. **Deploy**:
   - Push to GitHub or use CLI
   - Zeabur builds Docker image and deploys

**Dockerfile method advantages:**
- Consistent with docker-compose setup
- Nginx caching and performance optimizations
- Health checks included

#### Important Notes for Zeabur

**1. Environment Variable Timing:**
- ⚠️ **CRITICAL**: `VITE_API_BASE_URL` must be set BEFORE deployment
- Vite env vars are injected at build time, not runtime
- To change backend URL: Update env var → Redeploy/Rebuild

**2. CORS Configuration:**
- Backend must allow frontend origin in `CORS_ORIGINS`
- After deploying frontend, update backend env:
  ```bash
  CORS_ORIGINS=https://swarm-tm-frontend-xxx.zeabur.app
  ```
- Then redeploy backend

**3. Full Stack Setup on Zeabur:**

**Step 1: Deploy Backend First**
```bash
# Backend deployed at:
https://swarm-tm-backend-abc.zeabur.app

# Set backend env vars:
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
CORS_ORIGINS=http://localhost:5173  # Temporary for testing
```

**Step 2: Deploy Frontend**
```bash
# Set frontend env var:
VITE_API_BASE_URL=https://swarm-tm-backend-abc.zeabur.app

# Frontend deployed at:
https://swarm-tm-frontend-xyz.zeabur.app
```

**Step 3: Update Backend CORS**
```bash
# Update backend env var:
CORS_ORIGINS=https://swarm-tm-frontend-xyz.zeabur.app

# Redeploy backend (or restart service)
```

**4. Automatic Redeployment:**
- Push to GitHub → Zeabur auto-deploys
- Zero-downtime deployments
- Rollback available if issues occur
- View deployment logs in dashboard

**5. Performance:**
- Zeabur provides CDN for static assets
- Automatic HTTPS with Let's Encrypt
- HTTP/2 support
- Gzip compression enabled

#### Troubleshooting Zeabur Deployment

**Build Fails:**
- Check logs in Zeabur dashboard → Logs
- Verify `npm install` succeeds locally
- Ensure `npm run build` works locally
- Check Node.js version compatibility (20+)

**Backend Unreachable (Red Banner):**
1. Check `VITE_API_BASE_URL` is set correctly in Zeabur env vars
2. Verify backend is running: `curl https://backend-url/api/health`
3. Check backend CORS includes frontend origin
4. Open browser console (F12) for specific errors
5. **Common issue**: Forgot to set `VITE_API_BASE_URL` before first deploy
   - **Fix**: Set env var → Trigger rebuild

**Blank Page After Deploy:**
- Check browser console for errors
- Verify dist/ directory was created during build
- Ensure nginx.conf is correct (for Docker method)
- Check Zeabur logs for routing errors

**CORS Errors in Browser Console:**
```
Access to fetch at 'https://backend.zeabur.app/api/health' 
from origin 'https://frontend.zeabur.app' has been blocked by CORS
```
- **Fix**: Update backend `CORS_ORIGINS` environment variable
- Include full frontend URL with https://
- Redeploy backend after changing CORS

**Need to Change Backend URL:**
1. Update `VITE_API_BASE_URL` in Zeabur dashboard
2. Trigger manual redeploy or push to GitHub
3. Wait for build to complete (injects new URL)
4. Verify in deployed app: Check Network tab for API calls

#### Zeabur Free Tier Limitations

**Frontend:**
- ✅ Works perfectly on free tier
- Static site hosting with CDN
- Generous bandwidth allowance

**Backend:**
- ⚠️ Check Zeabur pricing for compute limits
- Long-running LLM operations (14-30 min) may need higher tier
- Consider timeout limits (free tier may have restrictions)

**Recommendation:**
- Deploy frontend on Zeabur free tier ✅
- Deploy backend on Zeabur paid tier or Railway/Render for long-running tasks

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
