import cors from 'cors'
import express, { type Express } from 'express'
import { env } from '../config/env.js'

export const createApp = (): Express => {
  const app = express()

  app.use(
    cors({
      origin: [env.CLIENT_UI_URL, env.CLIENT_A11Y_URL],
      credentials: true,
    }),
  )

  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'wizard-server',
    })
  })

  return app
}
