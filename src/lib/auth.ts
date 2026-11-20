import NextAuth, { CredentialsSignin } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./db"
import { compararSenha } from "./password"
import { normalizarCodigoUnidade } from "./codigo-unidade"
import { conferirSegundoFator, exigeMfa } from "./mfa"
import { limparFalhas, registrarFalha, tentativasExcedidas } from "./rate-limit"

const LIMITE_POR_CONTA = 8
const LIMITE_POR_IP = 40

// Só depois da senha correta: avisa a tela que falta o código do app autenticador.
class MfaNecessario extends CredentialsSignin { code = "mfa" }
class MfaInvalido extends CredentialsSignin { code = "mfa_invalido" }

const { handlers, auth: readSession, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        senha: { label: "Senha", type: "password" },
        codigo: { label: "Código da unidade", type: "text" },
        // Mantido por compatibilidade com scripts de teste; a tela de login usa só o código.
        hospitalId: { label: "Hospital", type: "text" },
        otp: { label: "Código de verificação", type: "text" },
      },
      async authorize(credentials, request) {
        const { email, senha, hospitalId, codigo, otp } = credentials ?? {}
        const codigoUnidade = normalizarCodigoUnidade(codigo)
        const idHospital = typeof hospitalId === "string" && hospitalId.length <= 64 ? hospitalId : ""
        if (
          typeof email !== "string" || !email || email.length > 254 ||
          typeof senha !== "string" || !senha || senha.length > 256 ||
          (!codigoUnidade && !idHospital)
        ) {
          return null
        }

        const emailNormalizado = email.trim().toLowerCase()
        const ip = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido"
        const chaveConta = `conta:${emailNormalizado}`
        const chaveIp = `ip:${ip}`
        if (
          await tentativasExcedidas(chaveConta, LIMITE_POR_CONTA) ||
          await tentativasExcedidas(chaveIp, LIMITE_POR_IP)
        ) {
          return null
        }

        const usuario = await prisma.usuario.findFirst({
          where: {
            email: emailNormalizado,
            ativo: true,
            ...(codigoUnidade
              ? { hospital: { codigo: codigoUnidade, ativo: true } }
              : { hospitalId: idHospital, hospital: { ativo: true } }),
          },
          include: { hospital: { select: { nome: true } } },
        })

        // Compara mesmo sem usuário, para o tempo de resposta não revelar quem existe.
        const senhaValida = await compararSenha(senha, usuario?.senha)
        if (!usuario || !senhaValida) {
          await registrarFalha(chaveConta)
          await registrarFalha(chaveIp)
          return null
        }

        if (usuario.mfaAtivo) {
          const informado = typeof otp === "string" ? otp.trim().slice(0, 32) : ""
          if (!informado) throw new MfaNecessario()
          const aceito = conferirSegundoFator(usuario, informado)
          // Grava condicionado ao estado lido: duas tentativas simultâneas não gastam o mesmo código.
          const gravado = aceito && await prisma.usuario.updateMany({
            where: "mfaUltimoPasso" in aceito
              ? { id: usuario.id, mfaUltimoPasso: usuario.mfaUltimoPasso }
              : { id: usuario.id, mfaCodigosBackup: { equals: usuario.mfaCodigosBackup } },
            data: aceito,
          })
          if (!gravado || gravado.count !== 1) {
            await registrarFalha(chaveConta)
            await registrarFalha(chaveIp)
            throw new MfaInvalido()
          }
        }

        await limparFalhas(chaveConta)
        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          cargo: usuario.cargo,
          hospitalId: usuario.hospitalId,
          hospitalNome: usuario.hospital.nome,
          sessionVersion: usuario.sessionVersion,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.cargo = user.cargo
        token.hospitalId = user.hospitalId
        token.hospitalNome = user.hospitalNome
        token.sessionVersion = user.sessionVersion
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.cargo = token.cargo as string
        session.user.hospitalId = token.hospitalId as string
        session.user.hospitalNome = token.hospitalNome as string
        session.user.sessionVersion = token.sessionVersion as number
      }
      return session
    },
  },
  events: {
    async signOut(message) {
      if (!('token' in message)) return

      const token = message.token
      if (!token) return
      const { id, hospitalId, sessionVersion } = token
      if (typeof id !== 'string' || typeof hospitalId !== 'string' || typeof sessionVersion !== 'number') return

      try {
        // JWTs não podem ser revogados individualmente. Ao sair, invalida a versão
        // atual para que um cookie copiado deixe de autenticar imediatamente.
        await prisma.usuario.updateMany({
          where: { id, hospitalId, sessionVersion },
          data: { sessionVersion: { increment: 1 } },
        })
      } catch (error) {
        console.error('Falha ao invalidar sessão no logout:', error instanceof Error ? error.name : 'erro')
      }
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
      sessionVersion: true,
      mfaAtivo: true,
      hospital: { select: { nome: true } },
    },
  })

  // sessionVersion sobe ao trocar a senha ou desativar: derruba sessões antigas.
  if (!activeUser || activeUser.sessionVersion !== (session.user.sessionVersion ?? 0)) return null

  return {
    ...session,
    user: {
      ...session.user,
      name: activeUser.nome,
      email: activeUser.email,
      cargo: activeUser.cargo,
      hospitalNome: activeUser.hospital.nome,
      // ADMIN sem verificação em duas etapas só acessa a tela de configurá-la.
      mfaPendente: exigeMfa(activeUser.cargo) && !activeUser.mfaAtivo,
    },
  }
}
