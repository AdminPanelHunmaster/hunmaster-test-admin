// Реальный слой данных проекта.
// Пользовательские данные (users, активность, уведомления, метрики) приходят
// только из backend. Пока backend не подключён — все коллекции пусты, а
// счётчики равны 0. Здесь НЕ должно быть демонстрационных записей.

export type UserStatus = "active" | "pending" | "expired" | "blocked";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  telegram: string;
  course: string;
  status: UserStatus;
  registeredAt: string;
  accessUntil: string | null;
  accessFrom: string | null;
  lastLogin: string;
  progress: number;
};

export const statusLabels: Record<UserStatus, string> = {
  active: "ACTIVE",
  pending: "PENDING",
  expired: "EXPIRED",
  blocked: "BLOCKED",
};

/** Реальные пользователи. Появятся после подключения базы данных. */
export const users: AdminUser[] = [];

export type SeriesPoint = { label: string; value: number };

/** Статический контент платформы (курсы и структура). Не пользовательские данные. */
export const courses = [
  {
    id: "a1",
    title: "Hungarian A1",
    subtitle: "Первые шаги в венгерском",
    published: true,
    modules: 8,
    lessons: 42,
    students: 0,
  },
  {
    id: "a2",
    title: "Hungarian A2",
    subtitle: "Уверенная база",
    published: true,
    modules: 10,
    lessons: 54,
    students: 0,
  },
  {
    id: "b1",
    title: "Hungarian B1",
    subtitle: "Свободнее в речи",
    published: false,
    modules: 12,
    lessons: 61,
    students: 0,
  },
  {
    id: "speak",
    title: "Разговорный венгерский",
    subtitle: "Практика живого языка",
    published: true,
    modules: 6,
    lessons: 28,
    students: 0,
  },
];

export const courseModules = [
  {
    id: "m1",
    title: "Модуль 1 — Основы",
    lessons: [
      { id: "l1", title: "Урок 1 — Приветствие", duration: "12 мин", published: true },
      { id: "l2", title: "Урок 2 — Знакомство", duration: "16 мин", published: true },
      { id: "l3", title: "Урок 3 — Числа", duration: "09 мин", published: false },
    ],
  },
  {
    id: "m2",
    title: "Модуль 2 — Повседневное общение",
    lessons: [
      { id: "l4", title: "Урок 4 — В кафе", duration: "14 мин", published: true },
      { id: "l5", title: "Урок 5 — Покупки", duration: "18 мин", published: true },
      { id: "l6", title: "Урок 6 — Время и даты", duration: "11 мин", published: false },
    ],
  },
  {
    id: "m3",
    title: "Модуль 3 — Город и транспорт",
    lessons: [
      { id: "l7", title: "Урок 7 — Направления", duration: "13 мин", published: true },
      { id: "l8", title: "Урок 8 — Метро Будапешта", duration: "15 мин", published: false },
    ],
  },
];

export const totalLessons = courses.reduce((sum, c) => sum + c.lessons, 0);

/** Аналитика и активность — только из реальных событий. */
export const newUsersSeries: Record<"7" | "30" | "90", SeriesPoint[]> = {
  "7": [],
  "30": [],
  "90": [],
};
export const activeStudentsSeries: SeriesPoint[] = [];
export const retentionSeries: SeriesPoint[] = [];
export const weekdayActivity: SeriesPoint[] = [];
export const popularLessons: { title: string; views: number }[] = [];

export type ActivityItem = { id: string; text: string; time: string; kind: string };
export const activityFeed: ActivityItem[] = [];

export type AdminNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  kind: "user" | "warning" | "success" | "access";
};
export const notifications: AdminNotification[] = [];
