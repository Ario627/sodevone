import { Injectable } from '@nestjs/common';
import type { HomeResponse } from '@kelas/contracts';
import { HOME_ALBUM_LIMIT, HOME_ANNOUNCEMENT_LIMIT, HOME_EVENT_LIMIT } from '@kelas/contracts';
import { AnnouncementService } from '../announcement/announcement.service.js';
import { EventService } from '../event/event.service.js';
import { AlbumService } from '../gallery/album.service.js';

@Injectable()
export class HomeService {
  constructor(
    private readonly announcements: AnnouncementService,
    private readonly events: EventService,
    private readonly albums: AlbumService,
  ) {}

  async overview(): Promise<HomeResponse> {
    const [announcementPage, eventCollection, albums] = await Promise.all([
      this.announcements.list({
        page: 1,
        perPage: HOME_ANNOUNCEMENT_LIMIT,
        arsip: false,
      }),
      this.events.collection(),
      this.albums.latest(HOME_ALBUM_LIMIT),
    ]);

    return {
      announcements: announcementPage.items,
      upcomingEvents: eventCollection.upcoming.slice(0, HOME_EVENT_LIMIT),
      albums,
    };
  }
}