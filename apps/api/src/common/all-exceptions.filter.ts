import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common'
import { Logger } from 'nestjs-pino'

import type { ExceptionFilter } from '@nestjs/common'
import type { Request, Response } from 'express'

/**
 * 전역 예외 필터. 모든 미처리 예외를 일관된 JSON envelope로 직렬화한다.
 *
 * 역호환 보장: 프론트(`infrastructure/api.ts`)는 오류 본문에서 `message`/`code`/
 * `details`를 읽고, HTTP 상태는 `error.response.status`에서 읽는다. 따라서 기존
 * NestJS HttpException 응답의 필드(`message`·`code`·`details`·`error`)를 그대로
 * 보존하고, 그 위에 `statusCode`·`path`·`timestamp`만 ADD 한다. 기존 필드는
 * 절대 제거·변형하지 않는다.
 *
 * 5xx는 pino logger로 error 로깅한다(스택/원인 보존).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    // HttpException이면 getResponse()를 그대로 펼쳐 기존 필드를 보존한다.
    // 문자열 응답이면 { message } 로 감싸고, 객체 응답이면 그 객체를 전개한다.
    // 비-HttpException(예기치 못한 오류)은 내부 사정을 숨긴 일반 메시지로 응답한다.
    const base = this.serializeBody(exception, status)

    // statusCode·path·timestamp만 ADD. 기존 statusCode/message가 있으면 보존된다.
    const body = {
      statusCode: status,
      ...base,
      path: request.url,
      timestamp: new Date().toISOString(),
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        {
          err: exception,
          statusCode: status,
          path: request.url,
          method: request.method,
        },
        'Unhandled exception'
      )
    }

    response.status(status).json(body)
  }

  private serializeBody(exception: unknown, status: number): Record<string, unknown> {
    if (exception instanceof HttpException) {
      const res = exception.getResponse()
      if (typeof res === 'string') {
        return { message: res }
      }
      if (res !== null && typeof res === 'object') {
        // 기존 객체 응답(예: { code, message, details } 또는 { statusCode, message, error })
        // 을 그대로 전개해 프론트가 읽던 message/code/details/error를 보존한다.
        return { ...(res as Record<string, unknown>) }
      }
      return { message: exception.message }
    }
    // 비-HttpException: 내부 오류 상세를 노출하지 않는다.
    return {
      statusCode: status,
      message: 'Internal server error',
    }
  }
}
