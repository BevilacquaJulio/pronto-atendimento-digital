import axios, { AxiosError } from 'axios'

export type ApiErrorBody = {
  codigo: string
  mensagem: string
  detalhes?: Array<{ campo: string; erro: string }>
}

let accessToken: string | null = null

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  timeout: 15_000,
})

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

export function setApiAccessToken(token: string | null) {
  accessToken = token
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined
    if (data?.mensagem) return data.mensagem
    if (error.code === 'ECONNABORTED') {
      return 'A conexão demorou mais que o esperado. Tente novamente.'
    }
    if (!error.response) {
      return 'Não foi possível conectar ao serviço. Verifique se a API está disponível.'
    }
  }

  return 'Não foi possível concluir a operação.'
}
