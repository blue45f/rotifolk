import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import {
  CreateVenueSchema,
  UpdateVenueSchema,
  VenueSearchSchema,
  VenueRecommendQuerySchema,
  VenueAvailabilityQuerySchema,
} from '@rotifolk/shared'
import type {
  CreateVenueDto,
  UpdateVenueDto,
  VenueSearchDto,
  VenueRecommendQueryDto,
  VenueAvailabilityQueryDto,
} from '@rotifolk/shared'
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

  // 정적 세그먼트 라우트는 ':id'보다 먼저 선언해야 한다.
  @Get('recommend')
  recommend(@Query(new ZodValidationPipe(VenueRecommendQuerySchema)) q: VenueRecommendQueryDto) {
    return this.venues.recommend(q)
  }

  @Get('mine')
  @UseGuards(AuthGuard('jwt'))
  mine(@CurrentUser() me: JwtUserPayload) {
    return this.venues.listMine(me.sub)
  }

  @Get('areas')
  areas() {
    return this.venues.listAreas()
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.venues.getById(id)
  }

  @Get(':id/menu')
  menu(@Param('id') id: string) {
    return this.venues.getMenu(id)
  }

  @Get(':id/availability')
  availability(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(VenueAvailabilityQuerySchema)) q: VenueAvailabilityQueryDto,
  ) {
    return this.venues.availability(id, q)
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ZodValidationPipe(CreateVenueSchema))
  create(@CurrentUser() me: JwtUserPayload, @Body() dto: CreateVenueDto) {
    return this.venues.create(me.sub, dto)
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateVenueSchema)) dto: UpdateVenueDto,
  ) {
    return this.venues.update(me.sub, id, dto)
  }
}
