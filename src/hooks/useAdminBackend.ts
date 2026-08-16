import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getAnalyticsMetrics,
  getCourseStructure,
  getDashboardMetrics,
  getSettings,
  grantCourseAccess,
  listCourses,
  listRawProfiles,
  listUsers,
  revokeUserAccess,
  saveSetting,
  setCoursePublished,
  updateUserAccessStatus,
} from "@/services/adminBackend";
import type { AdminUser } from "@/lib/data";
import type { Json } from "@/lib/supabase/database.types";

const enabled = isSupabaseConfigured;

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: getDashboardMetrics,
    enabled,
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: listUsers,
    enabled,
  });
}

export function useRawProfiles() {
  return useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: listRawProfiles,
    enabled,
  });
}

export function useAdminCourses() {
  return useQuery({
    queryKey: ["admin", "courses"],
    queryFn: listCourses,
    enabled,
  });
}

export function useCourseStructure(courseId: string) {
  return useQuery({
    queryKey: ["admin", "courses", courseId, "structure"],
    queryFn: () => getCourseStructure(courseId),
    enabled: enabled && Boolean(courseId),
  });
}

export function useAnalyticsMetrics() {
  return useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: getAnalyticsMetrics,
    enabled,
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: getSettings,
    enabled,
  });
}

export function useUserStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: AdminUser["status"] }) =>
      updateUserAccessStatus(userId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useGrantAccessMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      courseId,
      days,
    }: {
      userId: string;
      courseId: string;
      days: number | null;
    }) => grantCourseAccess(userId, courseId, days),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useRevokeAccessMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId }: { userId: string }) => revokeUserAccess(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useCoursePublishMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, published }: { courseId: string; published: boolean }) =>
      setCoursePublished(courseId, published),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useSaveSettingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: Json }) => saveSetting(key, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}
