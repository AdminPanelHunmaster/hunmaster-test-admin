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

export const mockUsers: AdminUser[] = [
  {
    id: "u-01",
    name: "Александр Иванов",
    email: "alex@example.com",
    telegram: "@alexander",
    course: "Hungarian A1",
    status: "active",
    registeredAt: "12.02.2026",
    accessFrom: "12.02.2026",
    accessUntil: "08.09.2026",
    lastLogin: "07.08.2026, 19:42",
    progress: 43,
  },
  {
    id: "u-02",
    name: "Анна Петрова",
    email: "anna.petrova@example.com",
    telegram: "@annapetrova",
    course: "Hungarian A1",
    status: "active",
    registeredAt: "03.03.2026",
    accessFrom: "03.03.2026",
    accessUntil: "01.09.2026",
    lastLogin: "08.08.2026, 09:10",
    progress: 67,
  },
  {
    id: "u-03",
    name: "Mark Kovács",
    email: "mark.kovacs@example.hu",
    telegram: "@markkovacs",
    course: "Hungarian A2",
    status: "expired",
    registeredAt: "18.11.2025",
    accessFrom: "18.11.2025",
    accessUntil: "18.05.2026",
    lastLogin: "14.05.2026, 21:03",
    progress: 88,
  },
  {
    id: "u-04",
    name: "David Nagy",
    email: "david.nagy@example.hu",
    telegram: "@dnagy",
    course: "Разговорный венгерский",
    status: "pending",
    registeredAt: "05.08.2026",
    accessFrom: null,
    accessUntil: null,
    lastLogin: "06.08.2026, 12:55",
    progress: 0,
  },
  {
    id: "u-05",
    name: "София Орлова",
    email: "sofia.orlova@example.com",
    telegram: "@sofiorl",
    course: "Hungarian B1",
    status: "active",
    registeredAt: "22.01.2026",
    accessFrom: "22.01.2026",
    accessUntil: "22.01.2027",
    lastLogin: "08.08.2026, 07:31",
    progress: 51,
  },
  {
    id: "u-06",
    name: "Дмитрий Соколов",
    email: "d.sokolov@example.com",
    telegram: "@dsokolov",
    course: "Hungarian A1",
    status: "blocked",
    registeredAt: "09.12.2025",
    accessFrom: "09.12.2025",
    accessUntil: "09.06.2026",
    lastLogin: "02.06.2026, 16:20",
    progress: 12,
  },
  {
    id: "u-07",
    name: "Eszter Tóth",
    email: "eszter.toth@example.hu",
    telegram: "@esztertoth",
    course: "Hungarian A2",
    status: "active",
    registeredAt: "14.04.2026",
    accessFrom: "14.04.2026",
    accessUntil: "14.10.2026",
    lastLogin: "07.08.2026, 22:14",
    progress: 34,
  },
  {
    id: "u-08",
    name: "Мария Ковальчук",
    email: "maria.k@example.com",
    telegram: "@mariak",
    course: "Разговорный венгерский",
    status: "pending",
    registeredAt: "01.08.2026",
    accessFrom: null,
    accessUntil: null,
    lastLogin: "04.08.2026, 10:02",
    progress: 0,
  },
  {
    id: "u-09",
    name: "Péter Szabó",
    email: "peter.szabo@example.hu",
    telegram: "@pszabo",
    course: "Hungarian B1",
    status: "active",
    registeredAt: "27.02.2026",
    accessFrom: "27.02.2026",
    accessUntil: "27.08.2026",
    lastLogin: "08.08.2026, 08:45",
    progress: 72,
  },
  {
    id: "u-10",
    name: "Ирина Волкова",
    email: "irina.volkova@example.com",
    telegram: "@ivolkova",
    course: "Hungarian A1",
    status: "expired",
    registeredAt: "16.09.2025",
    accessFrom: "16.09.2025",
    accessUntil: "16.03.2026",
    lastLogin: "11.03.2026, 18:39",
    progress: 95,
  },
  {
    id: "u-11",
    name: "Лука Мельник",
    email: "luka.melnyk@example.com",
    telegram: "@lukamel",
    course: "Hungarian A2",
    status: "active",
    registeredAt: "30.05.2026",
    accessFrom: "30.05.2026",
    accessUntil: "30.08.2026",
    lastLogin: "07.08.2026, 13:27",
    progress: 28,
  },
  {
    id: "u-12",
    name: "Zsófia Varga",
    email: "zsofia.varga@example.hu",
    telegram: "@zsofiv",
    course: "Разговорный венгерский",
    status: "active",
    registeredAt: "19.06.2026",
    accessFrom: "19.06.2026",
    accessUntil: "19.12.2026",
    lastLogin: "08.08.2026, 06:12",
    progress: 19,
  },
  {
    id: "u-13",
    name: "Никита Громов",
    email: "n.gromov@example.com",
    telegram: "@ngromov",
    course: "Hungarian A1",
    status: "pending",
    registeredAt: "07.08.2026",
    accessFrom: null,
    accessUntil: null,
    lastLogin: "07.08.2026, 20:55",
    progress: 0,
  },
  {
    id: "u-14",
    name: "Bence Horváth",
    email: "bence.horvath@example.hu",
    telegram: "@bhorvath",
    course: "Hungarian B1",
    status: "blocked",
    registeredAt: "11.10.2025",
    accessFrom: "11.10.2025",
    accessUntil: "11.04.2026",
    lastLogin: "29.03.2026, 11:48",
    progress: 60,
  },
  {
    id: "u-15",
    name: "Елена Ткаченко",
    email: "elena.tk@example.com",
    telegram: "@elenatk",
    course: "Hungarian A2",
    status: "active",
    registeredAt: "08.07.2026",
    accessFrom: "08.07.2026",
    accessUntil: "08.09.2026",
    lastLogin: "08.08.2026, 05:50",
    progress: 41,
  },
];

export const courses = [
  {
    id: "a1",
    title: "Hungarian A1",
    subtitle: "Первые шаги в венгерском",
    published: true,
    modules: 8,
    lessons: 42,
    students: 58,
  },
  {
    id: "a2",
    title: "Hungarian A2",
    subtitle: "Уверенная база",
    published: true,
    modules: 10,
    lessons: 54,
    students: 37,
  },
  {
    id: "b1",
    title: "Hungarian B1",
    subtitle: "Свободнее в речи",
    published: false,
    modules: 12,
    lessons: 61,
    students: 21,
  },
  {
    id: "speak",
    title: "Разговорный венгерский",
    subtitle: "Практика живого языка",
    published: true,
    modules: 6,
    lessons: 28,
    students: 12,
  },
];

export const newUsersSeries = {
  "7": [
    { label: "Пн", value: 4 },
    { label: "Вт", value: 7 },
    { label: "Ср", value: 3 },
    { label: "Чт", value: 9 },
    { label: "Пт", value: 6 },
    { label: "Сб", value: 11 },
    { label: "Вс", value: 8 },
  ],
  "30": Array.from({ length: 30 }, (_, i) => ({
    label: `${i + 1}`,
    value: 3 + Math.round(6 * Math.abs(Math.sin(i / 3.2))) + (i % 5),
  })),
  "90": Array.from({ length: 18 }, (_, i) => ({
    label: `${i * 5 + 1}`,
    value: 12 + Math.round(14 * Math.abs(Math.sin(i / 2.6))) + (i % 4),
  })),
};

export const activeStudentsSeries = [
  { label: "Фев", value: 34 },
  { label: "Мар", value: 41 },
  { label: "Апр", value: 48 },
  { label: "Май", value: 45 },
  { label: "Июн", value: 57 },
  { label: "Июл", value: 64 },
  { label: "Авг", value: 73 },
];

export const activityFeed = [
  { id: 1, text: "Александр зарегистрировался", time: "12 минут назад", kind: "user" },
  { id: 2, text: "Анна получила доступ к A1", time: "48 минут назад", kind: "access" },
  { id: 3, text: "Доступ пользователя Mark истёк", time: "2 часа назад", kind: "expire" },
  { id: 4, text: "Добавлен новый урок «Числа»", time: "5 часов назад", kind: "lesson" },
  { id: 5, text: "София завершила модуль 3", time: "вчера, 21:14", kind: "progress" },
  { id: 6, text: "David Nagy оставил заявку на активацию", time: "вчера, 18:02", kind: "user" },
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

export const notifications = [
  {
    id: "n1",
    title: "Новый пользователь зарегистрирован",
    body: "Никита Громов создал аккаунт и ожидает активации.",
    time: "12 минут назад",
    read: false,
    kind: "user" as const,
  },
  {
    id: "n2",
    title: "Доступ истекает через 3 дня",
    body: "Péter Szabó — Hungarian B1, доступ до 27.08.2026.",
    time: "1 час назад",
    read: false,
    kind: "warning" as const,
  },
  {
    id: "n3",
    title: "Пользователь завершил курс",
    body: "Ирина Волкова завершила Hungarian A1 на 95%.",
    time: "3 часа назад",
    read: false,
    kind: "success" as const,
  },
  {
    id: "n4",
    title: "Новая заявка на активацию",
    body: "Мария Ковальчук запросила доступ к разговорному курсу.",
    time: "вчера, 17:40",
    read: true,
    kind: "access" as const,
  },
  {
    id: "n5",
    title: "Доступ истёк",
    body: "Mark Kovács — Hungarian A2, доступ закончился 18.05.2026.",
    time: "3 дня назад",
    read: true,
    kind: "warning" as const,
  },
];

export const popularLessons = [
  { title: "Приветствие", views: 412 },
  { title: "Числа", views: 366 },
  { title: "В кафе", views: 309 },
  { title: "Покупки", views: 274 },
  { title: "Метро Будапешта", views: 198 },
];

export const retentionSeries = [
  { label: "Нед. 1", value: 100 },
  { label: "Нед. 2", value: 82 },
  { label: "Нед. 3", value: 71 },
  { label: "Нед. 4", value: 63 },
  { label: "Нед. 6", value: 54 },
  { label: "Нед. 8", value: 48 },
];

export const weekdayActivity = [
  { label: "Пн", value: 42 },
  { label: "Вт", value: 55 },
  { label: "Ср", value: 49 },
  { label: "Чт", value: 61 },
  { label: "Пт", value: 58 },
  { label: "Сб", value: 31 },
  { label: "Вс", value: 27 },
];