CREATE TYPE "public"."agent_role" AS ENUM('scout', 'worker', 'coordinator', 'specialist', 'guardian');--> statement-breakpoint
CREATE TYPE "public"."dashboard_task_status" AS ENUM('todo', 'progress', 'done', 'archived');--> statement-breakpoint
CREATE TYPE "public"."embedding_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."memory_origin" AS ENUM('human', 'agent', 'sim');--> statement-breakpoint
CREATE TYPE "public"."memory_tier" AS ENUM('hot', 'warm', 'cold');--> statement-breakpoint
CREATE TYPE "public"."memory_type" AS ENUM('fact', 'decision', 'run_summary', 'artifact', 'pattern', 'tool_trace');--> statement-breakpoint
CREATE TYPE "public"."memory_visibility" AS ENUM('private', 'shared');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('system', 'user', 'assistant', 'tool');--> statement-breakpoint
CREATE TYPE "public"."swarm_phase" AS ENUM('discovery', 'analysis', 'synthesis', 'optimization');--> statement-breakpoint
CREATE TYPE "public"."swarm_status" AS ENUM('queued', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'active', 'completed', 'error', 'retrying');--> statement-breakpoint
CREATE TABLE "agent_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"swarm_run_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"phase" "swarm_phase" NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"tokens_used" integer,
	"leased_at" timestamp with time zone,
	"lease_expires_at" timestamp with time zone,
	"lease_token" uuid,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" "agent_role" DEFAULT 'worker' NOT NULL,
	"system_prompt" text,
	"model" text DEFAULT 'claude-sonnet-4-5-20250929',
	"tools" text[],
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"mime_type" text,
	"storage_path" text,
	"size_bytes" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"service" text NOT NULL,
	"encrypted_key" text,
	"key_version" integer DEFAULT 1,
	"iv" text,
	"config" jsonb,
	"rotated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dashboard_action_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"timestamp" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"expires_at" timestamp with time zone DEFAULT now() + interval '30 days',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dashboard_deliverables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"icon" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dashboard_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dashboard_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"status" "dashboard_task_status" DEFAULT 'todo' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"swarm_run_id" uuid,
	"agent_id" text,
	"agent_name" text,
	"message" text,
	"data" jsonb,
	"expires_at" timestamp with time zone DEFAULT now() + interval '30 days',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"namespace" text NOT NULL,
	"tier" "memory_tier" DEFAULT 'hot' NOT NULL,
	"type" "memory_type" DEFAULT 'fact' NOT NULL,
	"origin" "memory_origin" DEFAULT 'human' NOT NULL,
	"visibility" "memory_visibility" DEFAULT 'private' NOT NULL,
	"score" double precision DEFAULT 1,
	"access_count" integer DEFAULT 0,
	"metadata" jsonb,
	"embedding" vector(1536),
	"embedding_status" "embedding_status" DEFAULT 'pending' NOT NULL,
	"embedding_model" text,
	"content_hash" text,
	"ttl_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_accessed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text,
	"tool_calls" jsonb,
	"reasoning_summary" text,
	"tokens" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "swarm_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "swarm_status" DEFAULT 'queued' NOT NULL,
	"phase" "swarm_phase" DEFAULT 'discovery' NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_swarm_run_id_swarm_runs_id_fk" FOREIGN KEY ("swarm_run_id") REFERENCES "public"."swarm_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_task_id_agent_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agent_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_swarm_run_id_swarm_runs_id_fk" FOREIGN KEY ("swarm_run_id") REFERENCES "public"."swarm_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_task_id_agent_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agent_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_tasks_pending_idx" ON "agent_tasks" USING btree ("status") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "agent_tasks_lease_idx" ON "agent_tasks" USING btree ("lease_expires_at") WHERE status = 'active';--> statement-breakpoint
CREATE INDEX "dashboard_action_log_user_created_idx" ON "dashboard_action_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "dashboard_action_log_expires_idx" ON "dashboard_action_log" USING btree ("expires_at") WHERE expires_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "dashboard_deliverables_user_date_idx" ON "dashboard_deliverables" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "dashboard_notes_user_created_idx" ON "dashboard_notes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "dashboard_tasks_user_status_idx" ON "dashboard_tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "dashboard_tasks_user_position_idx" ON "dashboard_tasks" USING btree ("user_id","position");--> statement-breakpoint
CREATE INDEX "events_user_created_idx" ON "events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "events_expires_idx" ON "events" USING btree ("expires_at") WHERE expires_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "memories_user_namespace_idx" ON "memories" USING btree ("user_id","namespace");--> statement-breakpoint
CREATE INDEX "memories_tier_idx" ON "memories" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "memories_embedding_status_idx" ON "memories" USING btree ("embedding_status");