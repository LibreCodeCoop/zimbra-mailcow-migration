# Sistema de Migração Zimbra → Mailcow

Sistema web desenvolvido em Next.js para facilitar a migração de emails do Zimbra para o Mailcow, permitindo que cada usuário importe manualmente sua caixa de email.

## Funcionalidades

- ✅ Autenticação de usuários com NextAuth
- ✅ Gerenciamento de usuários pelo administrador
- ✅ Interface para upload de arquivos TGZ do Zimbra
- ✅ Processamento automático dos arquivos
- ✅ Transferência via SSH para o servidor Mailcow
- ✅ Execução automática de comandos (chown, chmod, doveadm)
- ✅ Painel administrativo para configurar o servidor Mailcow
- ✅ Acompanhamento em tempo real do progresso da migração
- ✅ Sistema de jobs para gerenciar múltiplas migrações

## Requisitos

- Node.js 18+
- Servidor Mailcow configurado
- Acesso SSH ao servidor Mailcow (preferencialmente com chave SSH)

## Instalação

1. Clone o repositório:
```bash
git clone <repo-url>
cd zimbra-mailcow-migration
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env .env.local
```

Edite o arquivo `.env.local` e configure:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="sua-chave-secreta-aleatoria-aqui"
NEXTAUTH_URL="http://localhost:3000"
UPLOAD_DIR="./uploads"
```

Gere uma chave secreta com:
```bash
openssl rand -base64 32
```

4. Configure o banco de dados:
```bash
npm run setup
```

Este comando irá:
- Criar as tabelas no banco de dados SQLite
- Gerar o cliente Prisma
- Criar um usuário admin padrão (admin@example.com / admin123)

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O sistema estará disponível em `http://localhost:3000`

## Primeiro Acesso

1. Acesse `http://localhost:3000`
2. Faça login com as credenciais admin:
   - Email: `admin@example.com`
   - Senha: `admin123`

3. **IMPORTANTE**: Configure o sistema antes de permitir migrações:
   - Configure o servidor Mailcow no painel administrativo
   - Cadastre os usuários que poderão fazer migrações

## Configuração do Mailcow (Admin)

Como administrador, você precisa configurar a conexão com o servidor Mailcow:

1. Clique em "Admin" no menu superior, depois em "Configurações"
2. Preencha os dados do servidor:
   - **Host do Servidor**: IP ou hostname do servidor Mailcow
   - **Porta SSH**: Normalmente 22
   - **Usuário SSH**: Usuário com permissões (ex: root)
   - **Chave Privada SSH**: Cole sua chave privada SSH (recomendado)
   - **Senha SSH**: Ou use senha (menos seguro)
   - **Caminho do vmail**: Normalmente `/var/vmail`

3. Clique em "Salvar Configuração"

## Gerenciamento de Usuários (Admin)

**IMPORTANTE**: Apenas administradores podem cadastrar novos usuários. Não há registro público.

Os usuários cadastrados devem ter os **mesmos endereços de email** que estão configurados no Mailcow. Isso é essencial para que a migração funcione corretamente.

### Cadastrar Novo Usuário

1. Clique em "Admin" no menu superior, depois em "Gerenciar Usuários"
2. Clique no botão "Novo Usuário"
3. Preencha os dados:
   - **Email**: Use o mesmo email que existe no Mailcow (ex: `usuario@exemplo.com`)
   - **Senha**: Senha para acesso ao sistema de migração (mínimo 6 caracteres)
   - **Confirmar Senha**: Repita a senha
   - **Administrador**: Marque se o usuário também será admin

4. Clique em "Criar Usuário"

### Remover Usuário

1. Na lista de usuários, clique em "Remover" ao lado do usuário desejado
2. Confirme a remoção

**Nota**: Não é possível remover sua própria conta de administrador.

## Como Usar (Usuário)

### 1. Exportar do Zimbra

Primeiro, exporte sua caixa de email do Zimbra:

```bash
zmmailbox -z -m usuario@exemplo.com getRestURL "//?fmt=tgz" > backup.tgz
```

### 2. Fazer Upload

1. Faça login no sistema
2. Na página principal, preencha:
   - **Endereço de Email**: Seu email completo (ex: usuario@exemplo.com)
   - **Arquivo TGZ**: Selecione o arquivo backup.tgz exportado do Zimbra

3. Clique em "Iniciar Migração"

### 3. Acompanhar Progresso

O sistema mostrará o progresso da migração em tempo real:
- **Pendente**: Aguardando processamento
- **Processando**: Migração em andamento (mostra barra de progresso)
- **Concluído**: Migração finalizada com sucesso
- **Falhou**: Erro durante a migração (veja a mensagem de erro)

## Processo Técnico

O sistema executa automaticamente os seguintes passos:

1. **Upload**: Arquivo TGZ é enviado e armazenado no servidor
2. **Extração**: Arquivo TGZ é extraído em arquivos EML individuais
3. **Transferência**: Arquivos são transferidos via SSH/SCP para o Mailcow
4. **Permissões**: Comando executado: `chown -R vmail:vmail /var/vmail/<dominio>/<usuario>/`
5. **Permissões**: Comando executado: `chmod -R 700 /var/vmail/<dominio>/<usuario>/`
6. **Reindexação**: Comando executado: `doveadm index -u usuario@exemplo.com "*"`

## Estrutura do Projeto

```
zimbra-mailcow-migration/
├── app/
│   ├── api/                 # API Routes
│   │   ├── auth/           # Autenticação NextAuth
│   │   ├── upload/         # Upload de arquivos
│   │   ├── jobs/           # Listagem de jobs
│   │   ├── register/       # Registro (desabilitado)
│   │   └── admin/          # Rotas administrativas
│   │       ├── mailcow-config/ # Config do Mailcow
│   │       └── users/      # Gerenciamento de usuários
│   ├── dashboard/          # Dashboard do usuário
│   ├── admin/              # Painel administrativo
│   │   └── users/          # Gerenciamento de usuários
│   ├── login/              # Página de login
│   └── register/           # Redireciona para login
├── lib/
│   ├── auth.ts             # Configuração NextAuth
│   ├── prisma.ts           # Cliente Prisma
│   └── migration-worker.ts # Lógica de migração
├── prisma/
│   └── schema.prisma       # Schema do banco de dados
└── scripts/
    └── init-db.ts          # Script de inicialização
```

## Banco de Dados

O sistema usa SQLite por padrão (pode ser alterado no schema.prisma para PostgreSQL, MySQL, etc).

Modelos principais:
- **User**: Usuários do sistema
- **MailcowConfig**: Configuração do servidor Mailcow
- **MigrationJob**: Jobs de migração

## Produção

Para deploy em produção:

1. Configure variáveis de ambiente adequadas
2. Use um banco de dados mais robusto (PostgreSQL recomendado)
3. Configure HTTPS
4. Altere a senha do admin
5. Configure backup automático do banco de dados

Build para produção:
```bash
npm run build
npm run start
```

## Segurança

- Senhas são hasheadas com bcryptjs
- Autenticação via JWT (NextAuth)
- Apenas admins podem cadastrar usuários (registro público desabilitado)
- Acesso SSH via chave privada (recomendado)
- Validação de permissões em todas as rotas
- Arquivos de upload isolados por usuário
- Usuários devem ter os mesmos emails do Mailcow

## Limitações

- Migração síncrona (uma por vez por usuário)
- Não suporta migração incremental
- Requer acesso SSH ao servidor Mailcow
- Arquivos grandes podem demorar

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs da aplicação
2. Verifique os logs do servidor Mailcow
3. Confirme que as credenciais SSH estão corretas
4. Verifique as permissões no servidor Mailcow

## Licença

MIT
