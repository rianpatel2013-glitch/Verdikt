# Verdikt

Link: https://verdikt.product-review.workers.dev

Verdikt takes a product name or photo and returns an unbiase, well-reasearched verdict (Buy / Consider / Skip) with a score, pros, and cons. Then it will help you answer any follow up questions too. Built as a chat-style interface inspired by popular AIs like ChatGPT. 

## Features

- Chat-style review interface — ask about any product, get a verdict back 
- Upload a photo or capture one with your device camera (real in-browser camera, not just a file picker)
- "This week's top rulings" — trending products on the landing view
- Sidebar with recents, new chat, and our purpose
- Guest profile with quick access to plan + personalization (light/dark theme)
- Save your chats with the AI to reference later

## Tech stack

- [TanStack Start](https://tanstack.com/start) v1 (React 19 + Vite 7)
- Tailwind CSS v4 with semantic design tokens (`src/styles.css`)
- shadcn/ui components
- Motion (Framer Motion) for transitions
- Lucide icons
- Gemini to review the products
- Supabase for storing the chats

## Run on your local device

```bash
npm install
npm run dev
```

Open <http://localhost:8080>.

## Credits
- Lovable for helping code the frontend
- I coded the backend myself, but Claude helped solve any issues when linking to frontend
- Claude also helped me host this website on cloudflare