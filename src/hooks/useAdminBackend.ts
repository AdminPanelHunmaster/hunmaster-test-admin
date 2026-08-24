import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isAdminRole } from "@/services/permissions";
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

function useAdminQueryScope() {
  const { user, profile, loading } = useAuth();
  const enabled =
    isSupabaseConfigured &&
    !loading &&
    Boolean(user && profile?.is_active && isAdminRole(profile.role));

  return { enabled, adminId: enabled ? user!.id : "signed-out" };
}

export function useDashboardMetrics() {
  const scope = useAdminQueryScope();
  return useQuery({
    queryKey: ["admin", scope.adminId, "dashboard"],
    queryFn: getDashboardMetrics,
    enabled: scope.enabled,
  });
}

export function useAdminUsers() {
  const scope = useAdminQueryScope();
  return useQuery({
    queryKey: ["admin", scope.adminId, "users"],
    queryFn: listUsers,
    enabled: scope.enabled,
    refetchOnWindowFocus: "always",
  });
}

export function useRawProfiles() {
  const scope = useAdminQueryScope();
  return useQuery({
    queryKey: ["admin", scope.adminId, "profiles"],
    queryFn: listRawProfiles,
    enabled: scope.enabled,
  });
}

export function useAdminCourses() {
  const scope = useAdminQueryScope();
  return useQuery({
    queryKey: ["admin", scope.adminId, "courses"],
    queryFn: listCourses,
    enabled: scope.enabled,
    refetchOnWindowFocus: "always",
  });
}

export function useCourseStructure(courseId: string) {
  const scope = useAdminQueryScope();
  return useQuery({
    queryKey: ["admin", scope.adminId, "courses", courseId, "structure"],
    queryFn: () => getCourseStructure(courseId),
    enabled: scope.enabled && Boolean(courseId),
  });
}

export function useAnalyticsMetrics() {
  const scope = useAdminQueryScope();
  return useQuery({
    queryKey: ["admin", scope.adminId, "analytics"],
    queryFn: getAnalyticsMetrics,
    enabled: scope.enabled,
  });
}

export function usePlatformSettings() {
  const scope = useAdminQueryScope();
  return useQuery({
    queryKey: ["admin", scope.adminId, "settings"],
    queryFn: getSettings,
    enabled: scope.enabled,
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
