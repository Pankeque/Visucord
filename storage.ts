import { MemberStats, ServerConfig, Quest } from './bot';

// Simple in-memory storage implementation
class Storage {
  private members: Map<string, MemberStats> = new Map();
  private serverConfigs: Map<string, ServerConfig> = new Map();
  private quests: Map<string, Quest[]> = new Map();
  private voiceStartTimes: Map<string, Date> = new Map();

  // Member methods
  async getMember(guildId: string, discordId: string): Promise<MemberStats | undefined> {
    const key = `${guildId}:${discordId}`;
    return this.members.get(key);
  }

  async createMember(member: MemberStats): Promise<MemberStats> {
    const key = `${member.guildId}:${member.discordId}`;
    this.members.set(key, member);
    return member;
  }

  async updateMemberStats(guildId: string, discordId: string, updates: Partial<MemberStats>): Promise<MemberStats> {
    const key = `${guildId}:${discordId}`;
    const member = this.members.get(key);
    if (!member) {
      throw new Error('Member not found');
    }
    const updated = { ...member, ...updates };
    this.members.set(key, updated);
    return updated;
  }

  async updateStreak(guildId: string, discordId: string, streak: number, lastDaily: Date): Promise<void> {
    const key = `${guildId}:${discordId}`;
    const member = this.members.get(key);
    if (member) {
      member.streak = streak;
      member.lastDaily = lastDaily;
      this.members.set(key, member);
    }
  }

  async addCoins(guildId: string, discordId: string, amount: number): Promise<void> {
    const key = `${guildId}:${discordId}`;
    const member = this.members.get(key);
    if (member) {
      member.coins += amount;
      this.members.set(key, member);
    }
  }

  async addXP(guildId: string, discordId: string, amount: number): Promise<void> {
    const key = `${guildId}:${discordId}`;
    const member = this.members.get(key);
    if (member) {
      member.xp += amount;
      this.members.set(key, member);
    }
  }

  async unlockBadge(guildId: string, discordId: string, badgeId: string): Promise<void> {
    const key = `${guildId}:${discordId}`;
    const member = this.members.get(key);
    if (member && !member.badges.includes(badgeId)) {
      member.badges.push(badgeId);
      this.members.set(key, member);
    }
  }

  async updateLastWork(guildId: string, discordId: string, lastWork: Date): Promise<void> {
    const key = `${guildId}:${discordId}`;
    const member = this.members.get(key);
    if (member) {
      member.lastWork = lastWork;
      this.members.set(key, member);
    }
  }

  // Server config methods
  async getServerConfig(guildId: string): Promise<ServerConfig | undefined> {
    return this.serverConfigs.get(guildId);
  }

  async updateServerConfig(guildId: string, updates: Partial<ServerConfig>): Promise<void> {
    let config = this.serverConfigs.get(guildId);
    if (!config) {
      config = {
        guildId,
        prefix: '!',
        levelUpMessages: true,
        autoRoles: [],
        economyEnabled: true,
        voiceTrackingEnabled: true,
        dailyRewardEnabled: true,
        streakBonus: true,
      };
    }
    config = { ...config, ...updates };
    this.serverConfigs.set(guildId, config);
  }

  // Quest methods
  async getActiveQuests(guildId: string, discordId: string): Promise<Quest[]> {
    const key = `${guildId}:${discordId}`;
    return this.quests.get(key) || [];
  }

  async getQuests(guildId: string, discordId: string, filter: string): Promise<Quest[]> {
    const key = `${guildId}:${discordId}`;
    let quests = this.quests.get(key) || [];
    if (filter === 'active') {
      quests = quests.filter(q => !q.completed);
    } else if (filter === 'completed') {
      quests = quests.filter(q => q.completed);
    }
    return quests;
  }

  async updateQuestProgress(guildId: string, discordId: string, questId: string, progress: number): Promise<void> {
    const key = `${guildId}:${discordId}`;
    const quests = this.quests.get(key) || [];
    const questIndex = quests.findIndex(q => q.id === questId);
    if (questIndex !== -1) {
      quests[questIndex].current = progress;
      this.quests.set(key, quests);
    }
  }

  async completeQuest(guildId: string, discordId: string, questId: string): Promise<void> {
    const key = `${guildId}:${discordId}`;
    const quests = this.quests.get(key) || [];
    const questIndex = quests.findIndex(q => q.id === questId);
    if (questIndex !== -1) {
      quests[questIndex].completed = true;
      this.quests.set(key, quests);
    }
  }

  // Voice tracking methods
  async setVoiceStartTime(guildId: string, discordId: string, startTime: Date): Promise<void> {
    const key = `${guildId}:${discordId}`;
    this.voiceStartTimes.set(key, startTime);
  }

  async getVoiceStartTime(guildId: string, discordId: string): Promise<Date | null> {
    const key = `${guildId}:${discordId}`;
    return this.voiceStartTimes.get(key) || null;
  }

  // Stats methods
  async getGuildStats(guildId: string, period: string): Promise<any> {
    const guildMembers = Array.from(this.members.values()).filter(m => m.guildId === guildId);
    return {
      totalMessages: guildMembers.reduce((sum, m) => sum + m.messageCount, 0),
      totalVoiceMinutes: guildMembers.reduce((sum, m) => sum + m.voiceMinutes, 0),
      activeMembers: guildMembers.length,
      avgMessagesPerUser: guildMembers.length > 0 
        ? guildMembers.reduce((sum, m) => sum + m.messageCount, 0) / guildMembers.length 
        : 0,
      topLevel: guildMembers.length > 0 
        ? Math.max(...guildMembers.map(m => m.level)) 
        : 0,
      totalCoins: guildMembers.reduce((sum, m) => sum + m.coins, 0),
    };
  }

  async getTopMembers(guildId: string, limit: number, type: string): Promise<MemberStats[]> {
    const guildMembers = Array.from(this.members.values()).filter(m => m.guildId === guildId);
    return guildMembers
      .sort((a, b) => {
        if (type === 'messages') return b.messageCount - a.messageCount;
        if (type === 'voice') return b.voiceMinutes - a.voiceMinutes;
        if (type === 'xp') return b.xp - a.xp;
        if (type === 'coins') return b.coins - a.coins;
        if (type === 'level') return b.level - a.level;
        return 0;
      })
      .slice(0, limit);
  }

  async getMemberRank(guildId: string, discordId: string, type: string): Promise<number> {
    const guildMembers = Array.from(this.members.values()).filter(m => m.guildId === guildId);
    const sorted = guildMembers.sort((a, b) => {
      if (type === 'messages') return b.messageCount - a.messageCount;
      if (type === 'voice') return b.voiceMinutes - a.voiceMinutes;
      if (type === 'level') return b.level - a.level;
      return 0;
    });
    const index = sorted.findIndex(m => m.discordId === discordId);
    return index + 1;
  }
}

export const storage = new Storage();
