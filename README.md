# Verdikt

Brutally honest AI product reviews — no sponsors, no fluff.

Verdikt takes a product name or photo and returns a verdict (Buy / Consider / Skip) with a score, pros, and cons. Built as a chat-style interface inspired by tools like Lovable and ChatGPT.

## Features

- Chat-style review interface — ask about any product, get a verdict card back
- Upload a photo or capture one with your device camera (real in-browser camera, not just a file picker)
- "This week's top rulings" — trending products on the landing view
- Sidebar with recents, new chat, and our purpose
- Guest profile with quick access to plan + personalization (light/dark theme)

## Tech stack

- [TanStack Start](https://tanstack.com/start) v1 (React 19 + Vite 7)
- Tailwind CSS v4 with semantic design tokens (`src/styles.css`)
- shadcn/ui components
- Motion (Framer Motion) for transitions
- Lucide icons

## Getting started

```bash
bun install
bun run dev
```

Open <http://localhost:5173>.

## Project structure

```
src/
  routes/          file-based routes (TanStack Router)
    __root.tsx     app shell
    index.tsx      landing + chat thread
    login.tsx      sign-in
  components/
    CameraModal.tsx in-browser camera capture
    ui/            shadcn primitives
  styles.css       Tailwind v4 + design tokens (light + dark)
```

## Theming

Theme tokens live in `src/styles.css` under `:root` (dark editorial — default) and `.light` (light palette). Toggle by adding/removing the `light` class on `<html>`. The user menu in the sidebar exposes this as a Personalization control.

## License

MIT
