import { type User, type InsertUser, type WorldState, type BTExecution, type NarrativeGeneration } from "@shared/schema";
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
  createUser(user: InsertUser): Promise<User>;
  
  getWorldState(): Promise<WorldState>;
  saveWorldState(state: WorldState): Promise<void>;
  
  saveBTExecution(execution: Omit<BTExecution, 'id' | 'timestamp'>): Promise<BTExecution>;
  
  saveNarrativeGeneration(generation: Omit<NarrativeGeneration, 'id' | 'timestamp'>): Promise<NarrativeGeneration>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private worldState: WorldState;
  private btExecutions: BTExecution[];
  private narrativeGenerations: NarrativeGeneration[];

  constructor() {
    this.users = new Map();
    this.worldState = {};
    this.btExecutions = [];
    this.narrativeGenerations = [];
    this.loadData();
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
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
