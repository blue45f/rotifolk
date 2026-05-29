import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import {
  CreateVenueBookingSchema,
  LinkBookingPartySchema,
  OwnerDecisionSchema,
} from '@rotifolk/shared'
import type { CreateVenueBookingDto, LinkBookingPartyDto, OwnerDecisionDto } from '@rotifolk/shared'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { VenueBookingsService } from './venue-bookings.service'

@Controller('venue-bookings')
@UseGuards(AuthGuard('jwt'))
export class VenueBookingsController {
  constructor(private readonly bookings: VenueBookingsService) {}

  @Post()
  create(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(CreateVenueBookingSchema)) dto: CreateVenueBookingDto,
  ) {
    return this.bookings.create(me.sub, dto)
  }

  @Get('mine')
  mine(@CurrentUser() me: JwtUserPayload, @Query('role') role?: string) {
    return this.bookings.mine(me.sub, role === 'owner' ? 'owner' : 'requester')
  }

  @Get(':id')
  getOne(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    return this.bookings.getOne(me.sub, id)
  }

  @Patch(':id/confirm')
  confirm(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(OwnerDecisionSchema)) dto: OwnerDecisionDto,
  ) {
    return this.bookings.decide(me.sub, id, 'confirmed', dto.message)
  }

  @Patch(':id/decline')
  decline(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(OwnerDecisionSchema)) dto: OwnerDecisionDto,
  ) {
    return this.bookings.decide(me.sub, id, 'declined', dto.message)
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    return this.bookings.cancel(me.sub, id)
  }

  @Patch(':id/link')
  link(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(LinkBookingPartySchema)) dto: LinkBookingPartyDto,
  ) {
    return this.bookings.link(me.sub, id, dto.partyId)
  }
}
