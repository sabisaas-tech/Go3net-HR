import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
    const { method } = req

    if (method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        })
    }

    try {
        const { action, token, userId, newPassword } = await req.json()

        switch (action) {
            case 'verify_email':
                return await verifyEmail(token)

            case 'verify_reset_token':
                return await verifyResetToken(token)

            case 'reset_password':
                return await resetPassword(token, newPassword)

            default:
                throw new Error('Invalid action')
        }

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
        })
    }
})

async function verifyEmail(token: string) {
    const { data: verificationRecord, error: fetchError } = await supabase
        .from('email_verification_tokens')
        .select('user_id, expires_at, is_used')
        .eq('verification_token', token)
        .single()

    if (fetchError || !verificationRecord) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Invalid verification token'
        }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        })
    }

    if (verificationRecord.is_used) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Verification token already used'
        }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        })
    }

    if (new Date(verificationRecord.expires_at) < new Date()) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Verification token expired'
        }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        })
    }

    const { error: updateUserError } = await supabase
        .from('users')
        .update({
            email_verified: true,
            email_verified_at: new Date().toISOString(),
            account_status: 'active',
            status: 'active'
        })
        .eq('id', verificationRecord.user_id)

    if (updateUserError) {
        throw new Error('Failed to verify email')
    }

    const { error: updateTokenError } = await supabase
        .from('email_verification_tokens')
        .update({ is_used: true })
        .eq('verification_token', token)

    if (updateTokenError) {
        throw new Error('Failed to update token')
    }

    return new Response(JSON.stringify({
        success: true,
        message: 'Email verified successfully'
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    })
}

async function verifyResetToken(token: string) {
    const { data: resetRecord, error } = await supabase
        .from('password_reset_tokens')
        .select('user_id, expires_at, is_used')
        .eq('reset_token', token)
        .single()

    if (error || !resetRecord) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Invalid reset token'
        }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        })
    }

    if (resetRecord.is_used || new Date(resetRecord.expires_at) < new Date()) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Reset token expired or already used'
        }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        })
    }

    return new Response(JSON.stringify({
        success: true,
        message: 'Reset token is valid',
        userId: resetRecord.user_id
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    })
}

async function resetPassword(token: string, newPassword: string) {
    const { data: resetRecord, error } = await supabase
        .from('password_reset_tokens')
        .select('user_id, expires_at, is_used')
        .eq('reset_token', token)
        .single()

    if (error || !resetRecord || resetRecord.is_used || new Date(resetRecord.expires_at) < new Date()) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Invalid or expired reset token'
        }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        })
    }

    return new Response(JSON.stringify({
        success: true,
        message: 'Token verified, password can be reset',
        userId: resetRecord.user_id,
        token: token
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    })
}