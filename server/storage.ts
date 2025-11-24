import { type User, type InsertUser, type WorldState, type BTExecution, type NarrativeGeneration, type UserWithCredits, type CreditUsage } from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserWithCredits(id: string): Promise<UserWithCredits | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getWorldState(): Promise<WorldState>;
  saveWorldState(state: WorldState): Promise<void>;
  
  saveBTExecution(execution: Omit<BTExecution, 'id' | 'timestamp'>): Promise<BTExecution>;
  
  saveNarrativeGeneration(generation: Omit<NarrativeGeneration, 'id' | 'timestamp'>): Promise<NarrativeGeneration>;

  deductCredits(userId: string, amount: number): Promise<void>;
  getUserUsage(userId: string): Promise<CreditUsage[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, UserWithCredits>;
  private worldState: WorldState;
  private btExecutions: BTExecution[];
  private narrativeGenerations: NarrativeGeneration[];
  private creditUsage: CreditUsage[];

  constructor() {
    this.users = new Map();
    this.worldState = {};
    this.btExecutions = [];
    this.narrativeGenerations = [];
    this.creditUsage = [];
    this.initializeDefaultUsers();
    this.loadData();
  }

  private initializeDefaultUsers() {
    this.users.set('user-001', {
      id: 'user-001',
      username: 'demo-user',
      password: 'hashed-demo-password',
      credits: 1000,
      apiKey: 'sk_demo_1234567890abcdef',
    });
    this.users.set('admin', {
      id: 'admin',
      username: 'admin',
      password: 'hashed-admin-password',
      credits: 999999,
      apiKey: 'sk_admin_master_key_2025',
    });
  }

  private async loadData() {
    await ensureDataDir();
    
    try {
      const worldStateFile = path.join(DATA_DIR, "worldstate.json");
      const content = await fs.readFile(worldStateFile, "utf-8");
      this.worldState = JSON.parse(content);
    } catch (error) {
      this.worldState = {
        health: 100,
        energy: 50,
        position: { x: 0, y: 0, z: 0 },
        inventory: ["sword", "shield"],
      };
    }
  }

  private async saveWorldStateToFile() {
    await ensureDataDir();
    const worldStateFile = path.join(DATA_DIR, "worldstate.json");
    await fs.writeFile(worldStateFile, JSON.stringify(this.worldState, null, 2));
  }

  async getUser(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    return user ? { id: user.id, username: user.username, password: user.password } : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values())
      .find((user) => user.username === username)
      ?.let((user) => ({ id: user.id, username: user.username, password: user.password }));
  }

  async getUserWithCredits(id: string): Promise<UserWithCredits | undefined> {
    return this.users.get(id);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: UserWithCredits = { 
      ...insertUser, 
      id,
      credits: 1000,
      apiKey: `sk_${id.substring(0, 20)}`,
    };
    this.users.set(id, user);
    return { id: user.id, username: user.username, password: user.password };
  }

  async deductCredits(userId: string, amount: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.credits = Math.max(0, user.credits - amount);
      this.creditUsage.push({
        userId,
        operation: 'bt_execute',
        cost: amount,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getUserUsage(userId: string): Promise<CreditUsage[]> {
    return this.creditUsage.filter((usage) => usage.userId === userId);
  }

  async getWorldState(): Promise<WorldState> {
    return { ...this.worldState };
  }

  async saveWorldState(state: WorldState): Promise<void> {
    this.worldState = { ...state };
    await this.saveWorldStateToFile();
  }

  async saveBTExecution(execution: Omit<BTExecution, 'id' | 'timestamp'>): Promise<BTExecution> {
    const btExecution: BTExecution = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...execution,
    };
    this.btExecutions.push(btExecution);
    return btExecution;
  }

  async saveNarrativeGeneration(generation: Omit<NarrativeGeneration, 'id' | 'timestamp'>): Promise<NarrativeGeneration> {
    const narrativeGen: NarrativeGeneration = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...generation,
    };
    this.narrativeGenerations.push(narrativeGen);
    return narrativeGen;
  }
}

export const storage = new MemStorage();
