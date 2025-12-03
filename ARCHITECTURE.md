# Arquitetura do Sistema

## Visão Geral

Sistema web full-stack para migração de emails do Zimbra para Mailcow, com interface de usuário amigável e processamento automatizado.

## Stack Tecnológico

### Frontend
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **NextAuth.js** (autenticação)

### Backend
- **Next.js API Routes**
- **Prisma ORM**
- **SQLite** (desenvolvimento) / **PostgreSQL** (produção recomendado)
- **SSH2** (conexão com servidor Mailcow)
- **tar** (extração de arquivos)

## Fluxo de Dados

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ HTTP/HTTPS
       │
┌──────▼──────────────────────────────────┐
│          Next.js Application             │
│  ┌────────────────────────────────────┐  │
│  │         Frontend (React)           │  │
│  │  - Login/Register                  │  │
│  │  - Dashboard                       │  │
│  │  - Admin Panel                     │  │
│  └────────────┬───────────────────────┘  │
│               │                           │
│  ┌────────────▼───────────────────────┐  │
│  │       API Routes (Backend)        │  │
│  │  - /api/auth (NextAuth)           │  │
│  │  - /api/upload                    │  │
│  │  - /api/jobs                      │  │
│  │  - /api/admin/mailcow-config      │  │
│  └────────────┬───────────────────────┘  │
│               │                           │
│  ┌────────────▼───────────────────────┐  │
│  │      Migration Worker             │  │
│  │  1. Extract TGZ                   │  │
│  │  2. Transfer via SSH/SCP          │  │
│  │  3. Fix permissions (chown/chmod) │  │
│  │  4. Reindex (doveadm)             │  │
│  └────────────┬───────────────────────┘  │
└───────────────┼───────────────────────────┘
                │
       ┌────────┴────────┐
       │                 │
┌──────▼──────┐   ┌─────▼──────┐
│   Database  │   │   Mailcow  │
│   (SQLite/  │   │   Server   │
│  PostgreSQL)│   │   (SSH)    │
└─────────────┘   └────────────┘
```

## Componentes Principais

### 1. Autenticação (NextAuth.js)

```typescript
// lib/auth.ts
- Configuração do NextAuth
- Provider de credenciais
- JWT strategy
- Session management
- Callbacks para dados customizados
```

**Fluxo de autenticação:**
1. Usuário envia email/senha
2. NextAuth valida credenciais no banco
3. Gera JWT token
4. Armazena session no client-side

### 2. Upload de Arquivos

```typescript
// app/api/upload/route.ts
- Recebe arquivo TGZ via FormData
- Valida email e arquivo
- Salva no filesystem
- Cria registro MigrationJob
- Inicia processamento assíncrono
```

**Segurança:**
- Validação de tipo de arquivo (.tgz, .tar.gz)
- Verificação de autenticação
- Isolamento de arquivos por usuário

### 3. Migration Worker

```typescript
// lib/migration-worker.ts
- processMigration(jobId)
  └─> extractTgzFile()
  └─> transferToMailcow()
  └─> fixPermissionsAndReindex()
```

**Etapas:**
1. **Extração**: Usa biblioteca `tar` para extrair TGZ
2. **Transferência**: SSH2 para criar diretórios e transferir via SCP
3. **Permissões**: Executa `chown -R vmail:vmail` e `chmod -R 700`
4. **Reindexação**: Executa `doveadm index -u email@domain "*"`

**Atualizações de progresso:**
- 10%: Iniciando
- 40%: TGZ extraído
- 70%: Arquivos transferidos
- 100%: Concluído

### 4. Banco de Dados

**Schema Prisma:**

```prisma
User
├── id (String, CUID)
├── email (String, unique)
├── password (String, hashed)
├── isAdmin (Boolean)
└── migrationJobs (Relation)

MailcowConfig
├── id (String, CUID)
├── host (String)
├── port (Int)
├── username (String)
├── privateKey (String?, encrypted)
├── password (String?, encrypted)
└── vmailPath (String)

MigrationJob
├── id (String, CUID)
├── userId (String, FK)
├── emailAddress (String)
├── domain (String)
├── status (String: pending|processing|completed|failed)
├── progress (Int: 0-100)
├── errorMessage (String?)
├── fileName (String)
└── filePath (String)
```

### 5. API Routes

#### POST /api/register
- Cria novo usuário
- Hash de senha com bcryptjs
- Retorna sucesso/erro

#### POST /api/auth/[...nextauth]
- Gerenciado pelo NextAuth
- Login/logout/session

#### POST /api/upload
- Upload de arquivo TGZ
- Requer autenticação
- Cria MigrationJob
- Inicia processamento

#### GET /api/jobs
- Lista jobs do usuário logado
- Polling a cada 5s no frontend
- Retorna status e progresso

#### GET /api/admin/mailcow-config
- Requer admin
- Retorna configuração (sem senhas)

#### POST /api/admin/mailcow-config
- Requer admin
- Salva configuração SSH do Mailcow

## Segurança

### Autenticação
- Senhas hasheadas com bcryptjs (12 rounds)
- JWT tokens com NextAuth
- Session server-side

### Autorização
- Middleware de verificação em cada API route
- Separação de permissões user/admin
- Validação de ownership (user só vê seus jobs)

### SSH/Conexão
- Suporte a chave privada SSH (recomendado)
- Fallback para senha
- Conexões efêmeras (abrir/fechar por operação)

### Arquivos
- Upload limitado a tipos específicos
- Armazenamento isolado
- Validação de path traversal

## Performance

### Otimizações
- Build otimizado do Next.js
- Tree-shaking automático
- Code splitting por rota
- Lazy loading de componentes
- Polling inteligente (apenas em jobs ativos)

### Escalabilidade
Para escalar o sistema:

1. **Banco de dados**: Migrar para PostgreSQL
2. **File storage**: Usar S3/MinIO em vez de filesystem
3. **Queue system**: Implementar BullMQ/Redis para fila de jobs
4. **Load balancer**: Nginx/HAProxy para múltiplas instâncias
5. **Caching**: Redis para sessions e cache de queries

## Limitações Atuais

1. **Processamento síncrono**: Jobs processados um por vez
2. **Sem retry automático**: Jobs falhados precisam ser refeitos manualmente
3. **Sem resume**: Upload interrompido precisa recomeçar
4. **Storage local**: Arquivos salvos no filesystem (não distribuído)
5. **Single server**: SSH para apenas um servidor Mailcow

## Melhorias Futuras

### Curto prazo
- [ ] Sistema de fila com BullMQ
- [ ] Retry automático de jobs falhados
- [ ] Notificações por email
- [ ] Dashboard de estatísticas
- [ ] Logs detalhados de migração

### Médio prazo
- [ ] Suporte a múltiplos servidores Mailcow
- [ ] Upload chunked para arquivos grandes
- [ ] Preview de emails antes da migração
- [ ] Migração seletiva (pastas específicas)
- [ ] API REST completa

### Longo prazo
- [ ] Migração incremental
- [ ] Suporte a outros provedores (Gmail, Outlook)
- [ ] Interface CLI
- [ ] Webhooks para integração
- [ ] Monitoramento e alertas integrados

## Desenvolvimento

### Estrutura de pastas
```
app/
├── api/                    # API Routes
├── dashboard/             # User dashboard
├── admin/                 # Admin panel
├── login/                 # Login page
├── register/              # Register page
├── layout.tsx             # Root layout
├── page.tsx               # Home (redirect)
├── providers.tsx          # Session provider
└── globals.css            # Global styles

lib/
├── auth.ts                # NextAuth config
├── prisma.ts              # Prisma client
└── migration-worker.ts    # Migration logic

prisma/
└── schema.prisma          # Database schema

scripts/
└── init-db.ts             # DB initialization
```

### Comandos úteis
```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run start        # Iniciar produção
npm run setup        # Setup inicial do banco
npm run db:push      # Sincronizar schema
npm run db:generate  # Gerar Prisma client
```

## Monitoramento

### Logs
- API routes: Console logs
- Migration worker: Console logs com progresso
- SSH operations: stdout/stderr do SSH2

### Métricas importantes
- Taxa de sucesso de migrações
- Tempo médio de processamento
- Tamanho médio de arquivos
- Erros por tipo
- Usuários ativos

## Testes

### Testes sugeridos
1. **Unit tests**: Funções de extração e validação
2. **Integration tests**: API routes
3. **E2E tests**: Fluxo completo de migração
4. **Load tests**: Múltiplos uploads simultâneos

### Ferramentas recomendadas
- Jest (unit tests)
- Playwright (E2E)
- k6 (load testing)
