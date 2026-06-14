import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

import { AllExceptionsFilter } from './all-exceptions.filter'

import type { ArgumentsHost } from '@nestjs/common'
import type { Request, Response } from 'express'
import type { Logger } from 'nestjs-pino'

const makeLogger = () => ({ error: vi.fn() }) as unknown as Logger

const makeHost = (url = '/api/test', method = 'POST') => {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))
  const response = { status } as unknown as Response
  const request = { url, method } as unknown as Request
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost
  return { host, status, json }
}

describe('AllExceptionsFilter', () => {
  it('preserves the existing object envelope (code/message/details) and ADDs statusCode/path/timestamp', () => {
    const logger = makeLogger()
    const filter = new AllExceptionsFilter(logger)
    const { host, status, json } = makeHost('/api/inquiries')

    const exception = new BadRequestException({
      code: 'validation_failed',
      message: 'Invalid request payload',
      details: { fieldErrors: { title: ['required'] } },
    })

    filter.catch(exception, host)

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    const body = json.mock.calls[0][0]
    // Backward-compat: fields the frontend reads stay intact.
    expect(body.code).toBe('validation_failed')
    expect(body.message).toBe('Invalid request payload')
    expect(body.details).toEqual({ fieldErrors: { title: ['required'] } })
    // Added fields.
    expect(body.statusCode).toBe(HttpStatus.BAD_REQUEST)
    expect(body.path).toBe('/api/inquiries')
    expect(typeof body.timestamp).toBe('string')
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('wraps a string HttpException response as { message } with statusCode preserved', () => {
    const logger = makeLogger()
    const filter = new AllExceptionsFilter(logger)
    const { host, status, json } = makeHost()

    filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), host)

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN)
    const body = json.mock.calls[0][0]
    expect(body.message).toBe('Forbidden')
    expect(body.statusCode).toBe(HttpStatus.FORBIDDEN)
  })

  it('maps non-HttpException to 500 with a generic message and logs the error', () => {
    const logger = makeLogger()
    const filter = new AllExceptionsFilter(logger)
    const { host, status, json } = makeHost('/api/boom', 'GET')

    filter.catch(new Error('db exploded'), host)

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    const body = json.mock.calls[0][0]
    expect(body.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(body.message).toBe('Internal server error')
    // Internal details must not leak.
    expect(JSON.stringify(body)).not.toContain('db exploded')
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it('logs 5xx HttpException via the pino logger', () => {
    const logger = makeLogger()
    const filter = new AllExceptionsFilter(logger)
    const { host } = makeHost()

    filter.catch(new HttpException('upstream down', HttpStatus.BAD_GATEWAY), host)

    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})
