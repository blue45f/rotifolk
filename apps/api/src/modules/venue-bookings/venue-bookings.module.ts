import { Module } from '@nestjs/common'

import { VenueBookingsController } from './venue-bookings.controller'
import { VenueBookingsService } from './venue-bookings.service'

@Module({
  controllers: [VenueBookingsController],
  providers: [VenueBookingsService],
  exports: [VenueBookingsService],
})
export class VenueBookingsModule {}
