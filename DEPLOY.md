# Guia de Deploy em Produção

Este documento descreve como fazer o deploy do sistema em produção.

## Opções de Deploy

### 1. Deploy com Docker (Recomendado)

Crie um `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create uploads directory
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

Crie um `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/data/prod.db
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - UPLOAD_DIR=/app/uploads
    volumes:
      - ./data:/data
      - ./uploads:/app/uploads
    restart: unless-stopped

  # Opcional: Use PostgreSQL em vez de SQLite
  # postgres:
  #   image: postgres:16-alpine
  #   environment:
  #     POSTGRES_USER: mailcow_migration
  #     POSTGRES_PASSWORD: ${DB_PASSWORD}
  #     POSTGRES_DB: mailcow_migration
  #   volumes:
  #     - postgres_data:/var/lib/postgresql/data
  #   restart: unless-stopped

# volumes:
#   postgres_data:
```

Para usar PostgreSQL, atualize `.env`:
```env
DATABASE_URL="postgresql://mailcow_migration:password@postgres:5432/mailcow_migration?schema=public"
```

### 2. Deploy em VPS (Ubuntu/Debian)

#### Pré-requisitos
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2

# Instalar Nginx
sudo apt install -y nginx

# Instalar certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

#### Configuração

1. Clone o repositório:
```bash
cd /var/www
sudo git clone <repo-url> zimbra-mailcow-migration
cd zimbra-mailcow-migration
sudo chown -R $USER:$USER .
```

2. Instale dependências:
```bash
npm install
```

3. Configure variáveis de ambiente:
```bash
cp .env .env.local
nano .env.local
```

Configure:
```env
DATABASE_URL="file:/var/www/zimbra-mailcow-migration/prisma/prod.db"
NEXTAUTH_SECRET="sua-chave-secreta-super-segura"
NEXTAUTH_URL="https://seu-dominio.com"
UPLOAD_DIR="/var/www/zimbra-mailcow-migration/uploads"
```

Gere chave secreta:
```bash
openssl rand -base64 32
```

4. Configure o banco de dados:
```bash
npm run setup
```

5. Build da aplicação:
```bash
npm run build
```

6. Configure PM2:
```bash
pm2 start npm --name "mailcow-migration" -- start
pm2 save
pm2 startup
```

7. Configure Nginx:
```bash
sudo nano /etc/nginx/sites-available/mailcow-migration
```

Cole a configuração:
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ative o site:
```bash
sudo ln -s /etc/nginx/sites-available/mailcow-migration /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

8. Configure SSL com Let's Encrypt:
```bash
sudo certbot --nginx -d seu-dominio.com
```

### 3. Deploy no Vercel

**Atenção**: Vercel tem limitações com operações de arquivos e SSH. Considere usar VPS para produção.

1. Instale Vercel CLI:
```bash
npm install -g vercel
```

2. Configure PostgreSQL (necessário):
   - Use Vercel Postgres ou provedor externo (Supabase, Neon, etc)
   - Atualize DATABASE_URL no .env

3. Configure variáveis de ambiente no dashboard do Vercel:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `UPLOAD_DIR` (use storage externo como S3)

4. Deploy:
```bash
vercel --prod
```

## Checklist de Segurança

- [ ] Alterar senha do admin padrão
- [ ] Configurar HTTPS/SSL
- [ ] Usar PostgreSQL em produção (não SQLite)
- [ ] Configurar backups automáticos do banco
- [ ] Restringir acesso SSH ao servidor Mailcow
- [ ] Usar chaves SSH em vez de senhas
- [ ] Configurar firewall (ufw/iptables)
- [ ] Configurar rate limiting no Nginx
- [ ] Monitorar logs de acesso
- [ ] Configurar alertas de erro

## Monitoramento

### Logs com PM2
```bash
pm2 logs mailcow-migration
pm2 monit
```

### Logs do Nginx
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Backup

### Banco de dados
```bash
# SQLite
cp prisma/prod.db prisma/prod.db.backup-$(date +%Y%m%d)

# PostgreSQL
pg_dump -h localhost -U mailcow_migration mailcow_migration > backup-$(date +%Y%m%d).sql
```

### Arquivos de upload
```bash
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/
```

## Atualizações

```bash
cd /var/www/zimbra-mailcow-migration
git pull
npm install
npx prisma migrate deploy  # Se houver migrations
npm run build
pm2 restart mailcow-migration
```

## Troubleshooting

### Aplicação não inicia
```bash
pm2 logs mailcow-migration
# Verifique as variáveis de ambiente
cat .env.local
```

### Erro de conexão com banco
```bash
# Verifique o DATABASE_URL
# Teste a conexão
npx prisma db push
```

### Erro de permissões
```bash
# Verifique permissões dos diretórios
ls -la uploads/
ls -la prisma/
# Ajuste se necessário
chown -R $USER:$USER uploads/
chown -R $USER:$USER prisma/
```

### Erro SSH para Mailcow
- Verifique as credenciais no painel admin
- Teste conexão SSH manualmente:
```bash
ssh usuario@servidor-mailcow
```

## Performance

### Otimizações recomendadas:

1. **Nginx**: Habilitar compressão gzip
2. **Next.js**: Já otimizado no build
3. **Banco**: Use PostgreSQL com índices apropriados
4. **Uploads**: Considere storage externo (S3, MinIO) para arquivos grandes
5. **Cache**: Configure cache HTTP no Nginx

## Contato

Para suporte em produção, verifique os logs e a documentação principal (README.md).
