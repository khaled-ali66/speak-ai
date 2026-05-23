import { createContext, useContext, type ReactNode } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'

export interface AuthUser {
  id: string
  email: string
  firstName?: string
}

interface AuthContextType {
  user: AuthUser | null
  isLoaded: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoaded: false,
  signOut: async () => {},
})

function mapUser(clerkUser: ReturnType<typeof useUser>['user']): AuthUser | null {
  if (!clerkUser) return null
  return {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    firstName:
      clerkUser.firstName ||
      clerkUser.primaryEmailAddress?.emailAddress
        ?.split('@')[0]
        ?.replace(/[^a-zA-Z]/g, '')
        ?.replace(/^./, (c: string) => c.toUpperCase()) ||
      '',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser()
  const { signOut: clerkSignOut } = useClerk()

  const user = isLoaded ? mapUser(clerkUser) : null

  async function signOut() {
    await clerkSignOut()
  }

  return (
    <AuthContext.Provider value={{ user, isLoaded, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
