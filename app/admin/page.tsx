'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [config, setConfig] = useState({
    host: '',
    port: '22',
    username: '',
    privateKey: '',
    password: '',
    vmailPath: '/var/vmail',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && !(session?.user as any)?.isAdmin) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.isAdmin) {
      fetchConfig()
    }
  }, [status, session])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/mailcow-config')
      if (response.ok) {
        const data = await response.json()
        setConfig({
          host: data.host || '',
          port: data.port?.toString() || '22',
          username: data.username || '',
          privateKey: '',
          password: '',
          vmailPath: data.vmailPath || '/var/vmail',
        })
      }
    } catch (error) {
      console.error('Error fetching config:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/mailcow-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao salvar configuração')
        return
      }

      setSuccess('Configuração salva com sucesso!')
      setTimeout(() => setSuccess(''), 5000)
    } catch (error) {
      setError('Erro ao salvar configuração')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold">Painel Administrativo</h1>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/admin/users')}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Gerenciar Usuários
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6">Configuração do Servidor Mailcow</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm">
                {success}
              </div>
            )}

            <div>
              <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-1">
                Host do Servidor *
              </label>
              <input
                id="host"
                type="text"
                required
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                placeholder="mail.exemplo.com"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-1">
                Porta SSH *
              </label>
              <input
                id="port"
                type="number"
                required
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: e.target.value })}
                placeholder="22"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Usuário SSH *
              </label>
              <input
                id="username"
                type="text"
                required
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                placeholder="root"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="privateKey" className="block text-sm font-medium text-gray-700 mb-1">
                Chave Privada SSH (opcional)
              </label>
              <textarea
                id="privateKey"
                rows={5}
                value={config.privateKey}
                onChange={(e) => setConfig({ ...config, privateKey: e.target.value })}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Se não fornecer chave privada, use senha abaixo
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Senha SSH (opcional)
              </label>
              <input
                id="password"
                type="password"
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                placeholder="Senha do usuário SSH"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Apenas se não usar chave privada
              </p>
            </div>

            <div>
              <label htmlFor="vmailPath" className="block text-sm font-medium text-gray-700 mb-1">
                Caminho do vmail *
              </label>
              <input
                id="vmailPath"
                type="text"
                required
                value={config.vmailPath}
                onChange={(e) => setConfig({ ...config, vmailPath: e.target.value })}
                placeholder="/var/vmail"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Informações Importantes</h3>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Certifique-se de que o usuário SSH tem permissões para acessar {config.vmailPath}</li>
                <li>Os comandos chown, chmod e doveadm serão executados remotamente</li>
                <li>Use autenticação por chave SSH sempre que possível por segurança</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
