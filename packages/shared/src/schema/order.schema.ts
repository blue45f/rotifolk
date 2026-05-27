import { z } from 'zod'

export const OrderKindEnum = z.enum(['drink', 'snack', 'dessert', 'glassware', 'custom'])

export const OrderItemInputSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().int().min(1).max(20),
  note: z.string().max(120).optional().nullable(),
})

export const CreateOrderSchema = z.object({
  partyId: z.string(),
  items: z.array(OrderItemInputSchema).min(1).max(20),
  note: z.string().max(200).optional().nullable(),
})
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['accepted', 'preparing', 'served', 'cancelled']),
})
export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>
