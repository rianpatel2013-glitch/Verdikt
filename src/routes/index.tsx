import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUpRight, Sparkles, Send, Loader2, Upload, Camera, X, Compass, Wallet, Target, SquarePen, Search, PanelLeft, MoreHorizontal, UserRound, Palette, Sun, Moon, Check, Trash2, LogOut } from "lucide-react";
import p1 from "@/assets/p1.jpg";
import p2 from "@/assets/p2.jpg";
import p3 from "@/assets/p3.jpg";
import p4 from "@/assets/p4.jpg";
import { CameraModal } from "@/components/CameraModal";
import {
  listChats,
  getChatMessages,
  sendMessage,
  deleteChat,
  type ChatSummary,
  type ChatMessageDTO,
} from "@/lib/chat.functions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Verdikt — AI product reviews, without the noise." },
      { name: "description", content: "Verdikt analyzes thousands of signals and writes you a brutally honest review in seconds. No sponsors. No fluff." },
      { property: "og:title", content: "Verdikt — AI product reviews" },
      { property: "og:description", content: "Brutally honest AI reviews. No sponsors. No fluff." },
    ],
  }),
  component: Index,
});

const POPULAR = [
  { name: "Sony WH-1000XM6", category: "Headphones", desc: "The reigning king of travel ANC — refined call quality and a smarter adaptive EQ over the XM5.", img: p1 },
  { name: "Apple Watch Ultra 3", category: "Smartwatch", desc: "Titanium adventure watch with satellite messaging and the brightest display Apple has shipped.", img: p2 },
  { name: "Breville Oracle Jet", category: "Espresso", desc: "Touchscreen super-auto that grinds, doses, and steams — café shots without the café learning curve.", img: p3 },
  { name: "Kindle Colorsoft Signature", category: "E-Reader", desc: "Amazon's first color e-ink reader; great for comics and cookbooks, mediocre for everything else.", img: p4 },
];

const VERDICT_STYLES: Record<string, string> = {
  Buy: "bg-accent text-accent-foreground",
  Consider: "bg-primary text-primary-foreground",
  Skip: "bg-destructive text-destructive-foreground",
};

type ChatMessage = ChatMessageDTO | { role: "user"; text?: string; image?: string };

function Index() {
  const { userEmail, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [view, setView] = useState<"chat" | "purpose" | "search">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const refreshChats = async () => {
    if (!userEmail) {
      setChats([]);
      return;
    }
    try {
      const result = await listChats({ data: { userEmail } });
      setChats(result);
    } catch (err) {
      console.error("Failed to load chats:", err);
    }
  };

  useEffect(() => {
    refreshChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  const openChat = async (chatId: string) => {
    setView("chat");
    setLoading(true);
    try {
      const history = await getChatMessages({ data: { chatId } });
      setMessages(history);
      setCurrentChatId(chatId);
    } catch (err) {
      console.error("Failed to load chat:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (text: string, image: string | null) => {
    const prompt = text.trim();
    if (!prompt && !image) return;

    setMessages((m) => [...m, { role: "user", text: prompt, image: image || undefined }]);
    setLoading(true);

    try {
      const result = await sendMessage({
        data: { prompt, chatId: currentChatId, userEmail: userEmail ?? undefined, image: image || undefined },
      });

      setMessages((m) => [...m, result.message]);

      if (!currentChatId) {
        setCurrentChatId(result.chatId);
        refreshChats();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((m) => [
        ...m,
        { role: "model", kind: "text", text: "Something went wrong. Please try again.", sources: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const newChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setLoading(false);
    setView("chat");
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat({ data: { chatId } });
      if (chatId === currentChatId) newChat();
      refreshChats();
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex">
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        view={view}
        setView={setView}
        onNewChat={newChat}
        chats={filteredChats}
        currentChatId={currentChatId}
        onSelectChat={openChat}
        onDeleteChat={handleDeleteChat}
        userEmail={userEmail}
        onSignOut={signOut}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} userEmail={userEmail} onSignOut={signOut} />
        <AnimatePresence mode="wait">
          {view === "purpose" ? (
            <motion.div key="purpose" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <OurPurpose />
            </motion.div>
          ) : view === "search" ? (
            <motion.div key="search" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <SearchChats chats={filteredChats} onSelectChat={(id) => { openChat(id); setView("chat"); }} />
            </motion.div>
          ) : messages.length === 0 ? (
            <motion.div key="home" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <ChatHome onSubmit={handleSubmit} loading={loading} />
              <PopularProducts />
            </motion.div>
          ) : (
            <motion.div key="thread" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col">
              <ChatThread messages={messages} loading={loading} onSubmit={handleSubmit} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Sidebar({
  open,
  setOpen,
  view,
  setView,
  onNewChat,
  chats,
  currentChatId,
  onSelectChat,
  onDeleteChat,
  userEmail,
  onSignOut,
  searchQuery,
  setSearchQuery,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  view: "chat" | "purpose" | "search";
  setView: (v: "chat" | "purpose" | "search") => void;
  onNewChat: () => void;
  chats: ChatSummary[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  userEmail: string | null;
  onSignOut: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  return (
    <>
      {open && (
        <button
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          aria-label="Close sidebar"
        />
      )}
      <motion.aside
        initial={false}
        animate={{ width: open ? 280 : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="shrink-0 h-screen sticky top-0 overflow-hidden border-r border-border bg-card/40 backdrop-blur-xl max-md:fixed max-md:left-0 max-md:top-0 max-md:z-40"
      >
        <div className="w-[280px] h-full flex flex-col">
          <div className="h-14 px-4 flex items-center justify-between border-b border-border/60">
            <Link to="/" onClick={onNewChat} className="flex items-center gap-2 group">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg tracking-tight">Verdikt</span>
            </Link>
            <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground" aria-label="Collapse sidebar">
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>

          <nav className="p-2 space-y-0.5">
            <SidebarItem icon={SquarePen} label="New chat" active={view === "chat" && !currentChatId} onClick={onNewChat} />
            {userEmail && <SidebarItem icon={Search} label="Search chats" active={view === "search"} onClick={() => setView("search")} />}
            <SidebarItem icon={Compass} label="Our Purpose" active={view === "purpose"} onClick={() => setView("purpose")} />
          </nav>

          <div className="px-4 pt-5 pb-2 text-xs font-semibold text-muted-foreground">Recents</div>
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
            {!userEmail ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                <Link to="/login" className="text-primary hover:underline">Sign in</Link> to save and revisit your chats.
              </div>
            ) : chats.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No chats yet. Ask Verdikt about a product!
              </div>
            ) : (
              chats.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-center gap-1 rounded-md transition-colors ${c.id === currentChatId ? "bg-muted" : "hover:bg-muted"
                    }`}
                >
                  <button
                    onClick={() => onSelectChat(c.id)}
                    className="flex-1 min-w-0 text-left px-3 py-2 text-sm text-foreground/80 truncate"
                  >
                    {c.name}
                  </button>
                  <button
                    onClick={() => onDeleteChat(c.id)}
                    aria-label="Delete chat"
                    className="h-7 w-7 mr-1 shrink-0 rounded-md hover:bg-destructive hover:text-destructive-foreground text-muted-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border/60 p-3">
            {userEmail ? (
              <div className="flex items-center gap-3 px-2 py-2 rounded-md">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                  {userEmail[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{userEmail}</div>
                </div>
                <button
                  onClick={onSignOut}
                  aria-label="Sign out"
                  className="h-8 w-8 rounded-md hover:bg-destructive hover:text-destructive-foreground text-muted-foreground flex items-center justify-center transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:shadow-[var(--shadow-glow)] transition-shadow">
                <UserRound className="h-4 w-4" />
                Sign in
              </Link>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}



function SidebarItem({ icon: Icon, label, active, onClick }: { icon: typeof SquarePen; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${active ? "bg-muted text-foreground" : "text-foreground/85 hover:bg-muted"
        }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function TopBar({ sidebarOpen, setSidebarOpen, userEmail, onSignOut }: { sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void; userEmail: string | null; onSignOut: () => void }) {
  return (
    <header className="h-14 px-4 flex items-center justify-between border-b border-border/60 sticky top-0 z-20 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} className="h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center" aria-label="Open sidebar">
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
        <span className="font-display text-lg">Verdikt</span>
      </div>
      {!userEmail ? (
        <Link to="/login" className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-foreground text-background text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors">
          Sign in
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      ) : (
        <button
          onClick={onSignOut}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-foreground text-background text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      )}
    </header>
  );
}

function ChatHome({ onSubmit, loading }: { onSubmit: (text: string, image: string | null) => void; loading: boolean }) {
  return (
    <section className="px-4 sm:px-6 pt-16 sm:pt-24 pb-12">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10"
        >
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
            What are we <em className="italic text-primary">reviewing</em> today?
          </h1>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base">
            Drop a product name or photo — Verdikt returns a brutally honest verdict in seconds.
          </p>
        </motion.div>

        <Composer onSubmit={onSubmit} loading={loading} autoFocus />
      </div>
    </section>
  );
}

function ChatThread({ messages, loading, onSubmit }: { messages: ChatMessage[]; loading: boolean; onSubmit: (text: string, image: string | null) => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl bg-primary text-primary-foreground px-4 py-3">
                {m.image && <img src={m.image} alt="" className="mb-2 max-h-48 rounded-md" />}
                {m.text && <div className="text-base whitespace-pre-wrap">{m.text}</div>}
              </div>
              </motion.div>
            ) : (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                <div className="w-full max-w-[90%]">
                  {m.kind === "report" ? (
                    <ResultCard report={m.report} />
                  ) : (
                    <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:mb-3 prose-li:mb-2 prose-strong:block prose-strong:mt-3">
                      <ReactMarkdown>{m.text}</ReactMarkdown>
                    </div>
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Sources</h4>
                          <ul className="space-y-1">
                            {m.sources.map((s, idx) => (
                              <li key={idx}>
                                <a href={s.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                  {s.title}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ),
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground px-4 py-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                scanning reviews, teardowns &amp; forums…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <div className="sticky bottom-0 border-t border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <Composer onSubmit={onSubmit} loading={loading} autoFocus />
        </div>
      </div>
    </>
  );
}

function ResultCard({ report }: { report: any }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Verdikt</div>
          <div className={`mt-1 inline-block px-2.5 py-1 text-xs font-mono uppercase ${VERDICT_STYLES[report.verdict]}`}>{report.verdict}</div>
        </div>
        <div className="font-display text-5xl text-primary">{report.score}</div>
      </div>
      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div className="p-5">
          <div className="font-mono text-[10px] uppercase text-accent mb-2">Pros</div>
          <ul className="space-y-1.5 text-sm">{report.pros.map((p: string) => <li key={p}>+ {p}</li>)}</ul>
        </div>
        <div className="p-5">
          <div className="font-mono text-[10px] uppercase text-destructive mb-2">Cons</div>
          <ul className="space-y-1.5 text-sm">{report.cons.map((c: string) => <li key={c}>− {c}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}

function Composer({ onSubmit, loading, autoFocus }: { onSubmit: (text: string, image: string | null) => void; loading: boolean; autoFocus?: boolean }) {
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const handleFile = (file: File | undefined | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!input.trim() && !image) return;
    onSubmit(input, image);
    setInput("");
    setImage(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <>
      <form
        onSubmit={submit}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
        className={`relative rounded-2xl border bg-card/80 backdrop-blur shadow-[var(--shadow-elegant)] transition-colors ${dragging ? "border-primary" : "border-border"}`}
      >
        {image && (
          <div className="p-3 pb-0">
            <div className="relative inline-block">
              <img src={image} alt="" className="h-20 w-20 object-cover rounded-md border border-border" />
              <button type="button" onClick={() => setImage(null)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Verdikt about any product…"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(e as unknown as React.FormEvent);
            }
          }}
          className="w-full bg-transparent resize-none px-5 pt-4 pb-2 text-base placeholder:text-muted-foreground/70 focus:outline-none"
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            <IconBtn onClick={() => fileRef.current?.click()} label="Upload image"><Upload className="h-4 w-4" /></IconBtn>
            <IconBtn onClick={() => setCameraOpen(true)} label="Take photo"><Camera className="h-4 w-4" /></IconBtn>
          </div>
          <button
            type="submit"
            disabled={loading || (!input.trim() && !image)}
            className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[var(--shadow-glow)] transition-all"
            aria-label="Send"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </form>

      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(dataUrl) => setImage(dataUrl)}
        onFallbackFile={(f) => handleFile(f)}
      />
    </>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick?: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="h-9 w-9 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors">
      {children}
    </button>
  );
}

function PopularProducts() {
  return (
    <section className="px-6 pb-24 pt-16 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-8 gap-6 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">// Trending now</div>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight">
            This week's <em className="italic text-primary">top rulings.</em>
          </h2>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {POPULAR.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4 }}
            className="group rounded-md border border-border bg-card overflow-hidden cursor-pointer"
          >
            <div className="aspect-square overflow-hidden bg-background">
              <motion.img
                src={p.img}
                alt={p.name}
                loading="lazy"
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="p-5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{p.category}</div>
              <h3 className="font-display text-xl mt-1 group-hover:text-primary transition-colors">{p.name}</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{p.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function OurPurpose() {
  const pillars = [
    { icon: Compass, title: "Find what fits", body: "We match products to the way you actually live — not the way a marketing deck describes you." },
    { icon: Wallet, title: "Skip the waste", body: "Every recommendation considers what you'd be paying for that you'll never use, touch, or notice." },
    { icon: Target, title: "No agenda", body: "No affiliate kickbacks. No paid placements. The verdict you read is the verdict the model wrote." },
  ];
  return (
    <section id="purpose" className="relative px-6 py-32 max-w-7xl mx-auto border-t border-border overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-50" style={{ background: "var(--gradient-glow)" }} />
      <div className="relative grid lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-5">
          <div className="font-mono text-xs uppercase tracking-widest text-primary mb-4">// Our purpose</div>
          <h2 className="font-display text-5xl md:text-6xl leading-[0.95] tracking-tight text-balance">
            We built this so you'd <em className="italic text-primary">stop overpaying</em> for things you never needed.
          </h2>
          <p className="mt-6 text-muted-foreground max-w-md leading-relaxed">
            The internet is drowning in five-star reviews from people who got the product free. Verdikt exists for the rest of us — the people who actually have to spend the money.
          </p>
        </div>
        <div className="lg:col-span-7 space-y-px bg-border rounded-md overflow-hidden">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-card p-8 flex gap-5 items-start"
            >
              <div className="h-10 w-10 shrink-0 rounded-sm bg-primary/10 flex items-center justify-center">
                <p.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-display text-2xl mb-1">{p.title}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SearchChats({ chats, onSelectChat }: { chats: ChatSummary[]; onSelectChat: (id: string) => void }) {
  return (
    <section className="px-4 sm:px-6 pt-16 sm:pt-24 pb-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight mb-8">Your chats</h1>

        <div className="grid gap-4">
          {chats.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No chats yet. Start a new chat to ask Verdikt about a product!</p>
            </div>
          ) : (
            chats.map((chat) => (
              <motion.button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ x: 4 }}
                className="text-left rounded-lg border border-border bg-card hover:bg-card/80 hover:border-primary transition-all p-5"
              >
                <h3 className="font-display text-lg font-semibold text-foreground mb-1">{chat.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(chat.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </motion.button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}