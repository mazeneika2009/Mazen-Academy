# Knowledge Garden — Interactive Learning Management Platform

**Knowledge Garden** is a full-featured educational platform that transforms online learning into a growth-based experience. Built with React, TypeScript, Express, and MySQL, it offers interactive video lessons, progress tracking, skill assessments, and a unique garden-metaphor interface for managing courses.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express)](https://expressjs.com)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql)](https://www.mysql.com)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **🌱 Garden-Based Course Management** — Organize learning content as gardens and seeds. Each garden represents a course, with seeds as individual lessons or modules.
- **🎥 Interactive Video Player** — Watermark-protected video streaming with timestamp tracking, progress saving, and quiz integration at checkpoints.
- **📝 Knowledge Check Quizzes** — Embedded quizzes within video lessons to reinforce learning, with review and retry capabilities.
- **📊 Student Growth Analytics** — Track study time, completed seeds, quiz scores, and generate growth reports with certificates.
- **🔐 Secure Authentication** — Email/phone OTP verification, session management, and role-based access for students and administrators.
- **🌍 Multi-Language Support** — Full Arabic (RTL), English, and Turkish translations with a language selector.
- **🎓 Admin Dashboard** — CMS for managing gardens, seeds, quiz questions, user registries, transaction logs, and system analytics.
- **💳 Sandbox Payment Gateway** — Simulated checkout experience with InstaPay, mobile wallet, credit card, and Papara support.
- **📬 Secure Inbox** — Simulated email system for OTP delivery, growth reports, and encrypted messaging.
- **📈 Realtime Analytics** — Revenue charts, weekly growth metrics, and student performance statistics.
- **📱 Responsive Design** — Fully responsive glassmorphic UI that works across desktop, tablet, and mobile.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript 5.8, Tailwind CSS 4, Motion (Framer Motion), Recharts |
| **Backend** | Express 4, TypeScript (via tsx), MySQL 2 |
| **Build** | Vite 6, esbuild |
| **Database** | MySQL 8 with automatic migration |
| **Auth** | OTP-based email/phone verification via Nodemailer |
| **Media** | Multer file uploads, watermark-protected video streaming |

## Getting Started

### Prerequisites

- **Node.js** 18+
- **MySQL** 8+
- **npm**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/knowledge-garden.git
cd knowledge-garden

# 2. Install dependencies
npm install

# 3. Configure environment
# Edit .env with your MySQL credentials and SMTP settings:
#   DB_HOST=localhost
#   DB_PORT=3308
#   DB_USER=root
#   DB_PASSWORD=yourpassword
#   DB_NAME=edu
#   SMTP_HOST=smtp.gmail.com
#   SMTP_USER=your@email.com
#   SMTP_PASS=your_app_password

# 4. Initialize the database
mysql -u root -p < schema.sql

# 5. Start the development server
npm run dev
```

The server starts at **http://localhost:3001** with Vite middleware automatically serving the frontend.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
knowledge-garden/
├── src/                    # Frontend React application
│   ├── App.tsx             # Main application with routing
│   ├── types.ts            # TypeScript types & localization
│   ├── main.tsx            # React entry point
│   └── components/         # UI components
│       ├── AdminPanel.tsx           # Admin dashboard & CMS
│       ├── WatermarkPlayer.tsx       # Secure video player
│       ├── QuizReview.tsx            # Quiz review interface
│       ├── UserProfile.tsx           # Student profile page
│       ├── GrowthReportModal.tsx     # Certificate & report modal
│       ├── CheckoutSandbox.tsx       # Payment gateway sandbox
│       ├── DigitalNotebook.tsx       # Note-taking tool
│       ├── QueriesTab.tsx            # Q&A / instructor chat
│       ├── MockInbox.tsx             # Simulated email inbox
│       ├── MessageCard.tsx           # Email card component
│       └── LanguageSelector.tsx      # Language switcher
├── server.ts               # Express backend with API routes
├── server/                 # Backend modules
│   └── db.ts               # Database connection & queries
├── schema.sql              # MySQL schema
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies & scripts
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/gardens` | List all gardens |
| `GET` | `/api/gardens/:id` | Get garden details with seeds |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/verify` | Verify OTP code |
| `POST` | `/api/auth/login` | Login with email/phone |
| `POST` | `/api/payments/create` | Create a payment transaction |
| `POST` | `/api/payments/verify` | Verify payment and grant access |
| `GET` | `/api/progress/:sessionId` | Get student progress |
| `POST` | `/api/progress/save` | Save video progress |
| `POST` | `/api/quizzes/submit` | Submit quiz answers |
| `GET` | `/api/seeds/:id/stream` | Stream video with watermark |
| `POST` | `/api/emails` | List/send simulated emails |
| `GET` | `/api/admin/*` | Admin-only management endpoints |

## Architecture

Knowledge Garden uses a **single-origin architecture** where Express serves as both the API backend and the Vite dev middleware host. This eliminates CORS issues in development while maintaining a clean separation of concerns.

- **Database**: MySQL with automatic schema migrations on server startup
- **Caching**: In-memory cache for gardens, seeds, and user data (refreshed on mutations)
- **Security**: Watermark-overlay video streaming, OTP-based verification, rate-limited API routes
- **Localization**: Centralized translation object with three language variants (en, ar, tr)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
