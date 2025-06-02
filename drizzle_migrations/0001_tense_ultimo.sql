CREATE TABLE "user_goal" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"goal_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_achieved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email_verified" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "birthday" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "selected_element" varchar(50);--> statement-breakpoint
ALTER TABLE "user_goal" ADD CONSTRAINT "user_goal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;