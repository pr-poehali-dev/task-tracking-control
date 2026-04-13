import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

type Priority = "low" | "medium" | "high";
type Category = "work" | "personal" | "health" | "finance" | "other";
type TaskStatus = "active" | "done";
type Tab = "tasks" | "deadlines" | "stats" | "categories" | "profile";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  category: Category;
  status: TaskStatus;
  dueDate?: string;
  createdAt: string;
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

const SAMPLE_TASKS: Task[] = [
  { id: "1", title: "Подготовить отчёт за квартал", priority: "high", category: "work", status: "active", dueDate: "2026-04-15", createdAt: "2026-04-10" },
  { id: "2", title: "Оплатить счёт за интернет", priority: "medium", category: "finance", status: "active", dueDate: "2026-04-14", createdAt: "2026-04-11" },
  { id: "3", title: "Запись к врачу", priority: "medium", category: "health", status: "done", createdAt: "2026-04-09" },
  { id: "4", title: "Созвон с командой в 15:00", priority: "high", category: "work", status: "active", dueDate: "2026-04-13", createdAt: "2026-04-12" },
  { id: "5", title: "Пробежка в парке", priority: "low", category: "health", status: "active", createdAt: "2026-04-12" },
  { id: "6", title: "Прочитать книгу «Атомные привычки»", priority: "low", category: "personal", status: "done", createdAt: "2026-04-08" },
];

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue] as const;
}

export default function Index() {
  const [tasks, setTasks] = useLocalStorage<Task[]>("tasks_v1", SAMPLE_TASKS);
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [filterStatus, setFilterStatus] = useState<"all" | TaskStatus>("all");
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [userName, setUserName] = useLocalStorage("user_name", "Пользователь");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);
  const [notifications, setNotifications] = useLocalStorage("notifications", true);

  const [form, setForm] = useState({
    title: "", description: "", priority: "medium" as Priority,
    category: "work" as Category, dueDate: "",
  });

  const filteredTasks = tasks.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    return true;
  });

  const doneTasks = tasks.filter(t => t.status === "done");
  const activeTasks = tasks.filter(t => t.status === "active");
  const overdueTasks = activeTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString()));

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === "done" ? "active" : "done" } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const openAdd = () => {
    setForm({ title: "", description: "", priority: "medium", category: "work", dueDate: "" });
    setEditingTask(null);
    setShowAddModal(true);
  };

  const openEdit = (task: Task) => {
    setForm({ title: task.title, description: task.description || "", priority: task.priority, category: task.category, dueDate: task.dueDate || "" });
    setEditingTask(task);
    setShowAddModal(true);
  };

  const saveTask = () => {
    if (!form.title.trim()) return;
    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...form } : t));
    } else {
      const newTask: Task = {
        id: Date.now().toString(), ...form, status: "active", createdAt: new Date().toISOString().split("T")[0],
      };
      setTasks(prev => [newTask, ...prev]);
    }
    setShowAddModal(false);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const isOverdue = (d?: string) => d && new Date(d) < new Date(new Date().toDateString());

  const catStats = Object.entries(CATEGORIES).map(([key, val]) => ({
    key: key as Category,
    label: val.label,
    total: tasks.filter(t => t.category === key as Category).length,
    done: tasks.filter(t => t.category === key as Category && t.status === "done").length,
  })).filter(c => c.total > 0);

  const completionRate = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const upcoming = [...activeTasks]
    .filter(t => t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

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

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 pb-24">

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="animate-fade-in">
            {/* Quick Stats */}
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

            {/* Filters */}
            <div className="flex gap-2 py-3 overflow-x-auto">
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
              <div className="w-px bg-[hsl(var(--border))] shrink-0 mx-1" />
              {(Object.entries(CATEGORIES) as [Category, { label: string; color: string }][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setFilterCategory(filterCategory === key ? "all" : key)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${filterCategory === key ? "bg-[hsl(var(--foreground))] text-white border-transparent" : "bg-white border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"}`}
                >
                  {val.label}
                </button>
              ))}
            </div>

            {/* Task List */}
            <div className="space-y-2">
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
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
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
                        <button onClick={() => openEdit(task)} className="p-1 rounded hover:bg-gray-100 transition-colors">
                          <Icon name="Pencil" size={13} className="text-[hsl(var(--muted-foreground))]" />
                        </button>
                        <button onClick={() => deleteTask(task.id)} className="p-1 rounded hover:bg-red-50 transition-colors">
                          <Icon name="Trash2" size={13} className="text-[hsl(var(--muted-foreground))]" />
                        </button>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 line-clamp-1">{task.description}</p>
                    )}

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CATEGORIES[task.category].color}`}>
                        {CATEGORIES[task.category].label}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${PRIORITIES[task.priority].dot}`} />
                        <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{PRIORITIES[task.priority].label}</span>
                      </span>
                      {task.dueDate && (
                        <span className={`flex items-center gap-1 text-[11px] ${isOverdue(task.dueDate) && task.status === "active" ? "text-red-500" : "text-[hsl(var(--muted-foreground))]"}`}>
                          <Icon name="Clock" size={11} />
                          {formatDate(task.dueDate)}
                          {isOverdue(task.dueDate) && task.status === "active" && " — просрочено"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deadlines Tab */}
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
                        <p className="text-xs text-red-400 mt-0.5">{task.dueDate && formatDate(task.dueDate)}</p>
                      </div>
                      <button onClick={() => toggleTask(task.id)} className="shrink-0 text-xs px-3 py-1.5 bg-[hsl(var(--foreground))] text-white rounded-lg">
                        Готово
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcoming.filter(t => !isOverdue(t.dueDate)).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-sm font-medium">Предстоящие</span>
                </div>
                <div className="space-y-2">
                  {upcoming.filter(t => !isOverdue(t.dueDate)).map(task => {
                    const daysLeft = Math.ceil((new Date(task.dueDate!).getTime() - Date.now()) / 86400000);
                    return (
                      <div key={task.id} className="bg-white border border-[hsl(var(--border))] rounded-xl p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-amber-600">{daysLeft}д</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{formatDate(task.dueDate!)}</p>
                        </div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${CATEGORIES[task.category].color}`}>{CATEGORIES[task.category].label}</span>
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

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="animate-fade-in pt-4">
            <h2 className="font-semibold text-base mb-1">Статистика</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Обзор вашей продуктивности</p>

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

        {/* Categories Tab */}
        {activeTab === "categories" && (
          <div className="animate-fade-in pt-4">
            <h2 className="font-semibold text-base mb-1">Категории</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Задачи, сгруппированные по категориям</p>

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
                      <button
                        onClick={() => { setFilterCategory(key); setActiveTab("tasks"); }}
                        className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                      >
                        Все →
                      </button>
                    </div>
                    <div className="space-y-2">
                      {catTasks.slice(0, 3).map(task => (
                        <div key={task.id} className="bg-white border border-[hsl(var(--border))] rounded-xl px-4 py-3 flex items-center gap-3">
                          <button
                            onClick={() => toggleTask(task.id)}
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${task.status === "done" ? "bg-[hsl(var(--foreground))] border-[hsl(var(--foreground))]" : "border-[hsl(var(--border))]"}`}
                          >
                            {task.status === "done" && <Icon name="Check" size={9} className="text-white" />}
                          </button>
                          <p className={`text-sm flex-1 truncate ${task.status === "done" ? "line-through text-[hsl(var(--muted-foreground))]" : ""}`}>{task.title}</p>
                          {task.dueDate && (
                            <span className={`text-[11px] ${isOverdue(task.dueDate) && task.status === "active" ? "text-red-400" : "text-[hsl(var(--muted-foreground))]"}`}>
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                      ))}
                      {catTasks.length > 3 && (
                        <button
                          onClick={() => { setFilterCategory(key); setActiveTab("tasks"); }}
                          className="w-full text-xs text-[hsl(var(--muted-foreground))] py-2 text-center hover:text-[hsl(var(--foreground))] transition-colors"
                        >
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

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="animate-fade-in pt-4">
            <div className="bg-white border border-[hsl(var(--border))] rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--foreground))] flex items-center justify-center">
                  <span className="text-white text-xl font-bold">{userName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  {editingName ? (
                    <div className="flex gap-2">
                      <input
                        className="border border-[hsl(var(--border))] rounded-lg px-3 py-1.5 text-sm flex-1 outline-none focus:border-[hsl(var(--foreground))]"
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { setUserName(nameInput); setEditingName(false); } }}
                        autoFocus
                      />
                      <button
                        onClick={() => { setUserName(nameInput); setEditingName(false); }}
                        className="bg-[hsl(var(--foreground))] text-white text-sm px-3 rounded-lg"
                      >OK</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">{userName}</span>
                      <button onClick={() => { setNameInput(userName); setEditingName(true); }} className="p-1 rounded hover:bg-gray-100">
                        <Icon name="Pencil" size={13} className="text-[hsl(var(--muted-foreground))]" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Всего задач: {tasks.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[hsl(var(--border))] rounded-xl overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-[hsl(var(--border))]">
                <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Настройки</span>
              </div>
              <div className="divide-y divide-[hsl(var(--border))]">
                <div className="px-4 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Напоминания</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Уведомления о сроках</p>
                  </div>
                  <button
                    onClick={() => setNotifications(!notifications)}
                    className={`w-11 h-6 rounded-full transition-all relative ${notifications ? "bg-[hsl(var(--foreground))]" : "bg-gray-200"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifications ? "left-6" : "left-1"}`} />
                  </button>
                </div>
                <div className="px-4 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Синхронизация</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Данные сохраняются локально</p>
                  </div>
                  <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                    <Icon name="Cloud" size={13} />
                    Активна
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[hsl(var(--border))] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[hsl(var(--border))]">
                <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Данные</span>
              </div>
              <div className="divide-y divide-[hsl(var(--border))]">
                {[
                  { label: "Всего задач", value: tasks.length },
                  { label: "Выполнено", value: doneTasks.length },
                  { label: "Активных", value: activeTasks.length },
                  { label: "Просрочено", value: overdueTasks.length },
                ].map(item => (
                  <div key={item.label} className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
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
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
          onClick={e => e.target === e.currentTarget && setShowAddModal(false)}
        >
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
                  <select
                    className="w-full border border-[hsl(var(--border))] rounded-xl px-3 py-2 text-sm outline-none focus:border-[hsl(var(--foreground))] bg-white"
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                  >
                    <option value="high">Высокий</option>
                    <option value="medium">Средний</option>
                    <option value="low">Низкий</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Категория</label>
                  <select
                    className="w-full border border-[hsl(var(--border))] rounded-xl px-3 py-2 text-sm outline-none focus:border-[hsl(var(--foreground))] bg-white"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                  >
                    {(Object.entries(CATEGORIES) as [Category, { label: string; color: string }][]).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Срок выполнения</label>
                <input
                  type="date"
                  className="w-full border border-[hsl(var(--border))] rounded-xl px-3 py-2 text-sm outline-none focus:border-[hsl(var(--foreground))] bg-white"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
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