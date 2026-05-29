import { Module } from '@nestjs/common'
import { VenueBookingsService } from './venue-bookings.service'
import { VenueBookingsController } from './venue-bookings.controller'

@Module({
  controllers: [VenueBookingsController],
  providers: [VenueBookingsService],
  exports: [VenueBookingsService],
})
export class VenueBookingsModule {}
