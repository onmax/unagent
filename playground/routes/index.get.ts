import { defineEventHandler, setHeader } from 'h3'
import { renderIndexHtml } from '../server/_shared/ui'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/html; charset=utf-8')
  return renderIndexHtml()
})
