import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRightIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  HeartbeatIcon,
  LockKeyIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState, type CSSProperties } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { z } from 'zod'
import { Logo } from '../../../components/brand/Logo'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'
import { getApiErrorMessage } from '../../../lib/api'
import { defaultRouteForRole, useAuth } from '../auth-context'
import { login } from '../auth.api'
import { loginSchema } from '../auth.schema'

type LoginForm = z.infer<typeof loginSchema>

/** Contas do seed — só perfis clínicos; admin fica de fora de propósito. */
const CONTAS_DEMO = [
  {
    papel: 'Enfermeiro',
    email: 'ana.ferreira@pad.local',
    rotulo: 'Preencher conta demo de enfermeiro',
  },
  {
    papel: 'Médico',
    email: 'carla.nogueira@pad.local',
    rotulo: 'Preencher conta demo de médico',
  },
] as const

const SENHA_DEMO = 'SenhaDemo@123'

const trustPoints = [
  {
    icon: ShieldCheckIcon,
    title: 'Acesso por perfil',
    text: 'Cada profissional visualiza apenas o necessário para sua atuação.',
  },
  {
    icon: HeartbeatIcon,
    title: 'Fluxo assistencial integrado',
    text: 'Triagem, atendimento e histórico no mesmo ambiente de trabalho.',
  },
  {
    icon: UsersThreeIcon,
    title: 'Cuidado centrado nas pessoas',
    text: 'Informação organizada para apoiar decisões clínicas responsáveis.',
  },
]

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '' },
  })

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      signIn(session)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? defaultRouteForRole(session.usuario.papel), {
        replace: true,
      })
    },
  })

  if (user) return <Navigate to={defaultRouteForRole(user.papel)} replace />

  function preencherContaDemo(email: string) {
    setValue('email', email, { shouldDirty: true, shouldValidate: true })
    setValue('senha', SENHA_DEMO, { shouldDirty: true, shouldValidate: true })
  }

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Sobre o PAD">
        <div className="login-story__glow" aria-hidden="true" />
        <div className="login-story__content">
          {/*
            Decorativa de propósito: a marca já é anunciada pelo cartão de
            acesso, que é o único visível no celular. Dois rótulos iguais na
            mesma página fariam o leitor de tela repetir o nome do produto
            duas vezes seguidas.
          */}
          <Logo className="login-story__logo" variant="full" size={42} />
          <p className="login-story__eyebrow">
            Saúde ocupacional a distância
          </p>
          <h1>Decisões seguras em cada etapa do atendimento.</h1>
          <p className="login-story__lead">
            Uma experiência clara para conduzir o cuidado ocupacional do
            acolhimento ao registro clínico.
          </p>

          <div className="trust-list">
            {trustPoints.map(({ icon: TrustIcon, title, text }, index) => (
              <article
                className="trust-item login-reveal"
                style={{ '--reveal-index': index } as CSSProperties}
                key={title}
              >
                <span className="trust-item__icon" aria-hidden="true">
                  <TrustIcon size={21} weight="duotone" />
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="login-access">
        <div className="login-card">
          <Logo
            className="login-card__logo"
            variant="mark"
            size={40}
            label="PAD — Pronto Atendimento Digital"
          />
          <div className="login-card__heading">
            <p>Pronto Atendimento Digital</p>
            <h2>Bem-vindo ao PAD</h2>
            <span>Entre com suas credenciais profissionais.</span>
          </div>

          <form
            className="login-form"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            <FormField
              label="E-mail profissional"
              type="email"
              autoComplete="email"
              placeholder="nome@empresa.com.br"
              icon={<EnvelopeSimpleIcon size={18} />}
              error={errors.email?.message}
              {...register('email')}
            />
            <FormField
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              icon={<LockKeyIcon size={18} />}
              action={
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? (
                    <EyeSlashIcon size={18} />
                  ) : (
                    <EyeIcon size={18} />
                  )}
                </button>
              }
              error={errors.senha?.message}
              {...register('senha')}
            />

            {mutation.isError ? (
              <Alert tone="error">{getApiErrorMessage(mutation.error)}</Alert>
            ) : null}

            <Button
              type="submit"
              size="lg"
              block
              loading={mutation.isPending}
              trailingIcon={<ArrowRightIcon size={18} weight="bold" />}
            >
              Acessar plataforma
            </Button>
          </form>

          {/* Atalhos do seed: só enfermeiro e médico; admin fica de fora. */}
          <div className="demo-access" aria-label="Atalhos de demonstração">
            <p className="demo-access__label">Demonstração</p>
            <div className="demo-access__actions">
              {CONTAS_DEMO.map(({ papel, email, rotulo }) => (
                <Button
                  key={email}
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-label={rotulo}
                  onClick={() => preencherContaDemo(email)}
                >
                  {papel}
                </Button>
              ))}
            </div>
            <p className="demo-access__hint">
              Preenche e-mail e senha do seed. Confirme em &ldquo;Acessar
              plataforma&rdquo;.
            </p>
          </div>

          <p className="login-card__footer">
            <ShieldCheckIcon size={14} aria-hidden="true" />
            Ambiente protegido. O acesso e as ações são registrados.
          </p>
        </div>
      </section>
    </main>
  )
}
