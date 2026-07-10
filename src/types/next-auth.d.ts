import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      cargo: string
      hospitalId: string
      hospitalNome: string
      avatar: string | null
    } & DefaultSession['user']
  }

  interface User {
    id: string
    cargo: string
    hospitalId: string
    hospitalNome: string
    avatar: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    cargo: string
    hospitalId: string
    hospitalNome: string
    avatar: string | null
  }
}
