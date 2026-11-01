import { z } from 'zod';
import { AnnouncementSummarySchema } from './announcement.js';
import { EventSummarySchema } from './event.js';
import { AlbumSummarySchema } from './gallery.js';

export const HOME_ANNOUNCEMENT_LIMIT = 5;

export const HOME_EVENT_LIMIT = 3;

export const HOME_ALBUM_LIMIT = 3;

export const HomeResponseSchema = z.object({
  announcements: z.array(AnnouncementSummarySchema).max(HOME_ANNOUNCEMENT_LIMIT),
  upcomingEvents: z.array(EventSummarySchema).max(HOME_EVENT_LIMIT),
  albums: z.array(AlbumSummarySchema).max(HOME_ALBUM_LIMIT),
});

export type HomeResponse = z.infer<typeof HomeResponseSchema>;
