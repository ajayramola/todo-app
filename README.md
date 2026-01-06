# 💬 Full-Stack Real-Time Chat Application

A powerful, cross-platform chat application built with **React**, **React Native (Expo)**, **Node.js**, and **tRPC**. It supports real-time messaging, group chats, code sharing, and image uploads across Web and Mobile.

## 🚀 Features

- **Real-time Messaging:** Instant message delivery using WebSockets.
- **Cross-Platform:** Works seamlessly on Web, Android, and iOS.
- **Group Chats:** Create groups, name them, and add multiple members.
- **Code Sharing:** Special "Code Mode" to share formatted code snippets.
- **Media Sharing:** Upload and view images.
- **Online Status:** See who is online or offline (Green Dot indicator).
- **Authentication:** Secure Login/Logout with auto-reload on logout.
- **Smooth UI:** "Inverted" chat lists for proper scrolling and keyboard handling.

## 🛠 Tech Stack

- **Frontend (Web):** React, Vite, Tailwind CSS
- **Frontend (Mobile):** React Native, Expo, Expo Router
- **Backend:** Node.js, tRPC, Prisma (ORM)
- **Database:** PostgreSQL (or MySQL/SQLite)
- **State Management:** React Query (TanStack Query) via tRPC

---

## 📂 Project Structure

```bash
/
├── backend/         # Node.js Server & API
├── web-client/      # React Web App
└── mobile-client/   # React Native Expo App
