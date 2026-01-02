# BULKSTACK
**v2.1 // Gamified & AI-Powered**

BulkStack is a modern, dark-themed diet planner designed to help you organize your bulking phase efficiently. Now with AI-powered meal generation and gamification to keep you consistent.

## 🚀 Features

*   **✨ AI Chef**: Generate custom meal ideas instantly using Google Gemini. Just describe what you have (e.g., "High protein with eggs"), and it creates a module for you.
*   **🎮 Gamified Planner**: Track your "Perfect Days" streak and climb the ranks from "Novice" to "Iron Lifter".
*   **📊 Progress Tracking**: Visual daily completion rings and "Today" view focus.
*   **Weekly Planner**: Granular scheduling for Breakfast, Lunch, Dinner, and Snacks.
*   **Smart Shopping List**: Automatically aggregates ingredients from your plans.
*   **Module Manager**: Create, edit, and delete custom meal templates.
*   **Local First**: Data persists in LocalStorage.

## 🛠️ Tech Stack

*   **React 19**
*   **Vite**
*   **TailwindCSS 4**
*   **Google Gemini AI**
*   **Lucide React** (Icons)

## 📦 Getting Started

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Setup Environment Variables**:
    Create a `.env` file in the root and add your Gemini API key:
    ```env
    VITE_GEMINI_API_KEY=your_gen_ai_key_here
    ```
4.  **Start the development server**:
    ```bash
    npm run dev
    ```

## 📖 How to Use

### 1. The Planner
*   Swipe horizontally to view days. The current day is highlighted.
*   Complete meals to fill your daily progress ring.
*   Maintain a 100% completion streak to increase your "Perfect Days" count.

### 2. AI Chef & Module Manager
*   Go to **MANAGE** tab.
*   Click **AI Gen** on any category.
*   Type a prompt like *"Cheap post-workout meal"* and let AI build it for you.
*   Manual creation is still available via **Add Manual**.

### 3. Shopping List
*   Switch to **SHOP** to see your consolidated grocery list.

---
*Built with React & Vite*
