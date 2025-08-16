import dotenv from 'dotenv'

// Load environment variables first
dotenv.config()

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { testConnection } from './config/database'
import authRoutes from './routes/auth.routes'
import roleRoutes from './routes/role.routes'
import { employeeRoutes } from './routes/employee.routes'
import { timeTrackingRoutes } from './routes/timeTracking.routes'
import taskRoutes from './routes/task.routes'
import notificationRoutes from './routes/notification.routes'
import { systemRoutes } from './routes/system.routes'
import debugRoutes from './routes/debug.routes'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet())
app.use(cors())
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Go3net HR Management System API is running',
    timestamp: new Date().toISOString()
  })
})

app.use('/api/system', systemRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/roles', roleRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/time-tracking', timeTrackingRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/debug', debugRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`)
  // Run DB connectivity test in background so startup is not blocked by transient network issues
  testConnection().catch((err) => {
    console.error('Background DB connectivity check failed:', err?.message || err)
  })
})

export default app