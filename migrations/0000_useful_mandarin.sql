CREATE TYPE "public"."exchange" AS ENUM('NSE', 'BSE');--> statement-breakpoint
CREATE TYPE "public"."instrument_type" AS ENUM('STOCK', 'INDEX', 'FUTURE', 'OPTIONS');--> statement-breakpoint
CREATE TYPE "public"."option_type" AS ENUM('CE', 'PE');--> statement-breakpoint
CREATE TYPE "public"."position_type" AS ENUM('LONG', 'SHORT');--> statement-breakpoint
CREATE TYPE "public"."trade_type" AS ENUM('ADD', 'UPDATE', 'EXIT');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'participant');--> statement-breakpoint
CREATE TABLE "positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"script" varchar(50) NOT NULL,
	"exchange" "exchange" DEFAULT 'NSE' NOT NULL,
	"instrument_type" "instrument_type" NOT NULL,
	"expiry" date,
	"strike_price" numeric(10, 2),
	"option_type" "option_type",
	"position_type" "position_type" NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"lot_size" integer DEFAULT 1 NOT NULL,
	"entry_price" numeric(15, 2) NOT NULL,
	"average_price" numeric(15, 2),
	"current_price" numeric(15, 2),
	"previous_settled_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"settled_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" "user_role" DEFAULT 'participant' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"position_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"trade_type" "trade_type" NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(15, 2) NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(150) NOT NULL,
	"email" varchar(254),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "positions_user_id_idx" ON "positions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "positions_script_idx" ON "positions" USING btree ("script");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_unique" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trades_position_id_idx" ON "trades" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "trades_user_id_idx" ON "trades" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trades_created_at_idx" ON "trades" USING btree ("created_at");