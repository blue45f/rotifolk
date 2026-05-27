import {
  Body,
  Controller,
  Delete,
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
  CreatePartySchema,
  JoinPartySchema,
  PartyQuerySchema,
  UpdatePartySchema,
} from '@rotifolk/shared'
import type {
  CreatePartyDto,
  JoinPartyDto,
  PartyQueryDto,
  UpdatePartyDto,
} from '@rotifolk/shared'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { PartiesService } from './parties.service'

@Controller('parties')
export class PartiesController {
  constructor(private readonly parties: PartiesService) {}

  @Get()
  list(@Query(new ZodValidationPipe(PartyQuerySchema)) q: PartyQueryDto) {
    return this.parties.list(q)
  }

  @Get('mine')
  @UseGuards(AuthGuard('jwt'))
  mine(@CurrentUser() me: JwtUserPayload) {
    return this.parties.myParties(me.sub)
  }

  @Get('hosted')
  @UseGuards(AuthGuard('jwt'))
  hosted(@CurrentUser() me: JwtUserPayload) {
    return this.parties.hostedParties(me.sub)
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.parties.getById(id)
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ZodValidationPipe(CreatePartySchema))
  create(@CurrentUser() me: JwtUserPayload, @Body() dto: CreatePartyDto) {
    return this.parties.create(me.sub, dto)
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePartySchema)) dto: UpdatePartyDto,
  ) {
    return this.parties.update(me.sub, id, dto)
  }

  @Post(':id/join')
  @UseGuards(AuthGuard('jwt'))
  join(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') partyId: string,
    @Body(new ZodValidationPipe(JoinPartySchema.omit({ partyId: true }))) dto: Omit<JoinPartyDto, 'partyId'>,
  ) {
    return this.parties.join(me.sub, partyId, dto.note ?? null)
  }

  @Delete(':id/join')
  @UseGuards(AuthGuard('jwt'))
  cancelJoin(@CurrentUser() me: JwtUserPayload, @Param('id') partyId: string) {
    return this.parties.cancel(me.sub, partyId)
  }

  @Post(':id/check-in/:userId')
  @UseGuards(AuthGuard('jwt'))
  checkIn(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') partyId: string,
    @Param('userId') userId: string,
    @Body() body: { seatNumber?: number },
  ) {
    return this.parties.checkIn(me.sub, partyId, userId, body?.seatNumber)
  }

  @Post(':id/lock')
  @UseGuards(AuthGuard('jwt'))
  lock(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    return this.parties.lock(me.sub, id)
  }

  @Post(':id/start')
  @UseGuards(AuthGuard('jwt'))
  start(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    return this.parties.start(me.sub, id)
  }

  @Post(':id/end')
  @UseGuards(AuthGuard('jwt'))
  end(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    return this.parties.end(me.sub, id)
  }
}
