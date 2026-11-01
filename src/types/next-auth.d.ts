import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      cargo: string
      hospitalId: string
      hospitalNome: string
      sessionVersion: number
    } & DefaultSession['user']
  }

  interface User {
    cargo: string
    hospitalId: string
    hospitalNome: string
    sessionVersion: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    cargo: string
    hospitalId: string
    hospitalNome: string
    sessionVersion: number
  }
}
