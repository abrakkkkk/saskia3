import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./db"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        senha: { label: "Senha", type: "password" },
        hospitalId: { label: "Hospital", type: "text" },
      },
      async authorize(credentials) {
        // 👇 AS TRÊS LINHAS DE TESTE ESTÃO AQUI 👇
        console.log("=== DADOS QUE A TELA ENVIOU ===")
        console.log(credentials)
        console.log("===============================")

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
        } as any
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
        token.id = (user as any).id
        token.cargo = (user as any).cargo
        token.hospitalId = (user as any).hospitalId
        token.hospitalNome = (user as any).hospitalNome
        token.avatar = (user as any).avatar
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).cargo = token.cargo
        ;(session.user as any).hospitalId = token.hospitalId
        ;(session.user as any).hospitalNome = token.hospitalNome
        ;(session.user as any).avatar = token.avatar
      }
      return session
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
})
