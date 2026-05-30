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
import { CreateOrderSchema, UpdateOrderStatusSchema } from '@rotifolk/shared'
import type { CreateOrderDto, UpdateOrderStatusDto } from '@rotifolk/shared'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { OrdersService } from './orders.service'

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateOrderSchema))
  create(@CurrentUser() me: JwtUserPayload, @Body() dto: CreateOrderDto) {
    return this.orders.create(me.sub, dto)
  }

  @Get('party/:partyId')
  listForHost(@CurrentUser() me: JwtUserPayload, @Param('partyId') partyId: string) {
    return this.orders.listByParty(me.sub, partyId)
  }

  @Get('party/:partyId/mine')
  listMine(@CurrentUser() me: JwtUserPayload, @Param('partyId') partyId: string) {
    return this.orders.listMine(me.sub, partyId)
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateOrderStatusSchema)) dto: UpdateOrderStatusDto,
  ) {
    return this.orders.updateStatus(me.sub, id, dto)
  }

  /** 엔빵 정산 — equal: 1/N 균등, pay-yours: 본인 주문만 합산 */
  @Get('party/:partyId/split')
  splitBill(
    @CurrentUser() me: JwtUserPayload,
    @Param('partyId') partyId: string,
    @Query('mode') mode: 'equal' | 'pay-yours' = 'equal',
  ) {
    return this.orders.splitBill(me.sub, partyId, mode === 'pay-yours' ? 'pay-yours' : 'equal')
  }
}
