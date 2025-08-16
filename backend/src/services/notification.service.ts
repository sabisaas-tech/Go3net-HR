import { supabase } from '../config/database'

export interface NotificationTemplate {
  id: string
  name: string
  title: string
  body: string
  type: 'task_assignment' | 'task_status_change' | 'task_comment' | 'check_in_reminder' | 'leave_request' | 'system_announcement'
  variables: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface NotificationSubscription {
  id: string
  userId: string
  endpoint: string
  p256dhKey: string
  authKey: string
  userAgent?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: Record<string, any>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  tag?: string
  requireInteraction?: boolean
}

export interface NotificationLog {
  id: string
  userId: string
  templateId?: string
  title: string
  body: string
  type: string
  payload: NotificationPayload
  status: 'pending' | 'sent' | 'failed' | 'clicked' | 'dismissed'
  sentAt?: Date
  clickedAt?: Date
  dismissedAt?: Date
  errorMessage?: string
  createdAt: Date
}

class NotificationService {
  private vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || ''
  }

  // Subscription Management
  async createSubscription(userId: string, subscription: {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }, userAgent?: string): Promise<NotificationSubscription> {
    const { data, error } = await supabase
      .from('notification_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        user_agent: userAgent,
        is_active: true
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async getSubscriptionsByUserId(userId: string): Promise<NotificationSubscription[]> {
    const { data, error } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    const { error } = await supabase
      .from('notification_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
    
    if (error) throw error
  }

  // Template Management
  async createTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
    const { data, error } = await supabase
      .from('notification_templates')
      .insert({
        name: template.name,
        title: template.title,
        body: template.body,
        type: template.type,
        variables: template.variables,
        is_active: template.isActive
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async getTemplateByType(type: NotificationTemplate['type']): Promise<NotificationTemplate | null> {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "not found"
    return data || null
  }

  async getAllTemplates(): Promise<NotificationTemplate[]> {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('is_active', true)
      .order('type')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  // Notification Sending
  async sendNotification(
    userId: string | string[],
    templateType: NotificationTemplate['type'],
    variables: Record<string, string> = {},
    customPayload?: Partial<NotificationPayload>
  ): Promise<void> {
    const userIds = Array.isArray(userId) ? userId : [userId]
    
    // Get template
    const template = await this.getTemplateByType(templateType)
    if (!template) {
      throw new Error(`No active template found for type: ${templateType}`)
    }

    // Process template variables
    const title = this.processTemplate(template.title, variables)
    const body = this.processTemplate(template.body, variables)

    // Create notification payload
    const payload: NotificationPayload = {
      title,
      body,
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      data: {
        type: templateType,
        timestamp: new Date().toISOString(),
        ...variables
      },
      tag: `${templateType}-${Date.now()}`,
      requireInteraction: templateType === 'task_assignment' || templateType === 'leave_request',
      ...customPayload
    }

    // Send to each user
    for (const uid of userIds) {
      await this.sendToUser(uid, template.id, payload)
    }
  }

  private async sendToUser(userId: string, templateId: string, payload: NotificationPayload): Promise<void> {
    try {
      // Get user subscriptions
      const subscriptions = await this.getSubscriptionsByUserId(userId)
      
      if (subscriptions.length === 0) {
        // Log that user has no subscriptions
        await this.logNotification(userId, templateId, payload, 'failed', 'No active subscriptions')
        return
      }

      // Send to all user's subscriptions
      const sendPromises = subscriptions.map(subscription => 
        this.sendPushNotification(subscription, payload)
      )

      await Promise.allSettled(sendPromises)
      
      // Log successful send
      await this.logNotification(userId, templateId, payload, 'sent')
      
    } catch (error) {
      console.error('Error sending notification to user:', userId, error)
      await this.logNotification(userId, templateId, payload, 'failed', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async sendPushNotification(subscription: NotificationSubscription, payload: NotificationPayload): Promise<void> {
    const webpush = require('web-push')
    
    // Set VAPID details
    webpush.setVapidDetails(
      'mailto:support@go3net.com.ng',
      this.vapidKeys.publicKey,
      this.vapidKeys.privateKey
    )
    
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dhKey,
          auth: subscription.authKey
        }
      }, JSON.stringify(payload))
      
      console.log('Push notification sent successfully')
    } catch (error) {
      console.error('Failed to send push notification:', error)
      throw error
    }
  }

  private processTemplate(template: string, variables: Record<string, string>): string {
    let processed = template
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      processed = processed.replace(regex, value)
    })
    
    return processed
  }

  // Notification Logging
  private async logNotification(
    userId: string,
    templateId: string,
    payload: NotificationPayload,
    status: NotificationLog['status'],
    errorMessage?: string
  ): Promise<NotificationLog> {
    const { data, error } = await supabase
      .from('notification_logs')
      .insert({
        user_id: userId,
        template_id: templateId,
        title: payload.title,
        body: payload.body,
        type: payload.data?.type || 'unknown',
        payload: payload,
        status: status,
        error_message: errorMessage,
        sent_at: status === 'sent' ? new Date().toISOString() : null
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async markNotificationClicked(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notification_logs')
      .update({ 
        status: 'clicked', 
        clicked_at: new Date().toISOString() 
      })
      .eq('id', notificationId)
    
    if (error) throw error
  }

  async markNotificationDismissed(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notification_logs')
      .update({ 
        status: 'dismissed', 
        dismissed_at: new Date().toISOString() 
      })
      .eq('id', notificationId)
    
    if (error) throw error
  }

  // Analytics and Reporting
  async getNotificationStats(userId?: string, days: number = 30): Promise<{
    total: number
    sent: number
    clicked: number
    dismissed: number
    failed: number
    clickRate: number
  }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    let query = supabase
      .from('notification_logs')
      .select('status')
      .gte('created_at', cutoffDate.toISOString())

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      sent: data?.filter(n => n.status === 'sent').length || 0,
      clicked: data?.filter(n => n.status === 'clicked').length || 0,
      dismissed: data?.filter(n => n.status === 'dismissed').length || 0,
      failed: data?.filter(n => n.status === 'failed').length || 0,
      clickRate: 0
    }

    stats.clickRate = stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 10000) / 100 : 0

    return stats
  }

  async getUserNotificationHistory(userId: string, limit: number = 50, offset: number = 0): Promise<NotificationLog[]> {
    const { data, error } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    return data || []
  }

  // Cleanup old notifications
  async cleanupOldNotifications(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const { data, error } = await supabase
      .from('notification_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id')

    if (error) throw error
    return data?.length || 0
  }
}

export const notificationService = new NotificationService()