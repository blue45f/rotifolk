import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common'
import type { ZodSchema } from 'zod'

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _meta: ArgumentMetadata): T {
    const parsed = this.schema.safeParse(value)
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'validation_failed',
        message: 'Invalid request payload',
        details: parsed.error.flatten(),
      })
    }
    return parsed.data
  }
}
