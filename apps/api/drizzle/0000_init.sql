CREATE TYPE "public"."audit_actor" AS ENUM('dashboard', 'api_key', 'system', 'anonymous');--> statement-breakpoint
CREATE TYPE "public"."audit_outcome" AS ENUM('success', 'failure');--> statement-breakpoint
CREATE TYPE "public"."audit_severity" AS ENUM('info', 'notice', 'warning', 'error', 'critical');--> statement-breakpoint
CREATE TYPE "public"."view_type" AS ENUM('page', 'raw', 'download');--> statement-breakpoint
CREATE TABLE "admin_recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(64) NOT NULL,
	"password_hash" text NOT NULL,
	"password_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"totp_secret" text,
	"totp_label" varchar(64),
	"totp_confirmed_at" timestamp with time zone,
	"theme" text DEFAULT 'system' NOT NULL,
	"locale" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" varchar(64) NOT NULL,
	"severity" "audit_severity" NOT NULL,
	"outcome" "audit_outcome" NOT NULL,
	"actor" "audit_actor" NOT NULL,
	"target_type" varchar(32),
	"target_id" varchar(128),
	"error_code" varchar(64),
	"request_id" varchar(64),
	"method" varchar(10),
	"path" varchar(512),
	"duration_ms" integer,
	"ip_address" varchar(45),
	"user_agent" varchar(255),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "config" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "link_visits" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "link_visits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"link_slug" varchar(64) NOT NULL,
	"visited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" char(64),
	"user_agent" varchar(255),
	"referer" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "links" (
	"slug" varchar(64) PRIMARY KEY NOT NULL,
	"target_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_views" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "upload_views_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"upload_id" varchar(64) NOT NULL,
	"view_type" "view_type" NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" char(64),
	"user_agent" varchar(255),
	"referer" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"extension" varchar(10) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum_sha256" char(64) NOT NULL,
	"width" integer,
	"height" integer,
	"has_thumbnail" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_recovery_codes" ADD CONSTRAINT "admin_recovery_codes_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_visits" ADD CONSTRAINT "link_visits_link_slug_links_slug_fk" FOREIGN KEY ("link_slug") REFERENCES "public"."links"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_views" ADD CONSTRAINT "upload_views_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_recovery_codes_admin_id_idx" ON "admin_recovery_codes" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs" USING btree ("occurred_at" desc);--> statement-breakpoint
CREATE INDEX "audit_logs_action_occurred_at_idx" ON "audit_logs" USING btree ("action","occurred_at" desc);--> statement-breakpoint
CREATE INDEX "audit_logs_severity_occurred_at_idx" ON "audit_logs" USING btree ("severity","occurred_at" desc);--> statement-breakpoint
CREATE INDEX "audit_logs_outcome_occurred_at_idx" ON "audit_logs" USING btree ("outcome","occurred_at" desc);--> statement-breakpoint
CREATE INDEX "link_visits_link_slug_idx" ON "link_visits" USING btree ("link_slug");--> statement-breakpoint
CREATE INDEX "link_visits_visited_at_idx" ON "link_visits" USING btree ("visited_at");--> statement-breakpoint
CREATE INDEX "links_created_at_idx" ON "links" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "upload_views_upload_id_viewed_at_idx" ON "upload_views" USING btree ("upload_id","viewed_at");--> statement-breakpoint
CREATE INDEX "upload_views_viewed_at_idx" ON "upload_views" USING btree ("viewed_at");--> statement-breakpoint
CREATE INDEX "uploads_created_at_idx" ON "uploads" USING btree ("created_at");