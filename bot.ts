import { 
  Client, 
  GatewayIntentBits, 
  Events, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ActivityType,
  PresenceUpdateStatus,
  VoiceState,
  TextChannel,
  GuildMember
} from "discord.js";
import { storage } from "./storage";
import { CronJob } from 'cron';

// Definições de tipos
interface MemberStats {
  guildId: string;
  discordId: string;
  username: string;
  avatar: string | null;
  messageCount: number;
  voiceMinutes: number;
  xp: number;
  level: number;
  coins: number;
  badges: string[];
  lastMessageAt: Date;
  lastVoiceAt: Date | null;
  joinDate: Date;
  streak: number;
  lastDaily: Date | null;
  achievements: Achievement[];
  inventory: InventoryItem[];
  voiceSessions?: number;
  messagesInVoice?: number;
  lastWork?: Date;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;}

interface InventoryItem {
  id: string;
  name: string;
  type: 'badge' | 'role' | 'title' | 'background';
  quantity: number;
}

interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'message' | 'voice' | 'invite' | 'daily';
  target: number;
  reward: { coins: number; xp: number; badge?: string };
  current: number;
  completed: boolean;
  expiresAt: Date;
}

interface ServerConfig {
  guildId: string;
  prefix: string;
  welcomeChannel?: string;
  logChannel?: string;
  levelUpMessages: boolean;
  autoRoles: { level: number; roleId: string }[];
  economyEnabled: boolean;
  voiceTrackingEnabled: boolean;
  dailyRewardEnabled: boolean;
  streakBonus: boolean;
}

// Definição do bot client com intents aprimorados
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
  ],
});

// Comandos com funcionalidades avançadas
const commands = [
  // Comandos de estatísticas básicas
  new SlashCommandBuilder()    .setName('stats')
    .setDescription('📊 View detailed server statistics')
    .addStringOption(option => 
      option.setName('period')
        .setDescription('Time period to analyze')
        .addChoices(
          { name: 'Today', value: 'today' },
          { name: 'Week', value: 'week' },
          { name: 'Month', value: 'month' },
          { name: 'All Time', value: 'all' }
        )
    ),
  
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('🏆 View top active members')
    .addStringOption(option => 
      option.setName('type')
        .setDescription('Leaderboard type')
        .addChoices(
          { name: 'Messages', value: 'messages' },
          { name: 'Voice', value: 'voice' },
          { name: 'XP', value: 'xp' },
          { name: 'Coins', value: 'coins' },
          { name: 'Level', value: 'level' }
        )
    )
    .addIntegerOption(option => 
      option.setName('limit')
        .setDescription('Number of members to show (max 25)')
        .setMinValue(1)
        .setMaxValue(25)
    ),

  // Comandos de perfil e progresso
  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('👤 View your detailed profile')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('View another user\'s profile')
    ),

  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('📈 View your rank and progress')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('View another user\'s rank')
    ),
  // Comandos de economia
  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('💰 Check your coin balance')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Check another user\'s balance')
    ),

  new SlashCommandBuilder()
    .setName('daily')
    .setDescription('🎁 Claim your daily reward'),

  new SlashCommandBuilder()
    .setName('work')
    .setDescription('💼 Work to earn coins'),

  // Comandos de badges e achievements
  new SlashCommandBuilder()
    .setName('badges')
    .setDescription('🏅 View your badges and achievements')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('View another user\'s badges')
    ),

  // Comandos de missões
  new SlashCommandBuilder()
    .setName('quests')
    .setDescription('🎯 View available quests and missions')
    .addStringOption(option =>
      option.setName('filter')
        .setDescription('Filter quests by type')
        .addChoices(
          { name: 'Active', value: 'active' },
          { name: 'Completed', value: 'completed' },
          { name: 'All', value: 'all' }
        )
    ),

  // Comandos de voz
  new SlashCommandBuilder()
    .setName('voice-stats')
    .setDescription('🎤 View voice chat statistics')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('View another user\'s voice stats')
    ),
  // Comandos de administração
  new SlashCommandBuilder()
    .setName('config')
    .setDescription('⚙️ Configure server settings (Admin only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set-welcome-channel')
        .setDescription('Set welcome channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel for welcome messages')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set-log-channel')
        .setDescription('Set log channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel for activity logs')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle-level-messages')
        .setDescription('Toggle level up messages')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable level messages')
            .setRequired(true)
        )
    ),

  new SlashCommandBuilder()
    .setName('backup')
    .setDescription('💾 Backup server statistics (Admin only)')
    .addStringOption(option =>
      option.setName('format')
        .setDescription('Backup format')
        .addChoices(
          { name: 'JSON', value: 'json' },
          { name: 'CSV', value: 'csv' }
        )
    ),
];

// Sistema de XP e níveis
const XP_PER_MESSAGE = 10;const XP_PER_MINUTE_VOICE = 5;
const LEVEL_UP_MULTIPLIER = 1.5;

function calculateLevel(xp: number): number {
  return Math.floor(0.1 * Math.sqrt(xp));
}

function calculateXpForLevel(level: number): number {
  return Math.pow(level / 0.1, 2);
}

// Sistema de recompensas por streak
function calculateDailyReward(streak: number): number {
  const baseReward = 100;
  if (streak === 1) return baseReward;
  if (streak <= 7) return baseReward * (1 + (streak - 1) * 0.1);
  if (streak <= 30) return baseReward * (1 + 0.7 + (streak - 7) * 0.05);
  return baseReward * 3; // Maximum bonus
}

// Definições de badges/achievements
const BADGES = {
  'first_message': { name: 'First Steps', description: 'Sent first message', icon: '📝' },
  '10_messages': { name: 'Chatty', description: 'Sent 10 messages', icon: '💬' },
  '100_messages': { name: 'Talkative', description: 'Sent 100 messages', icon: '🗣️' },
  '1000_messages': { name: 'Legend', description: 'Sent 1000 messages', icon: '🏆' },
  'first_voice': { name: 'Voice Starter', description: 'Joined voice chat first time', icon: '🎤' },
  '1_hour_voice': { name: 'Voice Enthusiast', description: 'Spent 1 hour in voice', icon: '🎧' },
  '10_hours_voice': { name: 'Voice Veteran', description: 'Spent 10 hours in voice', icon: '🌟' },
  'level_5': { name: 'Rising Star', description: 'Reached level 5', icon: '⭐' },
  'level_10': { name: 'Established', description: 'Reached level 10', icon: '💫' },
  'level_20': { name: 'Master', description: 'Reached level 20', icon: '👑' },
  'streak_7': { name: 'Consistent', description: '7 day streak', icon: '🔥' },
  'streak_30': { name: 'Dedicated', description: '30 day streak', icon: '💎' },
};

// Sistema de missões diárias
const DAILY_QUESTS: Quest[] = [
  {
    id: 'daily_messages_10',
    name: 'Chatty Day',
    description: 'Send 10 messages today',
    type: 'message',
    target: 10,
    reward: { coins: 50, xp: 100 },
    current: 0,
    completed: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  {    id: 'daily_voice_30min',
    name: 'Voice Time',
    description: 'Spend 30 minutes in voice chat',
    type: 'voice',
    target: 30,
    reward: { coins: 75, xp: 150 },
    current: 0,
    completed: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  {
    id: 'daily_invite_1',
    name: 'Social Butterfly',
    description: 'Invite 1 new member',
    type: 'invite',
    target: 1,
    reward: { coins: 100, xp: 200, badge: 'social_butterfly' },
    current: 0,
    completed: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
];

export async function startBot() {
  if (!process.env.DISCORD_TOKEN) {
    console.warn("⚠️ DISCORD_TOKEN not found. Bot will not start.");
    return;
  }

  try {
    // Login com status personalizado
    await client.login(process.env.DISCORD_TOKEN);
    console.log(`✅ Logged in as ${client.user?.tag} (${client.user?.id})`);

    // Definir status do bot
    client.user?.setPresence({
      activities: [{ name: '/stats | Leveling System', type: ActivityType.Watching }],
      status: PresenceUpdateStatus.Online,
    });

    // Registrar comandos
    if (client.user) {
      console.log('🚀 Bot is online and ready!');
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      try {
        console.log('🔄 Started refreshing application (/) commands...');
        await rest.put(
          Routes.applicationCommands(client.user.id),
          { body: commands.map(cmd => cmd.toJSON()) },
        );        console.log('✅ Successfully reloaded application (/) commands.');
      } catch (error) {
        console.error('❌ Error registering commands:', error);
      }
    }

    // Iniciar jobs cron para tarefas automáticas
    setupCronJobs();

  } catch (error: any) {
    if (error.code === 'DisallowedIntents') {
      console.error("\n🚨 CRITICAL ERROR: PRIVILEGED INTENTS DISABLED\n");
      console.error("You must enable the following intents in Discord Developer Portal:");
      console.error("1. Go to https://discord.com/developers/applications");
      console.error("2. Select your bot");
      console.error("3. Go to 'Bot' section");
      console.error("4. Scroll to 'Privileged Gateway Intents'");
      console.error("5. Enable: Server Members Intent, Message Content Intent, Presence Intent");
      console.error("6. Save Changes\n");
      console.error("Required intents: GuildMembers, MessageContent, GuildPresences\n");
    } else {
      console.error("❌ Failed to start Discord bot:", error);
    }
  }
}

// Configurar jobs cron para tarefas automáticas
function setupCronJobs() {
  // Resetar missões diárias à meia-noite
  new CronJob('0 0 * * *', async () => {
    console.log('🔄 Resetting daily quests...');
    // Lógica para resetar missões diárias
  }, null, true, 'America/Sao_Paulo');

  // Backup automático semanal
  new CronJob('0 2 * * 0', async () => {
    console.log('💾 Creating automatic backup...');
    // Lógica para backup automático
  }, null, true, 'America/Sao_Paulo');

  // Limpar dados antigos mensalmente
  new CronJob('0 3 1 * *', async () => {
    console.log('🧹 Cleaning old data...');
    // Lógica para limpeza de dados
  }, null, true, 'America/Sao_Paulo');
}

// Event Listeners aprimorados
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;  if (!message.guild) return;

  try {
    // Garantir que o membro existe no banco de dados
    let member = await storage.getMember(message.guild.id, message.author.id);
    if (!member) {
      member = await storage.createMember({
        guildId: message.guild.id,
        discordId: message.author.id,
        username: message.author.username,
        avatar: message.author.displayAvatarURL(),
        messageCount: 0,
        voiceMinutes: 0,
        xp: 0,
        level: 0,
        coins: 0,
        badges: [],
        lastMessageAt: new Date(),
        lastVoiceAt: null,
        joinDate: new Date(),
        streak: 0,
        lastDaily: null,
        achievements: [],
        inventory: [],
      });
    }

    // Atualizar estatísticas de mensagem
    const updatedMember = await storage.updateMemberStats(message.guild.id, message.author.id, {
      messageCount: 1,
      xp: XP_PER_MESSAGE,
    });

    // Verificar conquistas de mensagens
    await checkMessageAchievements(message.guild.id, message.author.id, updatedMember.messageCount);

    // Verificar e atualizar streak
    await updateStreak(message.guild.id, message.author.id);

    // Verificar missões diárias
    await checkDailyQuests(message.guild.id, message.author.id, 'message');

    // Verificar level up
    const oldLevel = calculateLevel(member.xp);
    const newLevel = calculateLevel(updatedMember.xp);
    
    if (newLevel > oldLevel) {
      await handleLevelUp(message.guild.id, message.author.id, newLevel, message.channel as TextChannel);
    }
  } catch (err) {
    console.error("❌ Error tracking message:", err);
  }
});

// Tracking de voz
client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
  if (oldState.member?.user.bot) return;
  if (!oldState.guild) return;

  const memberId = oldState.member?.id || newState.member?.id;
  if (!memberId) return;

  try {
    // Entrou em um canal de voz
    if (!oldState.channelId && newState.channelId) {
      await storage.setVoiceStartTime(oldState.guild.id, memberId, new Date());
    }

    // Saiu de um canal de voz
    if (oldState.channelId && !newState.channelId) {
      const startTime = await storage.getVoiceStartTime(oldState.guild.id, memberId);
      if (startTime) {
        const duration = Math.floor((Date.now() - startTime.getTime()) / 60000); // minutos
        if (duration > 0) {
          const member = await storage.updateMemberStats(oldState.guild.id, memberId, {
            voiceMinutes: duration,
            xp: duration * XP_PER_MINUTE_VOICE,
          });

          // Verificar conquistas de voz
          await checkVoiceAchievements(oldState.guild.id, memberId, member.voiceMinutes);

          // Verificar missões diárias de voz
          await checkDailyQuests(oldState.guild.id, memberId, 'voice', duration);
        }
      }
    }

    // Mudou de canal (continua em voz)
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const startTime = await storage.getVoiceStartTime(oldState.guild.id, memberId);
      if (startTime) {
        const duration = Math.floor((Date.now() - startTime.getTime()) / 60000);
        if (duration > 0) {
          await storage.updateMemberStats(oldState.guild.id, memberId, {
            voiceMinutes: duration,
            xp: duration * XP_PER_MINUTE_VOICE,
          });
        }        await storage.setVoiceStartTime(oldState.guild.id, memberId, new Date());
      }
    }

  } catch (err) {
    console.error("❌ Error tracking voice activity:", err);
  }
});

// Verificar e atualizar streak
async function updateStreak(guildId: string, discordId: string) {
  const member = await storage.getMember(guildId, discordId);
  if (!member) return;

  const today = new Date();
  const lastDaily = member.lastDaily ? new Date(member.lastDaily) : null;

  if (!lastDaily) {
    await storage.updateStreak(guildId, discordId, 1, today);
    return;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Verificar se é dia consecutivo
  if (lastDaily.toDateString() === yesterday.toDateString()) {
    await storage.updateStreak(guildId, discordId, member.streak + 1, today);
  } else if (lastDaily.toDateString() !== today.toDateString()) {
    await storage.updateStreak(guildId, discordId, 1, today);
  }
}

// Verificar conquistas de mensagens
async function checkMessageAchievements(guildId: string, discordId: string, messageCount: number) {
  const achievementsToCheck = [
    { count: 1, badge: 'first_message' },
    { count: 10, badge: '10_messages' },
    { count: 100, badge: '100_messages' },
    { count: 1000, badge: '1000_messages' },
  ];

  for (const achievement of achievementsToCheck) {
    if (messageCount >= achievement.count) {
      await storage.unlockBadge(guildId, discordId, achievement.badge);
    }
  }
}

// Verificar conquistas de vozasync function checkVoiceAchievements(guildId: string, discordId: string, voiceMinutes: number) {
  const achievementsToCheck = [
    { minutes: 1, badge: 'first_voice' },
    { minutes: 60, badge: '1_hour_voice' },
    { minutes: 600, badge: '10_hours_voice' },
  ];

  for (const achievement of achievementsToCheck) {
    if (voiceMinutes >= achievement.minutes) {
      await storage.unlockBadge(guildId, discordId, achievement.badge);
    }
  }
}

// Verificar missões diárias
async function checkDailyQuests(guildId: string, discordId: string, type: string, value: number = 1) {
  const quests = await storage.getActiveQuests(guildId, discordId);
  
  for (const quest of quests) {
    if (quest.type === type && !quest.completed) {
      const newProgress = quest.current + value;
      await storage.updateQuestProgress(guildId, discordId, quest.id, newProgress);

      if (newProgress >= quest.target && !quest.completed) {
        await completeQuest(guildId, discordId, quest);
      }
    }
  }
}

// Completar missão
async function completeQuest(guildId: string, discordId: string, quest: Quest) {
  await storage.completeQuest(guildId, discordId, quest.id);

  // Dar recompensas
  await storage.addCoins(guildId, discordId, quest.reward.coins);
  await storage.addXP(guildId, discordId, quest.reward.xp);

  if (quest.reward.badge) {
    await storage.unlockBadge(guildId, discordId, quest.reward.badge);
  }

  // Notificar usuário
  const member = await client.guilds.cache.get(guildId)?.members.fetch(discordId).catch(() => null);
  if (member) {
    await member.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎯 Quest Completed!')
          .setDescription(`**${quest.name}**\n${quest.description}`)          .addFields(
            { name: '🎁 Reward', value: `${quest.reward.coins} coins, ${quest.reward.xp} XP`, inline: true },
            { name: '✅ Progress', value: `${quest.target}/${quest.target}`, inline: true }
          )
          .setColor('#00FF00')
          .setTimestamp()
      ]
    }).catch(() => {});
  }
}

// Handle level up
async function handleLevelUp(guildId: string, discordId: string, newLevel: number, channel: TextChannel) {
  const member = await storage.getMember(guildId, discordId);
  if (!member) return;

  // Dar badge por level
  if (newLevel === 5) await storage.unlockBadge(guildId, discordId, 'level_5');
  if (newLevel === 10) await storage.unlockBadge(guildId, discordId, 'level_10');
  if (newLevel === 20) await storage.unlockBadge(guildId, discordId, 'level_20');

  // Dar recompensa por level up
  const rewardCoins = newLevel * 10;
  await storage.addCoins(guildId, discordId, rewardCoins);

  // Verificar auto-roles
  const config = await storage.getServerConfig(guildId);
  if (config?.autoRoles) {
    const roleConfig = config.autoRoles.find(r => r.level === newLevel);
    if (roleConfig) {
      const guild = client.guilds.cache.get(guildId);
      const guildMember = await guild?.members.fetch(discordId).catch(() => null);
      const role = guild?.roles.cache.get(roleConfig.roleId);
      
      if (guildMember && role) {
        await guildMember.roles.add(role).catch(console.error);
      }
    }
  }

  // Enviar mensagem de level up se habilitado
  if (config?.levelUpMessages) {
    const embed = new EmbedBuilder()
      .setTitle('🎉 Level Up!')
      .setDescription(`**${member.username}** just reached **Level ${newLevel}**!`)
      .addFields(
        { name: '📊 XP', value: `${member.xp}/${calculateXpForLevel(newLevel + 1)}`, inline: true },
        { name: '🎁 Reward', value: `${rewardCoins} coins`, inline: true }
      )
      .setColor('#FFD700')      .setThumbnail(member.avatar || '')
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  }
}

// Interaction Handler aprimorado
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // Comando /stats
  if (interaction.commandName === 'stats') {
    if (!interaction.guildId) {
      await interaction.reply('This command can only be used in a server.');
      return;
    }

    const period = interaction.options.getString('period') || 'all';
    const stats = await storage.getGuildStats(interaction.guildId, period);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Server Statistics - ${period.charAt(0).toUpperCase() + period.slice(1)}`)
      .setDescription(`Detailed statistics for ${interaction.guild?.name}`)
      .addFields(
        { name: '💬 Total Messages', value: stats.totalMessages.toLocaleString(), inline: true },
        { name: '🎤 Total Voice Minutes', value: stats.totalVoiceMinutes.toLocaleString(), inline: true },
        { name: '👥 Active Members', value: stats.activeMembers.toLocaleString(), inline: true },
        { name: '📈 Average Messages/User', value: stats.avgMessagesPerUser.toFixed(2), inline: true },
        { name: '⭐ Top Level', value: stats.topLevel.toString(), inline: true },
        { name: '💰 Total Coins Earned', value: stats.totalCoins.toLocaleString(), inline: true },
      )
      .setColor('#3498db')
      .setThumbnail(interaction.guild?.iconURL() || '')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Comando /leaderboard
  if (interaction.commandName === 'leaderboard') {
    if (!interaction.guildId) {
      await interaction.reply('This command can only be used in a server.');
      return;
    }

    const type = interaction.options.getString('type') || 'messages';
    const limit = interaction.options.getInteger('limit') || 10;
    const topMembers = await storage.getTopMembers(interaction.guildId, limit, type);
    const typeEmojis = {
      messages: '💬',
      voice: '🎤',
      xp: '⭐',
      coins: '💰',
      level: '🏆'
    };

    const leaderboard = topMembers.map((m, i) => {
      const value = type === 'messages' ? m.messageCount :
                   type === 'voice' ? m.voiceMinutes :
                   type === 'xp' ? m.xp :
                   type === 'coins' ? m.coins :
                   m.level;
      return `${i + 1}. **${m.username}**: ${value.toLocaleString()} ${typeEmojis[type as keyof typeof typeEmojis]}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Top ${limit} - ${type.charAt(0).toUpperCase() + type.slice(1)} Leaderboard`)
      .setDescription(leaderboard || 'No activity yet!')
      .setColor('#9b59b6')
      .setFooter({ text: `Requested by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Comando /profile
  if (interaction.commandName === 'profile') {
    if (!interaction.guildId) {
      await interaction.reply('This command can only be used in a server.');
      return;
    }

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = await storage.getMember(interaction.guildId, targetUser.id);

    if (!member) {
      await interaction.reply('No statistics found for this user.');
      return;
    }

    const level = calculateLevel(member.xp);
    const xpForNextLevel = calculateXpForLevel(level + 1);
    const xpProgress = ((member.xp - calculateXpForLevel(level)) / (xpForNextLevel - calculateXpForLevel(level))) * 100;

    const badgesDisplay = member.badges.length > 0 
      ? member.badges.map(b => BADGES[b as keyof typeof BADGES]?.icon || '🏅').join(' ')
      : 'No badges yet';
    const embed = new EmbedBuilder()
      .setTitle(`👤 ${member.username}'s Profile`)
      .setThumbnail(member.avatar || targetUser.displayAvatarURL())
      .addFields(
        { name: '📊 Level', value: level.toString(), inline: true },
        { name: '⭐ XP', value: `${member.xp}/${xpForNextLevel}`, inline: true },
        { name: '💬 Messages', value: member.messageCount.toLocaleString(), inline: true },
        { name: '🎤 Voice Time', value: `${Math.floor(member.voiceMinutes / 60)}h ${member.voiceMinutes % 60}m`, inline: true },
        { name: '💰 Coins', value: member.coins.toLocaleString(), inline: true },
        { name: '🔥 Streak', value: `${member.streak} days`, inline: true },
        { name: '🏅 Badges', value: badgesDisplay, inline: false },
        { name: '📅 Member Since', value: member.joinDate.toLocaleDateString(), inline: true },
        { name: '📈 Progress', value: `[${'█'.repeat(Math.floor(xpProgress / 10))}${'░'.repeat(10 - Math.floor(xpProgress / 10))}] ${xpProgress.toFixed(1)}%`, inline: false },
      )
      .setColor('#2ecc71')
      .setFooter({ text: `User ID: ${targetUser.id}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Comando /rank
  if (interaction.commandName === 'rank') {
    if (!interaction.guildId) {
      await interaction.reply('This command can only be used in a server.');
      return;
    }

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = await storage.getMember(interaction.guildId, targetUser.id);

    if (!member) {
      await interaction.reply('No statistics found for this user.');
      return;
    }

    const level = calculateLevel(member.xp);
    const xpForNextLevel = calculateXpForLevel(level + 1);
    const xpProgress = ((member.xp - calculateXpForLevel(level)) / (xpForNextLevel - calculateXpForLevel(level))) * 100;

    // Obter rankings
    const messageRank = await storage.getMemberRank(interaction.guildId, targetUser.id, 'messages');
    const voiceRank = await storage.getMemberRank(interaction.guildId, targetUser.id, 'voice');
    const levelRank = await storage.getMemberRank(interaction.guildId, targetUser.id, 'level');

    const embed = new EmbedBuilder()
      .setTitle(`📈 ${member.username}'s Rankings`)
      .setThumbnail(member.avatar || targetUser.displayAvatarURL())
      .addFields(
        { name: '💬 Message Rank', value: `#${messageRank}`, inline: true },        { name: '🎤 Voice Rank', value: `#${voiceRank}`, inline: true },
        { name: '🏆 Level Rank', value: `#${levelRank}`, inline: true },
        { name: '⭐ Current Level', value: level.toString(), inline: true },
        { name: '📊 XP Progress', value: `${member.xp}/${xpForNextLevel}`, inline: true },
        { name: '📈 Progress Bar', value: `[${'█'.repeat(Math.floor(xpProgress / 10))}${'░'.repeat(10 - Math.floor(xpProgress / 10))}] ${xpProgress.toFixed(1)}%`, inline: false },
      )
      .setColor('#e74c3c')
      .setFooter({ text: `Overall Rank: #${Math.min(messageRank, voiceRank, levelRank)}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Comando /balance
  if (interaction.commandName === 'balance') {
    if (!interaction.guildId) {
      await interaction.reply('This command can only be used in a server.');
      return;
    }

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = await storage.getMember(interaction.guildId, targetUser.id);

    if (!member) {
      await interaction.reply('No statistics found for this user.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`💰 ${member.username}'s Balance`)
      .setThumbnail(member.avatar || targetUser.displayAvatarURL())
      .addFields(
        { name: '💵 Coins', value: member.coins.toLocaleString(), inline: true },
        { name: '⭐ XP', value: member.xp.toLocaleString(), inline: true },
        { name: '📊 Net Worth', value: (member.coins + member.xp).toLocaleString(), inline: true },
      )
      .setColor('#f1c40f')
      .setFooter({ text: `Level ${calculateLevel(member.xp)}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Comando /daily
  if (interaction.commandName === 'daily') {
    if (!interaction.guildId) {
      await interaction.reply('This command can only be used in a server.');
      return;
    }
    const member = await storage.getMember(interaction.guildId, interaction.user.id);
    if (!member) {
      await interaction.reply('You need to send a message first to register.');
      return;
    }

    const today = new Date();
    const lastDaily = member.lastDaily ? new Date(member.lastDaily) : null;

    if (lastDaily && today.toDateString() === lastDaily.toDateString()) {
      await interaction.reply('You already claimed your daily reward today! Come back tomorrow.');
      return;
    }

    // Calcular recompensa com base no streak
    const reward = calculateDailyReward(member.streak + 1);
    const newStreak = member.streak + 1;

    await storage.addCoins(interaction.guildId, interaction.user.id, reward);
    await storage.updateStreak(interaction.guildId, interaction.user.id, newStreak, today);

    // Dar badge por streak
    if (newStreak === 7) await storage.unlockBadge(interaction.guildId, interaction.user.id, 'streak_7');
    if (newStreak === 30) await storage.unlockBadge(interaction.guildId, interaction.user.id, 'streak_30');

    const embed = new EmbedBuilder()
      .setTitle('🎁 Daily Reward Claimed!')
      .setDescription(`You received **${reward} coins**!`)
      .addFields(
        { name: '🔥 Current Streak', value: `${newStreak} days`, inline: true },
        { name: '💰 Total Balance', value: (member.coins + reward).toLocaleString(), inline: true },
        { name: '⭐ Bonus', value: `${(newStreak > 1 ? (newStreak - 1) * 10 : 0)}% bonus for streak!`, inline: true },
      )
      .setColor('#27ae60')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Comando /work
  if (interaction.commandName === 'work') {
    if (!interaction.guildId) {
      await interaction.reply('This command can only be used in a server.');
      return;
    }

    const member = await storage.getMember(interaction.guildId, interaction.user.id);
    if (!member) {
      await interaction.reply('You need to send a message first to register.');
      return;    }

    // Sistema de cooldown (8 horas)
    const lastWork = member.lastWork || new Date(0);
    const cooldown = 8 * 60 * 60 * 1000; // 8 horas em ms

    if (Date.now() - lastWork.getTime() < cooldown) {
      const remaining = Math.ceil((cooldown - (Date.now() - lastWork.getTime())) / (60 * 60 * 1000));
      await interaction.reply(`You can work again in ${remaining} hour(s).`);
      return;
    }

    // Gerar recompensa aleatória
    const minReward = 50;
    const maxReward = 200;
    const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

    await storage.addCoins(interaction.guildId, interaction.user.id, reward);
    await storage.updateLastWork(interaction.guildId, interaction.user.id, new Date());

    const embed = new EmbedBuilder()
      .setTitle('💼 Work Completed!')
      .setDescription(`You earned **${reward} coins** from your hard work!`)
      .addFields(
        { name: '💰 Total Balance', value: (member.coins + reward).toLocaleString(), inline: true },
        { name: '⏰ Next Work', value: 'In 8 hours', inline: true },
      )
      .setColor('#3498db')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Comando /badges
  if (interaction.commandName === 'badges') {
    if (!interaction.guildId) {
      await interaction.reply('This command can only be used in a server.');
      return;
    }

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = await storage.getMember(interaction.guildId, targetUser.id);

    if (!member) {
      await interaction.reply('No statistics found for this user.');
      return;
    }

    const badgesList = member.badges.map(badgeId => {
      const badge = BADGES[badgeId as keyof typeof BADGES];      return `${badge?.icon || '🏅'} **${badge?.name || badgeId}** - ${badge?.description || 'No description'}`;
    }).join('\n') || 'No badges unlocked yet.';

    const embed = new EmbedBuilder()
      .setTitle(`🏅 ${member.username}'s Badges & Achievements`)
      .setThumbnail(member.avatar || targetUser.displayAvatarURL())
      .setDescription(badgesList)
      .addFields(
        { name: 'Total Badges', value: member.badges.length.toString(), inline: true },
        { name: 'Achievement Rate', value: `${Math.min(100, Math.floor((member.badges.length / Object.keys(BADGES).length) * 100))}%`, inline: true },
      )
      .setColor('#9b59b6')
      .setFooter({ text: `${Object.keys(BADGES).length} total badges available` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Comando /quests
  if (interaction.commandName === 'quests') {
    if (!interaction.guildId) {
      await interaction.reply('This command can only be used in a server.');
      return;
    }

    const filter = interaction.options.getString('filter') || 'active';
    const quests = await storage.getQuests(interaction.guildId, interaction.user.id, filter);

    if (quests.length === 0) {
      await interaction.reply(`No ${filter} quests found.`);
      return;
    }

    const questsList = quests.map(q => {
      const progress = q.completed ? '✅' : `⏳ ${q.current}/${q.target}`;
      const reward = `${q.reward.coins}💰 ${q.reward.xp}⭐${q.reward.badge ? ` ${BADGES[q.reward.badge as keyof typeof BADGES]?.icon || '🏅'}` : ''}`;
      return `${progress} **${q.name}** - ${q.description}\nReward: ${reward}`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle(`🎯 ${filter.charAt(0).toUpperCase() + filter.slice(1)} Quests`)
      .setDescription(questsList)
      .setColor('#e67e22')
      .setFooter({ text: `${quests.length} quests` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Comando /voice-stats  if (interaction.commandName === 'voice-stats') {
    if (!interaction.guildId) {
      await interaction.reply('This command can only be used in a server.');
      return;
    }

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = await storage.getMember(interaction.guildId, targetUser.id);

    if (!member) {
      await interaction.reply('No statistics found for this user.');
      return;
    }

    const hours = Math.floor(member.voiceMinutes / 60);
    const minutes = member.voiceMinutes % 60;
    const avgSession = member.voiceSessions > 0 ? Math.floor(member.voiceMinutes / member.voiceSessions) : 0;

    const embed = new EmbedBuilder()
      .setTitle(`🎤 ${member.username}'s Voice Statistics`)
      .setThumbnail(member.avatar || targetUser.displayAvatarURL())
      .addFields(
        { name: '⏱️ Total Time', value: `${hours}h ${minutes}m`, inline: true },
        { name: '📊 Sessions', value: member.voiceSessions?.toString() || '0', inline: true },
        { name: '🕐 Avg Session', value: `${avgSession}m`, inline: true },
        { name: '💬 Messages While in Voice', value: member.messagesInVoice?.toString() || '0', inline: true },
      )
      .setColor('#9b59b6')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Comando /config (Admin only)
  if (interaction.commandName === 'config') {
    if (!interaction.guildId || !interaction.memberPermissions?.has('Administrator')) {
      await interaction.reply('You need Administrator permissions to use this command.');
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'set-welcome-channel') {
      const channel = interaction.options.getChannel('channel');
      await storage.updateServerConfig(interaction.guildId, { welcomeChannel: channel?.id });
      await interaction.reply(`Welcome channel set to ${channel}`);
    }

    if (subcommand === 'set-log-channel') {
      const channel = interaction.options.getChannel('channel');      await storage.updateServerConfig(interaction.guildId, { logChannel: channel?.id });
      await interaction.reply(`Log channel set to ${channel}`);
    }

    if (subcommand === 'toggle-level-messages') {
      const enabled = interaction.options.getBoolean('enabled');
      await storage.updateServerConfig(interaction.guildId, { levelUpMessages: enabled });
      await interaction.reply(`Level up messages ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  // Comando /backup (Admin only)
  if (interaction.commandName === 'backup') {
    if (!interaction.guildId || !interaction.memberPermissions?.has('Administrator')) {
      await interaction.reply('You need Administrator permissions to use this command.');
      return;
    }

    const format = interaction.options.getString('format') || 'json';
    // Lógica para backup seria implementada aqui
    await interaction.reply(`Backup created in ${format.toUpperCase()} format. (Feature in development)`);
  }
});

console.log('✅ Bot code loaded successfully. Call startBot() to start the bot.');
