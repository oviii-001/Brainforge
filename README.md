# Brainforge

Brainforge is a full-stack Collaborative Idea Marketplace where users can publish innovative ideas, discover others' ideas, comment, upvote/downvote, request to collaborate, form teams, and build projects together.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Radix UI, Lucide Icons, Framer Motion
- **Backend:** Firebase (Auth, Firestore, Storage, Analytics)
- **Forms:** React Hook Form
- **Routing:** React Router v6
- **Notifications:** Sonner

## Getting Started

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Copy `.env.example` to `.env` and fill in your Firebase credentials
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Email/Password** and **Google** authentication
3. Create a **Firestore Database** (start in test mode)
4. Enable **Storage** (start in test mode)
5. Copy the web app config values into your `.env` file

## Features

- User authentication (email/password + Google sign-in)
- Create, edit, and delete ideas
- Explore and search ideas by category, tags, and sorting
- Upvote/downvote system
- Nested comments with replies
- Bookmark ideas
- Share ideas (copy link, X, LinkedIn)
- Collaboration requests and team management
- User profiles with skills, bio, and social links
- Notifications
- Admin panel (user management, content moderation)
- Dark/light mode
- Fully responsive design
