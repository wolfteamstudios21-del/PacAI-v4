# PacAI v5 – Dual Deployment Guide

## Option A: Replit Publishing (2 minutes)

### Step 1: Click Publish Button
- Look for **Publish** button in Replit sidebar (right side)
- Click it

### Step 2: Select Autoscale
- Choose **Autoscale** (free tier, perfect for this app)
- Confirm

### Step 3: Wait for Deployment
- Console shows: "Deploy successful"
- You get a public URL: `https://pac-ai--yourusername.replit.app`
- Full dashboard loads with login form, projects, generation, exports

### Step 4: Test
- Visit public URL in incognito
- Click login with: `WolfTeamstudio2` / `AdminTeam15`
- Click "Create Project" button
- Generate a world
- Export to UE5/Unity/etc

---

## Option B: Vercel Deployment (Custom Domain) (5 minutes)

### Step 1: Push to GitHub

**If git not configured:**
```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

**Push code:**
```bash
git add .
git commit -m "PacAI v5 – Production ready with full dashboard, generation, exports"
git push origin main
```

### Step 2: Import to Vercel

1. Go to **vercel.com**
2. Click **New Project**
3. Select **Import Git Repository**
4. Find your GitHub repo: `PacAI-v4` (or your fork)
5. Click **Import**

### Step 3: Configure Build

**Framework**: Other  
**Build Command**: `npm run build`  
**Output Directory**: `dist/public`  
**Install Command**: `npm install`

### Step 4: Deploy

1. Click **Deploy**
2. Wait 1-2 minutes
3. Get a Vercel URL: `https://pacai-v5.vercel.app`

### Step 5: Link Custom Domain

1. In Vercel project → **Settings → Domains**
2. Add custom domain: `pacaiwolfstudio.com`
3. Update DNS records (Vercel shows exact steps)
4. Wait 10-15 min for DNS propagation

### Step 6: Test Production

- Visit `https://pacaiwolfstudio.com`
- Full dashboard loads (no stub)
- Login → Create project → Generate → Export
- All 9 engines available

---

## Why Both Deployments?

| Option | Use Case | Domain | Speed | Best For |
|--------|----------|--------|-------|----------|
| **Replit** | Quick demo/internal | `replit.app` | Instant | Testing, team demos |
| **Vercel** | Production | Custom domain | Cached CDN | Public users, branding |

**Recommended**: Do both – Replit for testing, Vercel for production.

---

## Deployment Status Checklist

- [ ] Build complete (`npm run build` done)
- [ ] Git configured (`git config user.name` set)
- [ ] Changes committed (`git add . && git commit`)
- [ ] Pushed to GitHub (`git push`)
- [ ] Replit Published (click Publish button)
- [ ] Vercel project imported (from GitHub)
- [ ] Vercel deployed (click Deploy)
- [ ] Custom domain linked (DNS updated)
- [ ] Production tested (login + generate + export)

---

## Test After Deployment

Once deployed:

```bash
# Test Replit public URL
curl https://pac-ai--yourusername.replit.app/v5/health

# Test Vercel custom domain  
curl https://pacaiwolfstudio.com/v5/health

# Both should return:
# {"status":"operational","version":"v5.0.0",...}
```

---

## Production Credentials

**Dev Backdoor** (configurable via env vars):
```
Username: WolfTeamstudio2
Password: AdminTeam15
Tier: lifetime (unlimited generations/exports)
```

**On Vercel**, set these env vars in **Settings → Environment Variables**:
```
DEV_USERNAME=WolfTeamstudio2
DEV_PASSWORD=AdminTeam15
DATABASE_URL=your-postgres-url
SESSION_SECRET=your-session-secret
```

---

## Next Steps

1. **Now**: Review this guide
2. **In 2 min**: Click Replit Publish button
3. **In 5 min**: Push to GitHub + link Vercel
4. **In 10 min**: Both are live and tested

Your full PacAI v5 SaaS is production-ready! 🚀
