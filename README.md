# Zocial

Zocial is a modern, feature-rich full-stack social media platform and professional networking application. It combines traditional social networking features—like real-time messaging, video calls, and media sharing—with an advanced AI-driven analytics engine that provides deep insights into user engagement, sentiment trends, and professional skills.

## 🚀 Features

- **Robust Authentication**: Secure JWT-based user authentication along with Google OAuth integration.
- **Real-Time Communication**: Live chat and instant notifications powered by Socket.io.
- **Peer-to-Peer Video/Audio Calls**: Seamless WebRTC connections using `simple-peer`.
- **Media Management**: Efficient image processing and cloud storage via Multer, DataURI, and Cloudinary.
- **AI Analytics Engine**: A dedicated Python microservice leveraging Google Gemini AI for:
  - Semantic reasoning and career summary generation.
  - Sentiment analysis using VADER-lite algorithms.
  - User engagement momentum tracking (EMA).
  - Algorithmic influence ranking and professional skill extraction.
- **Responsive & Modern UI**: Built with React 19, Tailwind CSS, and headless UI components (shadcn/ui via Radix UI).
- **Interactive Dashboards**: Visualizing user analytics and sentiment trends utilizing Recharts.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19, Vite
- **Styling**: Tailwind CSS, PostCSS
- **UI Components**: shadcn/ui, Radix UI, Lucide React, React Icons
- **State Management**: Redux Toolkit, Redux Persist
- **Routing**: React Router DOM
- **Real-time & WebRTC**: Socket.io-client, Simple-peer
- **Data Visualization**: Recharts

### Backend
- **Runtime & Framework**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **Authentication**: bcryptjs, jsonwebtoken, Google Auth Library
- **Media Handling**: Cloudinary, Multer, Sharp
- **Real-time**: Socket.io

### AI & Analytics Microservice
- **Language & Framework**: Python, FastAPI, Uvicorn
- **Data Validation**: Pydantic
- **AI Integration**: Google GenAI (`gemini-2.5-flash`)
- **Core Logic**: NLP processing, EMA calculation, text sanitization

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Python (v3.8+ recommended)
- MongoDB (local or Atlas)
- Cloudinary Account
- Google Cloud Console Project (for OAuth)
- Google Gemini API Key

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
   *Create a `.env` file in the `backend` directory with your MongoDB URI, JWT secrets, Cloudinary credentials, and Google Client IDs.*

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   ```
   *Create a `.env` file in the `frontend` directory with your `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID`.*

4. **Analytics Engine Setup:**
   ```bash
   cd ../backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
   *Ensure you add `GEMINI_API_KEY` to the backend `.env` file (or a specific `.env` for the python script) to enable AI semantic features.*

### Running the Application

Open separate terminal instances to run each component:

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

**Analytics Microservice (Optional/Standalone):**
The analytics engine can be invoked automatically by the Node.js backend via shell execution, or it can run as an independent FastAPI microservice:
```bash
cd backend
python analytics_engine.py --serve 5000
```

## 📄 License
This project is licensed under the MIT License.
