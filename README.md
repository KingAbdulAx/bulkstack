# BULKSTACK
**v3.0 // Universal AI**

BulkStack is a modern, AI-first diet planner designed to automate your bulking phase. It features a persistent, context-aware AI agent that acts as your personal nutritionist—managing your pantry, logging your meals, and generating weekly schedules automatically.

## 🚀 Features

*   **🤖 Universal AI Agent**: A persistent chatbot that understands your context.
    *   **Natural Language Logging**: Just say *"I having eggs and bread"* and it checks off your meal.
    *   **Pantry Management**: Tell the AI *"I bought 3kg of rice"* to update your inventory.
    *   **Auto-Planning**: Ask the agent to *"Plan my week based on what I have"* and it generates a full schedule.
    *   **Module Creation**: Create complex reusable meals by just describing them.
*   **🎮 Gamified Planner**: Track your "Perfect Days" streak and climb the ranks from "Novice" to "Iron Lifter".
*   **🛒 Smart Shopping List**: Compares your weekly plan against your pantry to tell you exactly what you need to buy.
*   **📊 Progress Tracking**: Visual daily completion rings and "Today" view.
*   **Local First**: All data is persisted instantly to your browser's LocalStorage.

## 🛠️ Tech Stack

*   **React 19**
*   **Vite**
*   **TailwindCSS 4**
*   **Google Gemini 1.5 Flash** (AI Logic)
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

### 1. The AI Agent
*   Tap the **Message Icon** at the bottom right to open the agent.
*   **Try these commands**:
    *   *"I just ate breakfast"* (Logs meal)
    *   *"I have rice, chicken, and eggs in my pantry"* (Updates pantry)
    *   *"Create a post-workout meal with oats and whey"* (Creates module)
    *   *"Plan my week"* (Generates full schedule)

### 2. The Planner
*   Swipe horizontally to view days. The current day is highlighted.
*   Complete meals to fill your daily progress ring.
*   Maintain a 100% completion streak to increase your "Perfect Days" count.

### 3. Shopping List
*   Switch to **SHOP** to see your consolidated grocery list.
*   The list automatically subtracts items you already have in your **Pantry**.

---
*Built with React & Vite*
