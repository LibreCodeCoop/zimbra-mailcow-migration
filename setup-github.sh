#!/bin/bash

echo "🚀 Setup do Repositório GitHub - Zimbra to Mailcow Migration"
echo ""
echo "Escolha uma opção:"
echo ""
echo "1) Criar pelo navegador (Recomendado)"
echo "2) Criar via API do GitHub (requer token)"
echo ""
read -p "Opção [1]: " option
option=${option:-1}

if [ "$option" == "1" ]; then
    echo ""
    echo "📝 PASSO A PASSO:"
    echo ""
    echo "1. Abra seu navegador e acesse:"
    echo "   https://github.com/new"
    echo ""
    echo "2. Preencha os dados:"
    echo "   - Repository name: zimbra-mailcow-migration"
    echo "   - Description: Sistema web para migração de emails do Zimbra para Mailcow"
    echo "   - Visibilidade: Público ou Privado (sua escolha)"
    echo "   - ❌ NÃO marque 'Add a README file'"
    echo "   - ❌ NÃO marque 'Add .gitignore'"
    echo "   - ❌ NÃO escolha 'Add a license'"
    echo ""
    echo "3. Clique em 'Create repository'"
    echo ""
    read -p "Pressione ENTER quando o repositório estiver criado..."
    echo ""
    read -p "Digite seu username do GitHub: " username
    echo ""
    
    # Adicionar remote
    git remote remove origin 2>/dev/null
    git remote add origin "https://github.com/$username/zimbra-mailcow-migration.git"
    
    echo ""
    echo "🔄 Fazendo push para o GitHub..."
    git branch -M main
    git push -u origin main
    
    echo ""
    echo "✅ Pronto! Seu repositório está no GitHub:"
    echo "   https://github.com/$username/zimbra-mailcow-migration"
    echo ""

elif [ "$option" == "2" ]; then
    echo ""
    echo "📝 Para usar a API do GitHub, você precisa de um token de acesso."
    echo ""
    echo "1. Acesse: https://github.com/settings/tokens/new"
    echo "2. Dê um nome: 'zimbra-mailcow-migration-setup'"
    echo "3. Marque o scope: 'repo' (acesso completo aos repositórios)"
    echo "4. Clique em 'Generate token'"
    echo "5. Copie o token gerado"
    echo ""
    read -p "Cole seu token aqui (ficará oculto): " -s token
    echo ""
    read -p "Digite seu username do GitHub: " username
    echo ""
    
    # Criar repositório via API
    echo "🔨 Criando repositório no GitHub..."
    response=$(curl -s -X POST \
        -H "Authorization: token $token" \
        -H "Accept: application/vnd.github.v3+json" \
        https://api.github.com/user/repos \
        -d "{
            \"name\": \"zimbra-mailcow-migration\",
            \"description\": \"Sistema web para migração de emails do Zimbra para Mailcow com interface amigável e processamento automatizado\",
            \"private\": false
        }")
    
    if echo "$response" | grep -q '"id"'; then
        echo "✅ Repositório criado com sucesso!"
        
        # Adicionar remote e fazer push
        git remote remove origin 2>/dev/null
        git remote add origin "https://github.com/$username/zimbra-mailcow-migration.git"
        
        echo ""
        echo "🔄 Fazendo push para o GitHub..."
        git branch -M main
        
        # Configurar credencial temporária
        git config credential.helper store
        echo "https://$username:$token@github.com" > ~/.git-credentials
        
        git push -u origin main
        
        # Limpar credencial
        rm ~/.git-credentials
        git config --unset credential.helper
        
        echo ""
        echo "✅ Pronto! Seu repositório está no GitHub:"
        echo "   https://github.com/$username/zimbra-mailcow-migration"
    else
        echo "❌ Erro ao criar repositório:"
        echo "$response" | grep -o '"message":"[^"]*"'
        echo ""
        echo "💡 Tente a Opção 1 (criar pelo navegador)"
    fi
    echo ""
else
    echo "Opção inválida!"
    exit 1
fi
