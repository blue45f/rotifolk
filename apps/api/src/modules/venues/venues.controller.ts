import { Body, Controller, Get, Param, Post, Query, UseGuards, UsePipes } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CreateVenueSchema, VenueSearchSchema } from '@rotifolk/shared'
import type { CreateVenueDto, VenueSearchDto } from '@rotifolk/shared'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { VenuesService } from './venues.service'

@Controller('venues')
export class VenuesController {
  constructor(private readonly venues: VenuesService) {}

  @Get()
  list(@Query(new ZodValidationPipe(VenueSearchSchema)) q: VenueSearchDto) {
    return this.venues.list(q)
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.venues.getById(id)
  }

  @Get(':id/menu')
  menu(@Param('id') id: string) {
    return this.venues.getMenu(id)
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ZodValidationPipe(CreateVenueSchema))
  create(@CurrentUser() me: JwtUserPayload, @Body() dto: CreateVenueDto) {
    return this.venues.create(me.sub, dto)
  }
}
