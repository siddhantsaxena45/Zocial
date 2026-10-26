# Zocial

Zocial is a modern, feature-rich full-stack social media platform and professional networking application. It combines traditional social networking features—like real-time messaging, video calls, and media sharing—with an automated Gemini AI Resume Builder that synthesizes posts and career transmissions into ATS-compliant professional resumes.

## 🚀 Features

- **Robust Authentication**: Secure JWT-based user authentication along with Google OAuth integration.
- **Real-Time Communication**: Live chat and instant notifications powered by Socket.io.
- **Peer-to-Peer Video/Audio Calls**: Seamless WebRTC connections using `simple-peer`.
- **Media Management**: Efficient image processing and cloud storage via Multer, DataURI, and Cloudinary.
- **AI Resume Generator**: Powered by Google Gemini 2.5 Flash (with automatic fallbacks to Gemini 3.8/3.5 Flash and an environment rotator with 10 API keys) for:
  - Extracting high-impact technical competencies and domain expertise directly from user posts.
  - Generating ATS-optimized executive career summaries.
  - Formulating target professional headlines and project achievement highlights.
  - One-click PDF resume export.
- **Responsive & Modern UI**: Built with React 19, Tailwind CSS, and headless UI components (shadcn/ui via Radix UI).

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19, Vite
- **Styling**: Tailwind CSS, PostCSS
- **UI Components**: shadcn/ui, Radix UI, Lucide React, React Icons
- **State Management**: Redux Toolkit, Redux Persist
- **Routing**: React Router DOM
- **Real-time & WebRTC**: Socket.io-client, Simple-peer

### Backend
- **Runtime & Framework**: Node.js (v20+), Express
- **Database**: MongoDB (Mongoose)
- **AI Engine**: Google Gemini API (`gemini-2.5-flash` with fallback cascade to `gemini-3.8-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.1-flash-lite`)
- **Key Rotation**: 10-Key Environment Rotator (`GOOGLE_API_KEY1` ... `GOOGLE_API_KEY10`)
- **Authentication**: bcryptjs, jsonwebtoken, Google Auth Library
- **Media Handling**: Cloudinary, Multer, Sharp
- **Real-time**: Socket.io

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local or Atlas)
- Cloudinary Account
- Google Cloud Console Project (for OAuth)
- Google Gemini API Keys (`GOOGLE_API_KEY1` ... `GOOGLE_API_KEY10`)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Zocial
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   ```
   *Configure your `.env` file in `backend` with your MongoDB URI, JWT secrets, Cloudinary credentials, and `GOOGLE_API_KEY1` through `GOOGLE_API_KEY10`.*

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   ```
   *Configure your `.env` file in `frontend` with your `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID`.*

### Running the Application

**Backend Server:**
```bash
cd backend
npm run dev
```

**Frontend Application:**
```bash
cd frontend
npm run dev
```

## 📄 License
This project is licensed under the MIT License.
