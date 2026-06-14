import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CreateNoteSchema } from '@rotifolk/shared'

import { NotesService } from './notes.service'

import type { CreateNoteDto } from '@rotifolk/shared'

import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'

@Controller('notes')
@UseGuards(AuthGuard('jwt'))
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Post()
  create(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(CreateNoteSchema)) dto: CreateNoteDto
  ) {
    return this.notes.create(me.sub, dto)
  }

  @Get('mine')
  inbox(@CurrentUser() me: JwtUserPayload) {
    return this.notes.inbox(me.sub)
  }

  @Get('party/:partyId')
  forParty(@CurrentUser() me: JwtUserPayload, @Param('partyId') partyId: string) {
    return this.notes.forParty(me.sub, partyId)
  }

  @Patch(':id/read')
  markRead(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    return this.notes.markRead(me.sub, id)
  }

  @Post('party/:partyId/deliver')
  deliver(@CurrentUser() me: JwtUserPayload, @Param('partyId') partyId: string) {
    return this.notes.deliverForParty(me.sub, partyId)
  }
}
