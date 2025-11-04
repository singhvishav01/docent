// src/lib/cost-monitoring.ts
interface UsageMetrics {
  chatCompletions: {
    requests: number;
    promptTokens: number;
    completionTokens: number;
    cost: number;
  };
  embeddings: {
    requests: number;
    tokens: number;
    cost: number;
  };
  dailyTotal: number;
  monthlyTotal: number;
}

class CostMonitor {
  private usage: Map<string, UsageMetrics> = new Map(); // date -> metrics
  
  // Current OpenAI pricing (as of late 2024)
  private readonly PRICING = {
    'gpt-4o-mini': {
      input: 0.00015 / 1000,  // $0.15 per 1M input tokens
      output: 0.0006 / 1000   // $0.60 per 1M output tokens
    },
    'gpt-4-turbo-preview': {
      input: 0.01 / 1000,     // $10 per 1M input tokens
      output: 0.03 / 1000     // $30 per 1M output tokens
    },
    'text-embedding-3-small': {
      input: 0.00002 / 1000   // $0.02 per 1M tokens
    }
  };

  private readonly LIMITS = {
    dailyDollarLimit: 5.00,    // $5 per day
    monthlyDollarLimit: 100.00, // $100 per month
    requestsPerHour: 100        // Rate limit
  };

  private getDateKey(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
  }

  private getUsage(date: Date = new Date()): UsageMetrics {
    const key = this.getDateKey(date);
    if (!this.usage.has(key)) {
      this.usage.set(key, {
        chatCompletions: { requests: 0, promptTokens: 0, completionTokens: 0, cost: 0 },
        embeddings: { requests: 0, tokens: 0, cost: 0 },
        dailyTotal: 0,
        monthlyTotal: 0
      });
    }
    return this.usage.get(key)!;
  }

  logChatCompletion(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): void {
    const usage = this.getUsage();
    const pricing = this.PRICING[model] || this.PRICING['gpt-4o-mini'];
    
    const cost = (promptTokens * pricing.input) + (completionTokens * pricing.output);
    
    usage.chatCompletions.requests++;
    usage.chatCompletions.promptTokens += promptTokens;
    usage.chatCompletions.completionTokens += completionTokens;
    usage.chatCompletions.cost += cost;
    usage.dailyTotal += cost;
    
    console.log(`Chat completion: ${promptTokens}+${completionTokens} tokens, $${cost.toFixed(4)}`);
  }

  logEmbedding(tokens: number): void {
    const usage = this.getUsage();
    const cost = tokens * this.PRICING['text-embedding-3-small'].input;
    
    usage.embeddings.requests++;
    usage.embeddings.tokens += tokens;
    usage.embeddings.cost += cost;
    usage.dailyTotal += cost;
    
    console.log(`Embedding: ${tokens} tokens, $${cost.toFixed(4)}`);
  }

  checkLimits(): { allowed: boolean; reason?: string } {
    const today = this.getUsage();
    
    // Check daily limit
    if (today.dailyTotal >= this.LIMITS.dailyDollarLimit) {
      return { allowed: false, reason: 'Daily spending limit reached' };
    }

    // Check monthly limit (sum last 30 days)
    const monthlyTotal = this.calculateMonthlyUsage();
    if (monthlyTotal >= this.LIMITS.monthlyDollarLimit) {
      return { allowed: false, reason: 'Monthly spending limit reached' };
    }

    return { allowed: true };
  }

  private calculateMonthlyUsage(): number {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    let total = 0;

    for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const usage = this.usage.get(this.getDateKey(d));
      if (usage) {
        total += usage.dailyTotal;
      }
    }

    return total;
  }

  getDailyStats(date: Date = new Date()) {
    return this.getUsage(date);
  }

  getMonthlyStats() {
    return {
      totalCost: this.calculateMonthlyUsage(),
      limit: this.LIMITS.monthlyDollarLimit,
      percentUsed: (this.calculateMonthlyUsage() / this.LIMITS.monthlyDollarLimit) * 100
    };
  }

  // Export usage data for analysis
  exportUsage(): Record<string, UsageMetrics> {
    return Object.fromEntries(this.usage);
  }
}

// Singleton instance
export const costMonitor = new CostMonitor();

// Wrapper function to check limits before API calls
export async function withCostGuard<T>(
  operation: () => Promise<T>,
  fallback?: () => T
): Promise<T> {
  const { allowed, reason } = costMonitor.checkLimits();
  
  if (!allowed) {
    console.warn(`API call blocked: ${reason}`);
    if (fallback) {
      return fallback();
    }
    throw new Error(`Service temporarily unavailable: ${reason}`);
  }
  
  return operation();
}