CREATE TABLE "event_image" (
        "event_id" uuid NOT NULL,
        "image_id" uuid NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        CONSTRAINT "pk_event_image" PRIMARY KEY ("event_id", "image_id"),
        CONSTRAINT "ck_event_image_sort_order" CHECK (sort_order >= 0)
);

ALTER TABLE "event_image" ADD CONSTRAINT "event_image_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "event_image" ADD CONSTRAINT "event_image_image_id_gallery_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "gallery_image"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "idx_event_image_order" ON "event_image" USING btree ("event_id", "sort_order");

CREATE INDEX "idx_event_image_lookup" ON "event_image" USING btree ("image_id");