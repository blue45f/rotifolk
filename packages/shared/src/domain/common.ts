export type ID = string

export interface Timestamps {
  createdAt: string
  updatedAt: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
}

export type ISODateString = string
