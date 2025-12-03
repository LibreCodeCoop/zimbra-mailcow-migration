# Início Rápido - Migração Zimbra → Mailcow

## Setup em 5 minutos

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
# Gerar chave secreta
openssl rand -base64 32

# Copiar para .env.local
cat > .env.local << EOF
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="cole-a-chave-gerada-aqui"
NEXTAUTH_URL="http://localhost:3000"
UPLOAD_DIR="./uploads"
EOF
```

### 3. Inicializar banco de dados
```bash
npm run setup
```

Este comando cria:
- ✅ Banco de dados SQLite
- ✅ Tabelas do sistema
- ✅ Usuário admin: `admin@example.com` / `admin123`

### 4. Iniciar servidor
```bash
npm run dev
```

Acesse: http://localhost:3000

## Primeiro uso

### 1. Login como Admin
- Email: `admin@example.com`
- Senha: `admin123`

### 2. Configurar Servidor Mailcow
1. Clique em **"Admin"** no menu
2. Preencha os dados do servidor Mailcow:
   - Host: IP ou hostname do servidor
   - Porta SSH: 22
   - Usuário SSH: root (ou outro com permissões)
   - Chave SSH ou Senha
   - Caminho vmail: /var/vmail
3. Clique em **"Salvar Configuração"**

### 3. Criar usuário normal (opcional)
1. Faça logout
2. Clique em **"Registre-se"**
3. Crie uma conta de usuário normal

### 4. Fazer uma migração de teste

#### No servidor Zimbra:
```bash
# Exportar email
zmmailbox -z -m usuario@dominio.com getRestURL "//?fmt=tgz" > backup.tgz
```

#### No sistema web:
1. Faça login
2. Preencha o formulário:
   - **Endereço de Email**: usuario@dominio.com
   - **Arquivo TGZ**: Selecione o backup.tgz
3. Clique em **"Iniciar Migração"**
4. Acompanhe o progresso em tempo real

## Estrutura criada

```
zimbra-mailcow-migration/
├── node_modules/          # Dependências (criado)
├── uploads/              # Uploads dos usuários (criado)
├── prisma/
│   └── dev.db           # Banco de dados (criado)
├── app/                  # Código da aplicação
├── lib/                  # Bibliotecas
├── scripts/             # Scripts de setup
├── .env.local           # Suas configurações (você criou)
└── package.json         # Dependências e scripts
```

## Comandos úteis

```bash
# Desenvolvimento
npm run dev              # Iniciar servidor dev

# Banco de dados
npm run setup            # Setup completo (push + generate + init)
npm run db:push          # Sincronizar schema
npm run db:generate      # Gerar Prisma Client
npm run db:init          # Criar admin

# Produção
npm run build            # Build para produção
npm run start            # Iniciar produção
```

## Próximos passos

1. ✅ **Alterar senha do admin**
   - Login → Admin → (criar endpoint para alterar senha)
   - Ou deletar admin no banco e criar novo

2. ✅ **Testar migração completa**
   - Exporte um email real do Zimbra
   - Faça upload e verifique no Mailcow

3. ✅ **Configurar para produção** (ver DEPLOY.md)
   - Use PostgreSQL em vez de SQLite
   - Configure HTTPS
   - Configure backup automático

## Troubleshooting

### Porta 3000 em uso
```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Ou use outra porta
PORT=3001 npm run dev
```

### Erro no banco de dados
```bash
# Remover e recriar
rm prisma/dev.db
npm run setup
```

### Erro de permissões SSH
- Verifique se o usuário SSH tem acesso ao /var/vmail
- Teste SSH manualmente: `ssh root@servidor-mailcow`
- Verifique as credenciais no painel admin

## Documentação completa

- **README.md** - Documentação principal
- **ARCHITECTURE.md** - Arquitetura do sistema
- **DEPLOY.md** - Guia de deploy em produção

## Suporte

Em caso de problemas:
1. Verifique os logs no terminal
2. Verifique o README.md
3. Verifique se o servidor Mailcow está acessível via SSH
