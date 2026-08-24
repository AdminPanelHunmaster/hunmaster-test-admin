// Реальный слой данных проекта.
// Пользовательские данные (users, активность, уведомления, метрики) приходят
// только из backend. Пока backend не подключён — все коллекции пусты, а
// счётчики равны 0. Здесь НЕ должно быть демонстрационных записей.

export type UserStatus = "active" | "pending" | "expired" | "blocked";

export type AdminUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  telegram: string;
  role: string;
  accountStatus: "pending" | "active" | "blocked";
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

export type SeriesPoint = { label: string; value: number };

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
