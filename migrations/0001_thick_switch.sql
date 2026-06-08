ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'participant' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text NOT NULL;