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

## Tecnologias

- Discord.js
- TypeScript
- tsx (para desenvolvimento)

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

## Licença

MIT
