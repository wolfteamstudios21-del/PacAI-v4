# Replit Deployments - Environment Variables Checklist

## ⚠️ REQUIRED: These must be set for production deployment to work

Go to: **Deployment Configuration → Environment Variables** and add these:

### 1. **DATABASE_URL** (REQUIRED)
- **Value**: Your Neon PostgreSQL connection string
- **Format**: `postgresql://username:password@host:port/database`
- **Example**: `postgresql://user@ep-xyz.neon.tech:5432/pacai_prod`
- **How to get it**: 
  - Go to https://console.neon.tech
  - Create a database or use existing
  - Copy the full connection string
  - Click "Show password" to reveal the full URL

### 2. **SESSION_SECRET** (REQUIRED)
- **Value**: A random 32+ character string
- **How to generate**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Purpose**: Encrypts Express session cookies

### 3. **JWT_SECRET** (REQUIRED)
- **Value**: A random 32+ character string
- **How to generate**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Purpose**: Signs JWT tokens for authentication

### 4. **NODE_ENV** (RECOMMENDED)
- **Value**: `production`
- **Purpose**: Ensures app runs in production mode

### 5. **OPENAI_API_KEY** (OPTIONAL)
- **Value**: Your OpenAI API key (if using LLM)
- **Format**: `sk-proj-...`
- **Get it**: https://platform.openai.com/api-keys

---

## ✅ Deployment Steps

1. **Go to Replit Dashboard** → Your Project → **Deployments**
2. **Click "Deployment Configuration"**
3. **Add Environment Variables** (copy each one):
   ```
   DATABASE_URL = postgresql://...
   SESSION_SECRET = [random 32 chars]
   JWT_SECRET = [random 32 chars]
   NODE_ENV = production
   ```
4. **Save** ✓
5. **Try deploying again** — it should now work!

---

## 🚀 Deployment URL

After successful deployment, your backend will be available at:
```
https://[your-replit-deployment-url].replit.dev
```

Then add this to Vercel environment variables:
```
VITE_API_URL = https://[your-replit-deployment-url].replit.dev
```

---

## 🔍 Troubleshooting

If deployment still fails after setting these variables:

1. **Check logs** in Deployment Configuration → Logs
2. **Look for**: "Missing required environment variables" message
3. **Verify DATABASE_URL is correct** — it must be a valid PostgreSQL connection string
4. **Restart deployment** — save variables, then click "Promote" again

---

## ❓ Still need help?

Error message will tell you which variables are missing:
```
❌ Missing required environment variables: DATABASE_URL
Set these in Deployment Configuration → Environment Variables
```

Just add the missing variable and redeploy!
