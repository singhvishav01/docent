// src/lib/rag/index.ts (path structure fixed)
import { RAGRetrieval } from './retrieval';
import path from 'path';

let ragInstance: RAGRetrieval | null = null;

export async function getRAGInstance() {
  if (!ragInstance) {
    // FIXED: Point to the correct data folder structure
    // Your museums.json and individual museum files are in data/museums/
    const dataPath = path.join(process.cwd(), 'data', 'museums');
    console.log(`RAG data path: ${dataPath}`);
    console.log(`Expected structure:`);
    console.log(`  ${dataPath}/museums.json`);
    console.log(`  ${dataPath}/met.json`);
    console.log(`  ${dataPath}/moma.json`);
    console.log(`  ${dataPath}/louvre.json`);
    console.log(`  ${dataPath}/sample-museum.json (fallback)`);
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    ragInstance = new RAGRetrieval(dataPath, process.env.OPENAI_API_KEY);
    await ragInstance.initialize();
  }
  return ragInstance;
}

// Also export the class directly for testing/admin use
export { RAGRetrieval } from './retrieval';