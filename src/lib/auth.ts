import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./db"
import bcrypt from "bcryptjs"

const { handlers, auth: readSession, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        senha: { label: "Senha", type: "password" },
        hospitalId: { label: "Hospital", type: "text" },
      },
      async authorize(credentials) {
        if (
          !credentials?.email ||
          !credentials?.senha ||
          !credentials?.hospitalId
        ) {
          throw new Error("Preencha todos os campos")
        }

        const usuario = await prisma.usuario.findFirst({
          where: {
            email: (credentials.email as string).toLowerCase(),
            hospitalId: credentials.hospitalId as string,
            ativo: true,
          },
          include: { hospital: true },
        })

        if (!usuario) {
          throw new Error("Usuário não encontrado")
        }

        let senhaValida = false

        if (usuario.senha.startsWith("$2")) {
          senhaValida = await bcrypt.compare(
            credentials.senha as string,
            usuario.senha,
          )
        } else {
          senhaValida = (credentials.senha as string) === usuario.senha
        }

        if (!senhaValida) {
          throw new Error("Senha incorreta")
        }

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          cargo: usuario.cargo,
          hospitalId: usuario.hospitalId,
          hospitalNome: usuario.hospital.nome,
          avatar: usuario.avatar,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.cargo = user.cargo as string
        token.hospitalId = user.hospitalId as string
        token.hospitalNome = user.hospitalNome as string
        token.avatar = user.avatar as string | null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.cargo = token.cargo as string
        session.user.hospitalId = token.hospitalId as string
        session.user.hospitalNome = token.hospitalNome as string
        session.user.avatar = token.avatar as string | null
      }
      return session
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
})

export { handlers, signIn, signOut }

export async function auth() {
  const session = await readSession()
  const userId = session?.user?.id
  const hospitalId = session?.user?.hospitalId

  if (!userId || !hospitalId) return null

  const activeUser = await prisma.usuario.findFirst({
    where: {
      id: userId,
      hospitalId,
      ativo: true,
      hospital: { ativo: true },
    },
    select: {
      nome: true,
      email: true,
      cargo: true,
      avatar: true,
      hospital: { select: { nome: true } },
    },
  })

  if (!activeUser) return null

  return {
    ...session,
    user: {
      ...session.user,
      name: activeUser.nome,
      email: activeUser.email,
      cargo: activeUser.cargo,
      hospitalNome: activeUser.hospital.nome,
      avatar: activeUser.avatar,
    },
  }
}
