# Zocial Full Stack Deployment Guide (Free Tier)

This guide provides the exact steps to deploy the Zocial project for **Free** on **Render** (Backend) and **Vercel** (Frontend).

---

## 1. Prepare your Database (MongoDB Atlas)
Since we moved the Engagement Ledger from SQLite to MongoDB to ensure data persistence, you need a MongoDB connection.
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free cluster.
2. Get your connection string (e.g., `mongodb+srv://<username>:<password>@cluster0.mongodb.net/zocial?retryWrites=true&w=majority`).
3. Save this as your `MONGO_URI`.

---

## 2. Deploy Backend to Render

### Step 2.1: Push to GitHub
Ensure all your latest code (including the new `Dockerfile` and `start.sh`) is pushed to your GitHub repository.

### Step 2.2: Create Web Service
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
2. Connect your GitHub repository.
3. In the setup, configure the following:
   - **Name:** `zocial-backend` (or similar)
   - **Root Directory:** `backend` (very important!)
   - **Environment:** `Docker` (Render should automatically detect the `Dockerfile`)
   - **Instance Type:** Free

### Step 2.3: Environment Variables
Add the following Environment Variables in Render:
*Note: Make sure to replace the dummy values with your actual production keys.*

| Key | Value |
| :--- | :--- |
| `PORT` | `8000` |
| `MONGO_URI` | `mongodb+srv://...` (Your MongoDB Atlas URI) |
| `JWT_SECRET` | `your_secret` |
| `API_KEY` | `854354` (Cloudinary or related) |
| `API_SECRET` | `MuNP4` |
| `CLOUD_NAME` | `dpuc1` |
| `GOOGLE_CLIENT_ID` | `499792ntent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOj2RjjA` |
| `CLIENT_URL` | *(Leave blank for now, we will add the Vercel URL later!)* |
| `GEMINI_API_KEY` | `AIzaSD...` |
| `PYTHON_MICROSERVICE_URL`| `http://127.0.0.1:5000/api/v1/analyze` |

4. Click **Create Web Service**. Wait for the build to finish.
5. Once deployed, copy your Render URL (e.g., `https://zocial-backend-xxxx.onrender.com`).

---

## 3. Deploy Frontend to Vercel

### Step 3.1: Create Vercel Project
1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New > Project**.
2. Import your GitHub repository.
3. In the setup, configure the following:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend` (very important!)

### Step 3.2: Environment Variables
Expand the Environment Variables section and add the following:

| Key | Value |
| :--- | :--- |
| `VITE_API_URL` | `https://zocial-backend-xxxx.onrender.com/api/v1` (Your Render URL + `/api/v1`) |
| `VITE_SOCKET_URL` | `https://zocial-backend-xxxx.onrender.com` (Your Render URL) |
| `VITE_GOOGLE_CLIENT_ID` | `499ontent.com` |

4. Click **Deploy**. Wait for the build to finish.
5. Once deployed, copy your Vercel URL (e.g., `https://zocial-frontend.vercel.app`).

---

## 4. Finalize Backend CORS
1. Go back to your **Render Dashboard**.
2. Go to your Backend Web Service > **Environment**.
3. Add or update the `CLIENT_URL` variable:
   - **Key:** `CLIENT_URL`
   - **Value:** `https://zocial-frontend.vercel.app` (Your exact Vercel URL, NO trailing slash)
4. Render will automatically restart your backend.

---

🎉 **You are done!** 
- Video Calls (WebRTC) use public Google STUN servers and will route perfectly since the sockets use your `VITE_SOCKET_URL`.
- The Gemini Analytics Python microservice will run silently in the background of your Node instance.
- No data will be lost when Render sleeps!
