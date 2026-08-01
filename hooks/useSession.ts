

import { useState, useEffect } from 'react'
import { Session, User }       from '@supabase/supabase-js'
import { supabase }            from '@/lib/supabase'
import { Profile }             from '@/types'

interface SessionState {
  session:  Session | null
  user:     User    | null
  profile:  Profile | null
  loading:  boolean
}

export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (!error && data) setProfile(data)
    } catch {}
  }

  return {
    session,
    user:    session?.user ?? null,
    profile,
    loading,
  }
}