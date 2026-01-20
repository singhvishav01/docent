// src/lib/rag/index.ts
import { RAGRetrieval } from './retrieval';
import { DatabaseRetrieval } from './database-retrieval';
import path from 'path';

// FEATURE FLAG: Toggle between JSON and Database
const USE_DATABASE = process.env.USE_DATABASE_RAG === 'true';

let ragInstance: RAGRetrieval | DatabaseRetrieval | null = null;

export async function getRAGInstance(): Promise<RAGRetrieval | DatabaseRetrieval> {
  if (!ragInstance) {
    if (USE_DATABASE) {
      console.log('🔌 Using DATABASE-backed RAG system');
      ragInstance = new DatabaseRetrieval();
      await ragInstance.initialize();
    } else {
      console.log('📁 Using JSON-backed RAG system (legacy)');
      const dataPath = path.join(process.cwd(), 'data', 'museums');
      
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }
      
      ragInstance = new RAGRetrieval(dataPath, process.env.OPENAI_API_KEY);
      await ragInstance.initialize();
    }
  }
  return ragInstance;
}

// Export classes for testing
export { RAGRetrieval } from './retrieval';
export { DatabaseRetrieval } from './database-retrieval';