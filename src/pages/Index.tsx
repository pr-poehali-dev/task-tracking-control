import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/ba57eaf4-95b1-4d3d-8b90-247ea302d686";
const TASKS_URL = "https://functions.poehali.dev/25c9e8c4-db7f-4c69-bb69-acf4e5e76b22";

type Priority = "low" | "medium" | "high";
type Category = "work" | "personal" | "health" | "finance" | "other";
type TaskStatus = "active" | "done";
type Tab = "tasks" | "deadlines" | "stats" | "categories" | "profile";

interface Task {
  id: number;
  title: string;
  description?: string;
  priority: Priority;
  category: Category;
  status: TaskStatus;
  due_date?: string;
  is_shared: boolean;
  owner_id: number;
  owner_name: string;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  display_name: string;
}

const CATEGORIES: Record<Category, { label: string; color: string }> = {
  work: { label: "Работа", color: "bg-blue-100 text-blue-700" },
  personal: { label: "Личное", color: "bg-purple-100 text-purple-700" },
  health: { label: "Здоровье", color: "bg-green-100 text-green-700" },
  finance: { label: "Финансы", color: "bg-amber-100 text-amber-700" },
  other: { label: "Другое", color: "bg-gray-100 text-gray-600" },
};

const PRIORITIES: Record<Priority, { label: string; dot: string }> = {
  high: { label: "Высокий", dot: "bg-red-500" },
  medium: { label: "Средний", dot: "bg-amber-400" },
  low: { label: "Низкий", dot: "bg-gray-300" },
};

function authFetch(action: string, data: Record<string, unknown> = {}, sessionId?: string) {
  return fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(sessionId ? { "X-Session-Id": sessionId } : {}) },
    body: JSON.stringify({ action, ...data }),
  }).then(r => r.json());
}

function tasksFetch(action: string, data: Record<string, unknown> = {}, sessionId: string) {
  return fetch(TASKS_URL, {
    method: action === "list" ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
    body: action === "list" ? undefined : JSON.stringify({ action, ...data }),
  }).then(r => r.json());
}

// ─── Auth Screen ───────────────────────────────────────────────────
function AuthScreen({ onLogin }: { onLogin: (user: User, sessionId: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ username: "", password: "", display_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    const res = await authFetch(mode, form);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    onLogin(res.user, res.session_id);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4" style={{ fontFamily: "'Golos Text', sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-[hsl(var(--foreground))] flex items-center justify-center">
            <Icon name="CheckSquare" size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Задачи</span>
        </div>

        <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm">
          <div className="flex gap-1 bg-[hsl(var(--muted))] rounded-xl p-1 mb-5">
            {(["login", "register"] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === m ? "bg-white shadow-sm text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}
              >
                {m === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {mode === "register" && (
              <input
                className="w-full border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[hsl(var(--foreground))] transition-colors"
                placeholder="Имя"
                value={form.display_name}
                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              />
            )}
            <input
              className="w-full border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[hsl(var(--foreground))] transition-colors"
              placeholder="Логин"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              autoCapitalize="none"
            />
            <input
              type="password"
              className="w-full border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[hsl(var(--foreground))] transition-colors"
              placeholder="Пароль"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && submit()}
            />
          </div>

          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full mt-4 bg-[hsl(var(--foreground))] text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? "..." : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </div>

        <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-4">
          Данные синхронизируются между устройствами
        </p>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────
export default function Index() {
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem("session_id"));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [filterStatus, setFilterStatus] = useState<"all" | TaskStatus>("all");
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [filterScope, setFilterScope] = useState<"all" | "mine" | "shared">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [form, setForm] = useState({
    title: "", description: "", priority: "medium" as Priority,
    category: "work" as Category, due_date: "", is_shared: false,
  });

  // Verify session on load
  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    authFetch("me", {}, sessionId).then(res => {
      if (res.user) { setCurrentUser(res.user); }
      else { setSessionId(null); localStorage.removeItem("session_id"); }
      setLoading(false);
    });
  }, []);

  const loadTasks = useCallback(() => {
    if (!sessionId) return;
    tasksFetch("list", {}, sessionId).then(res => {
      if (res.tasks) setTasks(res.tasks);
    });
  }, [sessionId]);

  useEffect(() => { if (currentUser) loadTasks(); }, [currentUser, loadTasks]);

  const handleLogin = (user: User, sid: string) => {
    localStorage.setItem("session_id", sid);
    setSessionId(sid);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    if (sessionId) authFetch("logout", {}, sessionId);
    localStorage.removeItem("session_id");
    setSessionId(null);
    setCurrentUser(null);
    setTasks([]);
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === "done" ? "active" : "done";
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await tasksFetch("update", { id: task.id, status: newStatus }, sessionId!);
  };

  const deleteTask = async (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await tasksFetch("delete", { id }, sessionId!);
  };

  const openAdd = () => {
    setForm({ title: "", description: "", priority: "medium", category: "work", due_date: "", is_shared: false });
    setEditingTask(null);
    setShowAddModal(true);
  };

  const openEdit = (task: Task) => {
    setForm({
      title: task.title, description: task.description || "",
      priority: task.priority, category: task.category,
      due_date: task.due_date || "", is_shared: task.is_shared,
    });
    setEditingTask(task);
    setShowAddModal(true);
  };

  const saveTask = async () => {
    if (!form.title.trim()) return;
    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? {
        ...t, ...form, due_date: form.due_date || undefined
      } : t));
      await tasksFetch("update", { id: editingTask.id, ...form, due_date: form.due_date || null }, sessionId!);
    } else {
      const res = await tasksFetch("create", { ...form, due_date: form.due_date || null }, sessionId!);
      if (res.task) setTasks(prev => [res.task, ...prev]);
    }
    setShowAddModal(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const isOverdue = (d?: string) => d && new Date(d) < new Date(new Date().toDateString());

  const filteredTasks = tasks.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (filterScope === "mine" && t.owner_id !== currentUser?.id) return false;
    if (filterScope === "shared" && !t.is_shared) return false;
    return true;
  });

  const myTasks = tasks.filter(t => t.owner_id === currentUser?.id);
  const doneTasks = tasks.filter(t => t.status === "done");
  const activeTasks = tasks.filter(t => t.status === "active");
  const overdueTasks = activeTasks.filter(t => isOverdue(t.due_date));
  const sharedTasks = tasks.filter(t => t.is_shared);
  const completionRate = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;
  const upcoming = [...activeTasks].filter(t => t.due_date).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  const catStats = Object.entries(CATEGORIES).map(([key, val]) => ({
    key: key as Category, label: val.label,
    total: tasks.filter(t => t.category === key as Category).length,
    done: tasks.filter(t => t.category === key as Category && t.status === "done").length,
  })).filter(c => c.total > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center" style={{ fontFamily: "'Golos Text', sans-serif" }}>
        <div className="w-7 h-7 rounded-lg bg-[hsl(var(--foreground))] animate-pulse" />
      </div>
    );
  }

  if (!currentUser) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#f5f5f5]" style={{ fontFamily: "'Golos Text', sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-[hsl(var(--border))] sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--foreground))] flex items-center justify-center">
              <Icon name="CheckSquare" size={14} className="text-white" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight">Задачи</span>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-[hsl(var(--foreground))] text-white text-sm px-3 py-1.5 rounded-lg font-medium hover:opacity-80 transition-opacity"
          >
            <Icon name="Plus" size={15} />
            Добавить
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-24">

        {/* ── Tasks ── */}
        {activeTab === "tasks" && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-3 gap-3 pt-4 pb-2">
              <div className="bg-white rounded-xl p-3 border border-[hsl(var(--border))]">
                <div className="text-2xl font-bold">{activeTasks.length}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Активных</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-[hsl(var(--border))]">
                <div className="text-2xl font-bold text-green-600">{doneTasks.length}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Выполнено</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-[hsl(var(--border))]">
                <div className="text-2xl font-bold text-red-500">{overdueTasks.length}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Просрочено</div>
              </div>
            </div>

            {/* Scope filter */}
            <div className="flex gap-2 pt-2 pb-1 overflow-x-auto">
              {[
                { val: "all", label: "Все" },
                { val: "mine", label: "Мои" },
                { val: "shared", label: "Общие" },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setFilterScope(opt.val as "all" | "mine" | "shared")}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${filterScope === opt.val ? "bg-[hsl(var(--foreground))] text-white border-transparent" : "bg-white border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"}`}
                >
                  {opt.label}
                  {opt.val === "shared" && sharedTasks.length > 0 && (
                    <span className={`ml-1.5 text-[10px] px-1 rounded-full ${filterScope === "shared" ? "bg-white/20" : "bg-orange-100 text-orange-600"}`}>{sharedTasks.length}</span>
                  )}
                </button>
              ))}
              <div className="w-px bg-[hsl(var(--border))] shrink-0 mx-1" />
              {[
                { val: "all", label: "Все" },
                { val: "active", label: "Активные" },
                { val: "done", label: "Готово" },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setFilterStatus(opt.val as "all" | TaskStatus)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${filterStatus === opt.val ? "bg-[hsl(var(--foreground))] text-white border-transparent" : "bg-white border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              {filteredTasks.length === 0 && (
                <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
                  <Icon name="Inbox" size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Нет задач</p>
                </div>
              )}
              {filteredTasks.map((task, i) => (
                <div
                  key={task.id}
                  className="task-enter bg-white rounded-xl border border-[hsl(var(--border))] p-4 flex gap-3 items-start hover:shadow-sm transition-shadow"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <button
                    onClick={() => toggleTask(task)}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${task.status === "done" ? "bg-[hsl(var(--foreground))] border-[hsl(var(--foreground))]" : "border-[hsl(var(--border))] hover:border-gray-400"}`}
                  >
                    {task.status === "done" && <Icon name="Check" size={11} className="text-white" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-snug ${task.status === "done" ? "line-through text-[hsl(var(--muted-foreground))]" : ""}`}>
                        {task.title}
                      </p>
                      <div className="flex gap-1 shrink-0">
                        {task.is_shared && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-500 rounded border border-orange-100">общая</span>
                        )}
                        {task.owner_id === currentUser?.id && (
                          <button onClick={() => openEdit(task)} className="p-1 rounded hover:bg-gray-100 transition-colors">
                            <Icon name="Pencil" size={13} className="text-[hsl(var(--muted-foreground))]" />
                          </button>
                        )}
                        {task.owner_id === currentUser?.id && (
                          <button onClick={() => deleteTask(task.id)} className="p-1 rounded hover:bg-red-50 transition-colors">
                            <Icon name="Trash2" size={13} className="text-[hsl(var(--muted-foreground))]" />
                          </button>
                        )}
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 line-clamp-1">{task.description}</p>
                    )}

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CATEGORIES[task.category]?.color}`}>
                        {CATEGORIES[task.category]?.label}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${PRIORITIES[task.priority]?.dot}`} />
                        <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{PRIORITIES[task.priority]?.label}</span>
                      </span>
                      {task.is_shared && task.owner_id !== currentUser?.id && (
                        <span className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                          <Icon name="User" size={10} />
                          {task.owner_name}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={`flex items-center gap-1 text-[11px] ${isOverdue(task.due_date) && task.status === "active" ? "text-red-500" : "text-[hsl(var(--muted-foreground))]"}`}>
                          <Icon name="Clock" size={11} />
                          {formatDate(task.due_date)}
                          {isOverdue(task.due_date) && task.status === "active" && " — просрочено"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Deadlines ── */}
        {activeTab === "deadlines" && (
          <div className="animate-fade-in pt-4">
            <h2 className="font-semibold text-base mb-1">Сроки выполнения</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Задачи, отсортированные по дедлайну</p>

            {overdueTasks.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-red-600">Просрочено ({overdueTasks.length})</span>
                </div>
                <div className="space-y-2">
                  {overdueTasks.map(task => (
                    <div key={task.id} className="bg-white border border-red-100 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <Icon name="AlertCircle" size={16} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-red-400 mt-0.5">{task.due_date && formatDate(task.due_date)} · {task.owner_name}</p>
                      </div>
                      {task.owner_id === currentUser?.id || task.is_shared ? (
                        <button onClick={() => toggleTask(task)} className="shrink-0 text-xs px-3 py-1.5 bg-[hsl(var(--foreground))] text-white rounded-lg">Готово</button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcoming.filter(t => !isOverdue(t.due_date)).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-sm font-medium">Предстоящие</span>
                </div>
                <div className="space-y-2">
                  {upcoming.filter(t => !isOverdue(t.due_date)).map(task => {
                    const daysLeft = Math.ceil((new Date(task.due_date!).getTime() - Date.now()) / 86400000);
                    return (
                      <div key={task.id} className="bg-white border border-[hsl(var(--border))] rounded-xl p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-amber-600">{daysLeft}д</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{formatDate(task.due_date!)} · {task.owner_name}</p>
                        </div>
                        {task.is_shared && <span className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-500 rounded border border-orange-100">общая</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {upcoming.length === 0 && overdueTasks.length === 0 && (
              <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
                <Icon name="CalendarCheck" size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Нет задач со сроками</p>
              </div>
            )}
          </div>
        )}

        {/* ── Stats ── */}
        {activeTab === "stats" && (
          <div className="animate-fade-in pt-4">
            <h2 className="font-semibold text-base mb-1">Статистика</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Обзор продуктивности</p>

            <div className="bg-[hsl(var(--foreground))] text-white rounded-2xl p-6 mb-4">
              <div className="text-5xl font-bold">{completionRate}%</div>
              <div className="text-sm opacity-70 mt-1">задач выполнено</div>
              <div className="mt-4 bg-white/10 rounded-full h-2">
                <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${completionRate}%` }} />
              </div>
              <div className="flex justify-between text-xs opacity-60 mt-1">
                <span>{doneTasks.length} выполнено</span>
                <span>{tasks.length} всего</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
                <div className="text-2xl font-bold">{myTasks.length}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Моих задач</div>
              </div>
              <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
                <div className="text-2xl font-bold text-orange-500">{sharedTasks.length}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Общих задач</div>
              </div>
            </div>

            <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4 mb-3">
              <div className="text-sm font-medium mb-3">По приоритетам</div>
              {(["high", "medium", "low"] as Priority[]).map(p => {
                const cnt = tasks.filter(t => t.priority === p).length;
                const doneCnt = tasks.filter(t => t.priority === p && t.status === "done").length;
                const pct = cnt ? Math.round((doneCnt / cnt) * 100) : 0;
                return (
                  <div key={p} className="flex items-center gap-3 mb-3 last:mb-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITIES[p].dot}`} />
                    <span className="text-sm w-20 text-[hsl(var(--muted-foreground))]">{PRIORITIES[p].label}</span>
                    <div className="flex-1 bg-[hsl(var(--muted))] rounded-full h-1.5">
                      <div className="bg-[hsl(var(--foreground))] rounded-full h-1.5 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] w-8 text-right">{cnt}</span>
                  </div>
                );
              })}
            </div>

            <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
              <div className="text-sm font-medium mb-3">По категориям</div>
              <div className="space-y-3">
                {catStats.map(c => (
                  <div key={c.key} className="flex items-center gap-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full w-20 text-center shrink-0 ${CATEGORIES[c.key].color}`}>{c.label}</span>
                    <div className="flex-1 bg-[hsl(var(--muted))] rounded-full h-1.5">
                      <div className="bg-[hsl(var(--foreground))] rounded-full h-1.5 transition-all" style={{ width: `${c.total ? Math.round((c.done / c.total) * 100) : 0}%` }} />
                    </div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] w-14 text-right">{c.done}/{c.total}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Categories ── */}
        {activeTab === "categories" && (
          <div className="animate-fade-in pt-4">
            <h2 className="font-semibold text-base mb-1">Категории</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Задачи по категориям</p>
            <div className="space-y-4">
              {(Object.entries(CATEGORIES) as [Category, { label: string; color: string }][]).map(([key, val]) => {
                const catTasks = tasks.filter(t => t.category === key);
                if (catTasks.length === 0) return null;
                const done = catTasks.filter(t => t.status === "done").length;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${val.color}`}>{val.label}</span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{done}/{catTasks.length}</span>
                      </div>
                      <button onClick={() => { setFilterCategory(key); setActiveTab("tasks"); }} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">Все →</button>
                    </div>
                    <div className="space-y-2">
                      {catTasks.slice(0, 3).map(task => (
                        <div key={task.id} className="bg-white border border-[hsl(var(--border))] rounded-xl px-4 py-3 flex items-center gap-3">
                          <button onClick={() => toggleTask(task)} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${task.status === "done" ? "bg-[hsl(var(--foreground))] border-[hsl(var(--foreground))]" : "border-[hsl(var(--border))]"}`}>
                            {task.status === "done" && <Icon name="Check" size={9} className="text-white" />}
                          </button>
                          <p className={`text-sm flex-1 truncate ${task.status === "done" ? "line-through text-[hsl(var(--muted-foreground))]" : ""}`}>{task.title}</p>
                          <div className="flex items-center gap-1.5">
                            {task.is_shared && <span className="text-[10px] text-orange-400">общая</span>}
                            {task.due_date && <span className={`text-[11px] ${isOverdue(task.due_date) && task.status === "active" ? "text-red-400" : "text-[hsl(var(--muted-foreground))]"}`}>{formatDate(task.due_date)}</span>}
                          </div>
                        </div>
                      ))}
                      {catTasks.length > 3 && (
                        <button onClick={() => { setFilterCategory(key); setActiveTab("tasks"); }} className="w-full text-xs text-[hsl(var(--muted-foreground))] py-2 text-center hover:text-[hsl(var(--foreground))] transition-colors">
                          Ещё {catTasks.length - 3} задачи
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Profile ── */}
        {activeTab === "profile" && (
          <div className="animate-fade-in pt-4">
            <div className="bg-white border border-[hsl(var(--border))] rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--foreground))] flex items-center justify-center">
                  <span className="text-white text-xl font-bold">{currentUser.display_name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-semibold text-base">{currentUser.display_name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">@{currentUser.username}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[hsl(var(--border))] rounded-xl overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-[hsl(var(--border))]">
                <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Мои данные</span>
              </div>
              <div className="divide-y divide-[hsl(var(--border))]">
                {[
                  { label: "Всего моих задач", value: myTasks.length },
                  { label: "Выполнено", value: myTasks.filter(t => t.status === "done").length },
                  { label: "Активных", value: myTasks.filter(t => t.status === "active").length },
                  { label: "Общих задач (все)", value: sharedTasks.length },
                ].map(item => (
                  <div key={item.label} className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full bg-white border border-[hsl(var(--border))] rounded-xl py-3 text-sm text-red-500 font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="LogOut" size={15} />
              Выйти из аккаунта
            </button>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[hsl(var(--border))] z-30">
        <div className="max-w-2xl mx-auto px-2 h-16 flex items-center justify-around">
          {[
            { id: "tasks" as Tab, icon: "CheckSquare", label: "Задачи" },
            { id: "deadlines" as Tab, icon: "Clock", label: "Сроки" },
            { id: "stats" as Tab, icon: "BarChart2", label: "Статистика" },
            { id: "categories" as Tab, icon: "Tag", label: "Категории" },
            { id: "profile" as Tab, icon: "User", label: "Профиль" },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${activeTab === item.id ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}
            >
              <Icon name={item.icon} size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {activeTab === item.id && <span className="w-1 h-1 rounded-full bg-orange-500" />}
            </button>
          ))}
        </div>
      </nav>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base">{editingTask ? "Редактировать задачу" : "Новая задача"}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                className="w-full border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[hsl(var(--foreground))] transition-colors"
                placeholder="Название задачи..."
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                autoFocus
              />
              <textarea
                className="w-full border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[hsl(var(--foreground))] transition-colors resize-none"
                placeholder="Описание (необязательно)..."
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Приоритет</label>
                  <select className="w-full border border-[hsl(var(--border))] rounded-xl px-3 py-2 text-sm outline-none focus:border-[hsl(var(--foreground))] bg-white" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                    <option value="high">Высокий</option>
                    <option value="medium">Средний</option>
                    <option value="low">Низкий</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Категория</label>
                  <select className="w-full border border-[hsl(var(--border))] rounded-xl px-3 py-2 text-sm outline-none focus:border-[hsl(var(--foreground))] bg-white" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}>
                    {(Object.entries(CATEGORIES) as [Category, { label: string; color: string }][]).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Срок выполнения</label>
                <input type="date" className="w-full border border-[hsl(var(--border))] rounded-xl px-3 py-2 text-sm outline-none focus:border-[hsl(var(--foreground))] bg-white" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>

              {/* Shared toggle */}
              <div className="flex items-center justify-between p-3 bg-[hsl(var(--muted))] rounded-xl">
                <div>
                  <p className="text-sm font-medium">Общая задача</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Видна всем пользователям</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, is_shared: !f.is_shared }))}
                  className={`w-11 h-6 rounded-full transition-all relative ${form.is_shared ? "bg-orange-400" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.is_shared ? "left-6" : "left-1"}`} />
                </button>
              </div>

              <button
                onClick={saveTask}
                disabled={!form.title.trim()}
                className="w-full bg-[hsl(var(--foreground))] text-white py-3 rounded-xl text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {editingTask ? "Сохранить" : "Добавить задачу"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
