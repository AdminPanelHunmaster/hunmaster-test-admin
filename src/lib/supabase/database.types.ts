export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "student" | "moderator" | "teacher" | "admin" | "owner";
export type AccountStatus = "pending" | "active" | "blocked";
export type CourseStatus = "draft" | "published" | "archived";
export type DifficultyLevel = "beginner" | "elementary" | "intermediate" | "advanced";
export type LessonStatus = "draft" | "published" | "archived";
export type LessonBlockType =
  "text" | "heading" | "image" | "video" | "audio" | "vocabulary" | "exercise" | "quiz";
export type EnrollmentStatus = "active" | "completed" | "revoked" | "expired";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          full_name: string | null;
          telegram: string | null;
          avatar_url: string | null;
          role: AppRole;
          account_status: AccountStatus;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_seen_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          username?: string | null;
          full_name?: string | null;
          telegram?: string | null;
          avatar_url?: string | null;
          role?: AppRole;
          account_status?: AccountStatus;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_seen_at?: string | null;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["profiles"]["Insert"], "id" | "created_at">
        >;
      };
      courses: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          cover_url: string | null;
          status: CourseStatus;
          price: number;
          currency: string;
          difficulty: DifficultyLevel;
          position: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          cover_url?: string | null;
          status?: CourseStatus;
          price?: number;
          currency?: string;
          difficulty?: DifficultyLevel;
          position?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["courses"]["Insert"],
            "id" | "created_by" | "created_at"
          >
        >;
      };
      course_sections: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["course_sections"]["Insert"],
            "id" | "course_id" | "created_at"
          >
        >;
      };
      lessons: {
        Row: {
          id: string;
          course_id: string;
          section_id: string | null;
          title: string;
          slug: string;
          description: string | null;
          content: Json;
          video_url: string | null;
          position: number;
          status: LessonStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          section_id?: string | null;
          title: string;
          slug: string;
          description?: string | null;
          content?: Json;
          video_url?: string | null;
          position?: number;
          status?: LessonStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["lessons"]["Insert"], "id" | "course_id" | "created_at">
        >;
      };
      lesson_blocks: {
        Row: {
          id: string;
          lesson_id: string;
          type: LessonBlockType;
          content: Json;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          type: LessonBlockType;
          content?: Json;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["lesson_blocks"]["Insert"],
            "id" | "lesson_id" | "created_at"
          >
        >;
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          status: EnrollmentStatus;
          granted_by: string | null;
          granted_at: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          status?: EnrollmentStatus;
          granted_by?: string | null;
          granted_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["enrollments"]["Insert"],
            "id" | "user_id" | "course_id" | "created_at"
          >
        >;
      };
      lesson_progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          progress: number;
          completed: boolean;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          progress?: number;
          completed?: boolean;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["lesson_progress"]["Insert"],
            "id" | "user_id" | "lesson_id"
          >
        >;
      };
      admin_audit_log: {
        Row: {
          id: string;
          admin_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: never;
      };
      platform_settings: {
        Row: {
          key: string;
          value: Json;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["platform_settings"]["Insert"]>;
      };
      user_roles: {
        Row: {
          user_id: string;
          role: AppRole;
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role?: AppRole;
          granted_by?: string | null;
          created_at?: string;
        };
        Update: {
          role?: AppRole;
          granted_by?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      admin_grant_course_access: {
        Args: { p_user_id: string; p_course_id: string; p_days: number | null };
        Returns: Database["public"]["Tables"]["enrollments"]["Row"];
      };
      admin_end_user_access: {
        Args: { p_user_id: string; p_status: "revoked" | "expired" };
        Returns: number;
      };
      is_admin: {
        Args: { user_id?: string };
        Returns: boolean;
      };
      current_user_role: {
        Args: { user_id?: string };
        Returns: AppRole;
      };
    };
    Enums: {
      app_role: AppRole;
      account_status: AccountStatus;
      course_status: CourseStatus;
      difficulty_level: DifficultyLevel;
      lesson_status: LessonStatus;
      lesson_block_type: LessonBlockType;
      enrollment_status: EnrollmentStatus;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
export type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"];
export type CourseSection = Database["public"]["Tables"]["course_sections"]["Row"];
export type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
export type LessonBlock = Database["public"]["Tables"]["lesson_blocks"]["Row"];
export type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];
export type AuditLog = Database["public"]["Tables"]["admin_audit_log"]["Row"];
export type PlatformSetting = Database["public"]["Tables"]["platform_settings"]["Row"];
