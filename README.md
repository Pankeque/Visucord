# Discord Bot - Leveling & Economy System

Um bot Discord com sistema de leveling, economia, conquistas e missões diárias.

## Funcionalidades

### Comandos de Estatísticas
- `/stats` - Ver estatísticas detalhadas do servidor
- `/leaderboard` - Ver ranking de membros por mensagens, voz, XP, moedas ou nível
- `/profile` - Ver perfil detalhado de um usuário
- `/rank` - Ver ranking e progresso de um usuário

### Comandos de Economia
- `/balance` - Ver saldo de moedas
- `/daily` - Resgatar recompensa diária
- `/work` - Trabalhar para ganhar moedas

### Comandos de Conquistas e Missões
- `/badges` - Ver badges e conquistas
- `/quests` - Ver missões diárias disponíveis
- `/voice-stats` - Ver estatísticas de voz

### Comandos de Administração
- `/config` - Configurar configurações do servidor (apenas admin)
- `/backup` - Criar backup de estatísticas (apenas admin)

## Configuração

1. Crie um bot no [Discord Developer Portal](https://discord.com/developers/applications)
2. Copie o token do bot
3. Crie um arquivo `.env` e adicione:
   ```
   DISCORD_TOKEN=seu-token-aqui
   ```

## Instalação

```bash
npm install
```

## Uso

```bash
# Modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Modo produção
npm start
```

## Deploy na Vercel

### Pré-requisitos
1. Conta na [Vercel](https://vercel.com)
2. Repositório Git com o código do bot

### Passos para Deploy

1. **Conecte seu repositório na Vercel:**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "New Project"
   - Importe seu repositório Git

2. **Configure as variáveis de ambiente:**
   - No dashboard do projeto, vá em "Settings" > "Environment Variables"
   - Adicione `DISCORD_TOKEN` com o token do seu bot

3. **Deploy automático:**
   - A Vercel detectará automaticamente as configurações do `vercel.json`
   - O deploy será feito automaticamente a cada push

### Estrutura para Vercel

```
├── api/
│   └── index.ts      # Serverless function para Vercel
├── bot.ts            # Código principal do bot
├── storage.ts        # Sistema de armazenamento
├── vercel.json       # Configuração da Vercel
├── package.json      # Dependências
└── tsconfig.json     # Configuração TypeScript
```

### Health Check

O endpoint principal (`/`) retorna informações sobre o status do bot:

```json
{
  "status": "ok",
  "bot": {
    "started": true,
    "ready": true,
    "user": "BotName#1234",
    "guilds": 5,
    "uptime": 3600
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Cron Jobs

O `vercel.json` inclui um cron job que executa a cada 5 minutos para manter o bot ativo.

## Tecnologias

- Discord.js
- TypeScript
- tsx (para desenvolvimento)
- Vercel (deploy serverless)

## Funcionalidades Principais

### Sistema de Leveling
- Ganhe XP por mensagens e tempo em voz
- Level up com recompensas
- Auto-roles por nível

### Economia
- Moedas que podem ser resgatadas diariamente
- Trabalhe para ganhar moedas
- Streak bonus para recompensas diárias

### Conquistas (Badges)
- Badges por milestones de mensagens
- Badges por tempo em voz
- Badges por level
- Badges por streak diário

### Missões Diárias
- Missões para enviar mensagens
- Missões para tempo em voz
- Missões para convidar membros

### Tracking de Voz
- Rastreamento de tempo em canais de voz
- Estatísticas de sessões de voz

## Observações

- O bot usa armazenamento em memória, então dados são perdidos ao reiniciar
- Para persistência, implemente um banco de dados (MySQL, PostgreSQL, MongoDB)
- Certifique-se de habilitar intents priviligadas no Discord Developer Portal
- Para deploy na Vercel, configure a variável de ambiente `DISCORD_TOKEN`

## Licença

MIT
